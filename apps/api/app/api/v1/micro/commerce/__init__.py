"""Public commerce: enquiries, lead capture."""

from fastapi import APIRouter

from app.api.v1.routers import public

router = APIRouter(tags=["commerce"])
router.include_router(public.router)
