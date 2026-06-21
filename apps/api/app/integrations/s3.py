from __future__ import annotations

from typing import Any

import boto3
from aiobotocore.session import get_session
from botocore.config import Config

from app.core.config import Settings, get_settings


class S3Service:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()
        self._session = get_session()

    def _client_kwargs(self) -> dict[str, Any]:
        kwargs: dict[str, Any] = {
            "service_name": "s3",
            "region_name": self.settings.s3_region,
            "aws_access_key_id": self.settings.aws_access_key_id,
            "aws_secret_access_key": self.settings.aws_secret_access_key,
            "config": Config(signature_version="s3v4"),
        }
        if self.settings.s3_endpoint:
            kwargs["endpoint_url"] = self.settings.s3_endpoint
        return kwargs

    async def generate_presigned_upload(self, key: str, content_type: str, *, expires_in: int = 3600) -> str:
        async with self._session.create_client(**self._client_kwargs()) as client:
            return await client.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": self.settings.s3_bucket,
                    "Key": key,
                    "ContentType": content_type,
                },
                ExpiresIn=expires_in,
            )

    async def upload_file(self, file_bytes: bytes, key: str, content_type: str) -> None:
        async with self._session.create_client(**self._client_kwargs()) as client:
            await client.put_object(
                Bucket=self.settings.s3_bucket,
                Key=key,
                Body=file_bytes,
                ContentType=content_type,
            )

    def get_public_url(self, key: str) -> str:
        if self.settings.s3_endpoint:
            base = self.settings.s3_endpoint.rstrip("/")
            return f"{base}/{self.settings.s3_bucket}/{key}"
        return f"https://{self.settings.s3_bucket}.s3.{self.settings.s3_region}.amazonaws.com/{key}"

    def head_object_sync(self, key: str) -> dict[str, Any] | None:
        client = boto3.client(**self._client_kwargs())
        try:
            return client.head_object(Bucket=self.settings.s3_bucket, Key=key)
        except client.exceptions.ClientError:
            return None
