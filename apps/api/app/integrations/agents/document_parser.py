from __future__ import annotations

from app.integrations.agents.base import ExtractionAgent, ExtractionContext

CANNED_REPORT_TEXT = """
Liver Function Test Report
ALT: 42 U/L (Reference: 7-56)
AST: 38 U/L (Reference: 10-40)
Bilirubin Total: 1.1 mg/dL (Reference: 0.1-1.2)
Albumin: 4.2 g/dL (Reference: 3.5-5.5)
Platelet Count: 210 10^3/uL (Reference: 150-450)
HbA1c: 5.8 % (Reference: 4.0-5.6)
""".strip()


class DocumentParserAgent(ExtractionAgent):
    name = "document_parser"

    async def run(self, context: ExtractionContext) -> ExtractionContext:
        context.raw_text = CANNED_REPORT_TEXT
        context.metadata["parser"] = self.name
        context.metadata["pages"] = 2
        return context
