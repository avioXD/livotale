from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(
        self,
        message: str,
        status_code: int = 400,
        error: str = "app_error",
        extra: dict | None = None,
    ):
        self.message = message
        self.status_code = status_code
        self.error = error
        self.extra = extra or {}
        super().__init__(message)


async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    content: dict = {"error": exc.error, "message": exc.message, "statusCode": exc.status_code}
    if exc.extra:
        content.update(exc.extra)
    return JSONResponse(status_code=exc.status_code, content=content)


async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict):
        message = detail.get("message", str(detail))
        error = detail.get("error", "http_error")
    else:
        message = str(detail)
        error = "http_error"
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": error, "message": message, "statusCode": exc.status_code},
    )
