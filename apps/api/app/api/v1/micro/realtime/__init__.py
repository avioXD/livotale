"""Notifications inbox (REST). WebSocket channels are mounted at app root in main.py."""

from fastapi import APIRouter

from app.api.v1.routers import notifications

router = APIRouter(tags=["realtime"])
router.include_router(notifications.router)
