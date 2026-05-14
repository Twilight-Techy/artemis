from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Device, ExecutionLog, Function, User
from app.schemas import FunctionCreate, FunctionOut
from app.services.auth_service import get_current_user
from app.services import hardware_service
from app.services.hardware_service import HardwareError
import httpx

router = APIRouter(prefix="/functions", tags=["Functions"])


@router.get("/", response_model=list[FunctionOut])
async def list_functions(
    function_type: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Function).where(Function.owner_id == current_user.id)
    if function_type:
        query = query.where(Function.function_type == function_type)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=FunctionOut, status_code=status.HTTP_201_CREATED)
async def create_function(
    body: FunctionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = body.model_dump()
    # Serialise DeviceActionItem objects to plain dicts for JSON storage
    if data.get("device_actions"):
        data["device_actions"] = [
            da if isinstance(da, dict) else da.model_dump()
            for da in (body.device_actions or [])
        ]
    fn = Function(**data, owner_id=current_user.id)
    db.add(fn)
    await db.commit()
    await db.refresh(fn)
    return fn


@router.put("/{function_id}", response_model=FunctionOut)
async def update_function(
    function_id: str,
    body: FunctionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Function).where(Function.id == function_id, Function.owner_id == current_user.id)
    )
    fn = result.scalar_one_or_none()
    if not fn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Function not found")

    data = body.model_dump()
    if data.get("device_actions"):
        data["device_actions"] = [
            da if isinstance(da, dict) else da.model_dump()
            for da in (body.device_actions or [])
        ]
    for key, value in data.items():
        setattr(fn, key, value)

    await db.commit()
    await db.refresh(fn)
    return fn


@router.post("/{function_id}/execute")
async def execute_function(
    function_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Execute a registered function: fires all device actions then dispatches the HTTP call."""
    result = await db.execute(
        select(Function).where(Function.id == function_id, Function.owner_id == current_user.id)
    )
    fn = result.scalar_one_or_none()
    if not fn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Function not found")

    device_results = []
    overall_status = "success"

    # ── 1. Execute hardware device actions ──────────────────────────────────
    for da in (fn.device_actions or []):
        device_id = da.get("device_id")
        action = da.get("action")
        value = da.get("value")

        dev_result = await db.execute(
            select(Device).where(Device.id == device_id, Device.owner_id == current_user.id)
        )
        device = dev_result.scalar_one_or_none()
        if not device:
            device_results.append({"device_id": device_id, "status": "not_found"})
            overall_status = "partial"
            continue

        # Map action strings → hardware_service action + state update
        hw_action = action  # turn_on → "on", turn_off → "off", etc.
        payload: dict | None = None

        if action == "turn_on":
            hw_action = "on"
        elif action == "turn_off":
            hw_action = "off"
        elif action == "toggle":
            current_on = bool((device.state or {}).get("is_on", False))
            hw_action = "off" if current_on else "on"
        elif action == "set_brightness":
            hw_action = "set_brightness"
            payload = {"brightness": int(value)} if value else {}
        elif action == "set_temperature":
            hw_action = "set"
            payload = {"temperature": float(value)} if value else {}
        elif action == "lock":
            hw_action = "on"
        elif action == "unlock":
            hw_action = "off"

        hw_response = None
        try:
            hw_response = await hardware_service.send_command(device.name, hw_action, payload)
        except HardwareError as e:
            hw_response = {"error": e.message}
            overall_status = "partial"

        # Update local device state
        state_copy = (device.state or {}).copy()
        if hw_action in ("on", "activate"):
            state_copy["is_on"] = True
        elif hw_action in ("off", "deactivate"):
            state_copy["is_on"] = False
        elif payload:
            state_copy.update(payload)
        device.state = state_copy

        device_results.append({
            "device_id": device_id,
            "device_name": device.name,
            "action": action,
            "status": "success" if hw_response and "error" not in hw_response else "failed",
        })

    # ── 2. Dispatch HTTP call for software / hybrid functions ────────────────
    http_response = None
    if fn.function_type in ("software", "hybrid") and fn.url:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                http_response = await client.request(
                    method=fn.method or "GET",
                    url=fn.url,
                    headers=fn.headers or {},
                    json=fn.body_template or None,
                )
            http_response = {"status_code": http_response.status_code, "body": http_response.text[:500]}
        except Exception as e:
            http_response = {"error": str(e)}
            overall_status = "partial"

    # ── 3. Log the function execution ────────────────────────────────────────
    log = ExecutionLog(
        action_type="function_call",
        target_id=fn.id,
        target_name=fn.name,
        status=overall_status,
        request_payload={"device_actions": fn.device_actions, "url": fn.url},
        response_payload={"device_results": device_results, "http_response": http_response},
        triggered_by="user",
        user_id=current_user.id,
    )
    db.add(log)
    await db.commit()

    return {
        "status": overall_status,
        "function": fn.name,
        "device_results": device_results,
        "http_response": http_response,
    }


@router.delete("/{function_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_function(
    function_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Function).where(Function.id == function_id, Function.owner_id == current_user.id)
    )
    fn = result.scalar_one_or_none()
    if not fn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Function not found")
    await db.delete(fn)
    await db.commit()
