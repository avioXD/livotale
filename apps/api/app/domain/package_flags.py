from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True, slots=True)
class PackageWorkflowFlags:
    pathology: bool
    consultation: bool


class PackageFlagSource(Protocol):
    pathology_included: bool
    consultation_included: bool


def get_flags_from_package(pkg: PackageFlagSource) -> PackageWorkflowFlags:
    """Derive workflow flags from a liver-care package record."""
    return PackageWorkflowFlags(
        pathology=bool(pkg.pathology_included),
        consultation=bool(pkg.consultation_included),
    )
