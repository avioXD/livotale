from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from jose import JWTError
from redis.asyncio.client import PubSub

from app.core.config import get_settings
from app.core.database import get_db
from app.core.exceptions import AppError
from app.core.redis import get_redis
from app.core.security import verify_access_token
from app.utils.phone import normalize_phone

router = APIRouter(tags=["websocket"])


class WebSocketHub:
    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)
        self._pubsub: PubSub | None = None
        self._listener_task: asyncio.Task[None] | None = None
        self._pattern = "ws:*"

    async def connect(self, channel: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[channel].add(websocket)

    def disconnect(self, channel: str, websocket: WebSocket) -> None:
        self._connections[channel].discard(websocket)
        if not self._connections[channel]:
            del self._connections[channel]

    async def start(self) -> None:
        if self._listener_task is not None:
            return
        redis = get_redis()
        self._pubsub = redis.pubsub()
        await self._pubsub.psubscribe(self._pattern)
        self._listener_task = asyncio.create_task(self._listen())

    async def shutdown(self) -> None:
        if self._listener_task:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass
            self._listener_task = None
        if self._pubsub is not None:
            await self._pubsub.punsubscribe(self._pattern)
            await self._pubsub.aclose()
            self._pubsub = None

    async def _listen(self) -> None:
        assert self._pubsub is not None
        while True:
            message = await self._pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if not message or message.get("type") not in ("message", "pmessage"):
                await asyncio.sleep(0.05)
                continue
            channel = message.get("channel") or message.get("pattern")
            if isinstance(channel, bytes):
                channel = channel.decode()
            data = message.get("data")
            if isinstance(data, bytes):
                data = data.decode()
            try:
                payload: Any = json.loads(data) if isinstance(data, str) else data
            except json.JSONDecodeError:
                payload = {"message": data}
            await self._broadcast(str(channel), payload)

    async def _broadcast(self, channel: str, payload: Any) -> None:
        dead: list[WebSocket] = []
        for websocket in list(self._connections.get(channel, [])):
            try:
                await websocket.send_json(payload)
            except Exception:
                dead.append(websocket)
        for websocket in dead:
            self.disconnect(channel, websocket)

    async def publish(self, channel: str, payload: Any) -> None:
        redis = get_redis()
        await redis.publish(channel, json.dumps(payload, default=str))


ws_hub = WebSocketHub()


def _verify_ws_token(token: str | None) -> dict[str, Any]:
    if not token:
        raise AppError("Missing WebSocket token", status_code=401, error="unauthorized")
    try:
        return verify_access_token(token)
    except JWTError as exc:
        raise AppError("Invalid WebSocket token", status_code=401, error="unauthorized") from exc


async def _reject_ws(websocket: WebSocket, reason: str = "Unauthorized") -> None:
    await websocket.close(code=1008, reason=reason)


async def _verify_patient_ws(websocket: WebSocket, _phone: str, token: str | None) -> bool:
    if token:
        try:
            _verify_ws_token(token)
            return True
        except AppError:
            await _reject_ws(websocket)
            return False
    if get_settings().effective_otp_mode == "demo":
        return True
    await _reject_ws(websocket, "Missing token")
    return False


async def _ws_loop(channel: str, websocket: WebSocket) -> None:
    await ws_hub.connect(channel, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_hub.disconnect(channel, websocket)


async def _ws_loop_multi(channels: list[str], websocket: WebSocket) -> None:
    await websocket.accept()
    for channel in channels:
        ws_hub._connections[channel].add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        for channel in channels:
            ws_hub.disconnect(channel, websocket)


@router.websocket("/ws/v1/notifications")
async def ws_notifications(
    websocket: WebSocket,
    role: str = "support",
    token: str | None = Query(default=None),
) -> None:
    try:
        payload = _verify_ws_token(token)
    except AppError:
        await _reject_ws(websocket)
        return
    channels = [f"ws:notifications:{role.lower()}"]
    user_id = payload.get("sub")
    if user_id:
        channels.append(f"ws:notifications:user:{user_id}")
    await _ws_loop_multi(channels, websocket)


@router.websocket("/ws/v1/patient-portal")
async def ws_patient_portal(
    websocket: WebSocket,
    phone: str,
    token: str | None = Query(default=None),
) -> None:
    if not await _verify_patient_ws(websocket, phone, token):
        return
    channel = f"ws:patient-portal:{normalize_phone(phone)}"
    await _ws_loop(channel, websocket)


@router.websocket("/ws/v1/operations/orders/{order_id}")
async def ws_operations_order(
    websocket: WebSocket,
    order_id: UUID,
    token: str | None = Query(default=None),
) -> None:
    try:
        _verify_ws_token(token)
    except AppError:
        await _reject_ws(websocket)
        return
    channel = f"ws:operations:orders:{order_id}"
    await _ws_loop(channel, websocket)


@router.websocket("/ws/v1/technician/orders/{order_id}")
async def ws_technician_order(
    websocket: WebSocket,
    order_id: UUID,
    token: str | None = Query(default=None),
) -> None:
    try:
        _verify_ws_token(token)
    except AppError:
        await _reject_ws(websocket)
        return
    channel = f"ws:technician:orders:{order_id}"
    await _ws_loop(channel, websocket)
