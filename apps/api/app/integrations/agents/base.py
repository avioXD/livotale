from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class ExtractionContext:
    job_id: str
    order_id: str
    source_type: str
    source_file_id: str | None = None
    raw_text: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)


class ExtractionAgent(ABC):
    name: str

    @abstractmethod
    async def run(self, context: ExtractionContext) -> ExtractionContext:
        raise NotImplementedError
