"""Notifications inbox and WebSocket channels."""

from fastapi import APIRouter

from app.api.v1.routers import notifications, websocket

router = APIRouter(tags=["realtime"])
router.include_router(notifications.router)
router.include_router(websocket.router)
