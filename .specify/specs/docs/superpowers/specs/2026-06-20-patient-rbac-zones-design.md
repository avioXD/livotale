# Patient Registry — Role-Based Zone Scoping

**Date:** 2026-06-20  
**Status:** Approved for implementation  
**Scope:** Staff patient registry (`GET/PATCH /api/v1/patients/*`)

---

## Problem

Patient list and detail endpoints do not enforce geographic or assignment scope:

- Operations (`support` JWT role) sees **all** patients
- City Manager bypasses filters via local `ADMIN_ROLES`
- Zone infrastructure (`operations.service_zones`, `staff_hr_profiles.meta`) exists but is unused on reads

## Goals

| Role | JWT code | List + detail scope |
|------|----------|---------------------|
| Super Admin | `admin` | All patients |
| Operations | `support` | Patients in assigned zone pincodes |
| City Manager | `city_manager` | Patients in promoted zone pincodes (`cityManagerServiceZoneIds`) |
| Doctor | `doctor` | Assigned patients OR patients with order where `doctor_id` matches |
| Multi-role | union | Broadest combined scope (OR of all applicable predicates) |

**Edit demographics/history:** `admin`, `support`, `city_manager` only (not doctor).

## Zone matching

Primary: default address `clinical.patient_addresses.pincode` ∈ scope pincodes (`is_default = true`).

Patients without a default address pincode are **out of zone scope** (not visible to ops/CM unless doctor-linked).

## Multi-role union

When a user has multiple roles (e.g. `operations@livotale.com` = support + city_manager + doctor):

- `admin` → unrestricted (wins over all)
- Otherwise SQL `WHERE` uses `(ops_pincode_match OR cm_pincode_match OR doctor_match)`

## Role scenario matrix

| # | Roles | List | Detail | Edit |
|---|-------|------|--------|------|
| 1 | admin | All | All | Yes |
| 2 | support | Assigned zone pincodes | Same | Yes |
| 3 | city_manager | Promoted zone pincodes | Same | Yes |
| 4 | support + city_manager | Union of assigned + promoted pincodes | Union | Yes |
| 5 | doctor | Assigned + order-linked | Same | No |
| 6 | doctor + support | Zone ∪ doctor patients | Union | Yes |
| 7 | technician / dietician / health_coach | Empty / 403 | 403 | No |

## API contract

No new endpoints. Behavior change on existing routes:

- `GET /patients` — auto-scoped list
- `GET /patients/{id}`, `/history`, `/clinical` — scoped detail
- `PATCH /patients/{id}/demographics`, `/history/{section}` — edit roles + scope check

## Implementation

- New `app/services/ops_scope_service.py` — `PatientAccessScope`, `resolve_patient_access_scope()`
- `patient_registry_service.py` — apply union SQL predicates; align role constants with `domain/rbac.py`

## Out of scope (v1)

- Orders, enquiries, dashboard zone scoping
- Client-side zone filter dropdown
- URL `:city` param enforcement

## Test plan

- `test_patients_rbac_zones.py` — admin all, ops in/out zone, CM promoted zones, doctor assigned, multi-role union, empty zone list
- Extend `test_patients_registry.py` if needed
