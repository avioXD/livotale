# Spec Split: Technician Profile & Auto-Assignment

**Parent**: [spec.md](./spec.md)

## Technician Profile (Admin-managed)

Fields stored on `operations.technicians` + related tables:

- Identity: employee_code, user link, mobile, email, gender, photo
- Operations: clinic_id, city_id, service_zone, active status
- Skills: `technician_type` enum, collection_skill_types[], max_appointments_per_day
- Schedule: availability rules (reuse `operations.doctor_availability` pattern → `technician_availability`)
- Service area: `technician_service_pincodes` (many-to-many pincode list)
- Vehicle, qualification, emergency contact — JSON metadata column v1

## Technician Types

| Type | Assign when |
|------|-------------|
| `home_collector` | visit_mode = home, blood/sample home collection |
| `hospital_collector` | collection_location = hospital |
| `center_collector` | visit_mode = clinic, center collection |
| `fibroscan_technician` | appointment type FibroScan |
| `multi_role` | Admin-enabled; matches any if skill flag set |

## Auto-Assignment Algorithm

On appointment book (patient or admin):

1. Filter technicians: active, verified, type match, pincode in service list
2. Filter by working hours + holidays + existing appointments
3. Home visits: block **45 minutes** (+ configurable travel buffer, default 15 min)
4. Score: lowest daily workload → nearest city/zone match
5. Assign `technician_id`; transition appointment → `technician_assigned`
6. If none: status `pending_technician_assignment`; notify admin

## Admin Manual Assignment

`POST /admin/sample-collections/:id/assign-technician` with override reason logged.

## Configuration (Admin)

`operations.sample_collection_config` singleton or per-city:

- `collection_duration_minutes` (default 45)
- `travel_buffer_minutes` (default 15)
- `max_daily_appointments_per_technician` (default 12)
- `service_radius_km` (optional v1)
