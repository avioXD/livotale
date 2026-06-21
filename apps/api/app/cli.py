def dev() -> None:
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=4000, reload=True)


def appointment_reminders() -> None:
    import asyncio

    from app.core.database import SessionLocal
    from app.services.appointment_notification_service import AppointmentNotificationService

    async def _run() -> None:
        async with SessionLocal() as session:
            service = AppointmentNotificationService(session)
            dispatched = await service.dispatch_due_reminders()
            await session.commit()
            print({"dispatchedCount": len(dispatched)})

    asyncio.run(_run())
