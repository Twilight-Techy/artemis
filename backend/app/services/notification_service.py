"""
Notification Service — sends push notifications via Expo's Push API.
Docs: https://docs.expo.dev/push-notifications/sending-notifications/
"""
import httpx
import logging

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def send_push_notification(
    token: str,
    title: str,
    body: str,
    data: dict | None = None,
) -> None:
    """
    Fire-and-forget push via Expo's push service.
    Silently logs failures — a push failure must never crash the main request.
    """
    if not token or not token.startswith("ExponentPushToken"):
        logger.warning("send_push_notification: invalid or missing token, skipping.")
        return

    payload = {
        "to": token,
        "title": title,
        "body": body,
        "sound": "default",
        "priority": "high",
        "data": data or {},
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(settings.expo_push_url, json=payload)
            resp.raise_for_status()
            result = resp.json()
            # Expo wraps the response in a `data` array
            for item in result.get("data", []):
                if item.get("status") == "error":
                    logger.error("Expo push error: %s", item.get("message"))
    except Exception as exc:
        logger.error("send_push_notification failed: %s", exc)
