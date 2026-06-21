from __future__ import annotations

import uuid
from typing import Any

import boto3
from aiobotocore.session import get_session
from botocore.config import Config

from app.integrations.s3_config import S3RuntimeConfig, resolve_s3_config


class S3Service:
    def __init__(self, config: S3RuntimeConfig | None = None):
        self.config = config or S3RuntimeConfig.from_env()
        self._session = get_session()

    @classmethod
    async def from_db(cls, db) -> S3Service:
        return cls(await resolve_s3_config(db))

    def _client_kwargs(self) -> dict[str, Any]:
        kwargs: dict[str, Any] = {
            "service_name": "s3",
            "region_name": self.config.region,
            "aws_access_key_id": self.config.access_key_id,
            "aws_secret_access_key": self.config.secret_access_key,
            "config": Config(signature_version="s3v4"),
        }
        if self.config.endpoint:
            kwargs["endpoint_url"] = self.config.endpoint
        return kwargs

    def rewrite_url_for_browser(self, url: str | None) -> str | None:
        """Replace internal Docker S3 host with a browser-reachable endpoint."""
        if not url or not self.config.endpoint:
            return url
        public_base = (self.config.public_endpoint or self.config.endpoint).rstrip("/")
        internal_base = self.config.endpoint.rstrip("/")
        if public_base != internal_base and url.startswith(internal_base):
            return public_base + url[len(internal_base) :]
        return url

    async def generate_presigned_upload(self, key: str, content_type: str, *, expires_in: int = 3600) -> str:
        async with self._session.create_client(**self._client_kwargs()) as client:
            upload_url = await client.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": self.config.bucket,
                    "Key": key,
                    "ContentType": content_type,
                },
                ExpiresIn=expires_in,
            )
        return self.rewrite_url_for_browser(upload_url) or upload_url

    async def upload_file(self, file_bytes: bytes, key: str, content_type: str) -> None:
        async with self._session.create_client(**self._client_kwargs()) as client:
            await client.put_object(
                Bucket=self.config.bucket,
                Key=key,
                Body=file_bytes,
                ContentType=content_type,
            )

    def get_public_url(self, key: str) -> str:
        if self.config.endpoint:
            base = (self.config.public_endpoint or self.config.endpoint).rstrip("/")
            return f"{base}/{self.config.bucket}/{key}"
        return f"https://{self.config.bucket}.s3.{self.config.region}.amazonaws.com/{key}"

    def head_object_sync(self, key: str) -> dict[str, Any] | None:
        client = boto3.client(**self._client_kwargs())
        try:
            return client.head_object(Bucket=self.config.bucket, Key=key)
        except client.exceptions.ClientError:
            return None

    def test_connection(self) -> dict[str, Any]:
        client = boto3.client(**self._client_kwargs())
        try:
            client.head_bucket(Bucket=self.config.bucket)
            probe_key = f"{self.config.key_prefix.strip('/')}/.livotale-probe/{uuid.uuid4()}"
            client.put_object(
                Bucket=self.config.bucket,
                Key=probe_key,
                Body=b"probe",
                ContentType="application/octet-stream",
            )
            client.delete_object(Bucket=self.config.bucket, Key=probe_key)
            return {
                "ok": True,
                "bucket": self.config.bucket,
                "region": self.config.region,
                "endpoint": self.config.endpoint,
            }
        except Exception as exc:
            return {
                "ok": False,
                "bucket": self.config.bucket,
                "region": self.config.region,
                "endpoint": self.config.endpoint,
                "error": str(exc),
            }
