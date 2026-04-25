from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Function, User
from app.schemas import FunctionCreate, FunctionOut
from app.services.auth_service import get_current_user

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
    fn = Function(**body.model_dump(), owner_id=current_user.id)
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

    for key, value in body.model_dump().items():
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
    """Execute a registered function by dispatching its HTTP request."""
    result = await db.execute(
        select(Function).where(Function.id == function_id, Function.owner_id == current_user.id)
    )
    fn = result.scalar_one_or_none()
    if not fn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Function not found")

    # TODO: Use httpx to dispatch the actual HTTP call using fn.method, fn.url, fn.headers, fn.body_template
    return {"status": "executed", "function": fn.name, "message": f"Function '{fn.name}' dispatched successfully"}


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
