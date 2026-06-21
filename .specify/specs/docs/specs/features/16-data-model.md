# Spec: Data Model & Migrations

**Schemas**: `identity`, `clinical`, `operations`, `commerce`, `storage`, `audit`, `integrations`

## Core entities

| Entity | Table (proposed) | Key relations |
|--------|------------------|---------------|
| Users | `identity.users` | existing |
| Roles/Permissions | `identity.roles` | existing |
| Patients | `clinical.patients` | extend |
| Enquiries | `operations.enquiries` | → patient |
| Packages | `commerce.packages` | seed 3 |
| Orders | `commerce.service_orders` | → patient, package, enquiry |
| Payments | `commerce.order_payments` | → order |
| Payment links | `commerce.payment_links` | → order |
| Technician assignments | `operations.order_technician_assignments` | → order |
| Fibrosis scan | `clinical.fibroscan_results` | add `order_id` |
| Partner labs | `operations.lab_partners` | extend |
| Lab report uploads | `clinical.lab_report_uploads` | → order, lab |
| AI jobs | `integrations.ai_extraction_jobs` | → order |
| Extracted fields | `integrations.extracted_report_fields` | → job |
| Final reports | `clinical.final_reports` | → order |
| Doctors | `clinical.doctors` | existing |
| Consultations | `clinical.consultations` | → order, doctor |
| Prescriptions | `clinical.prescriptions` | extend → order |
| Prescription medicines | `clinical.prescription_medicines` | → prescription |
| Notifications | `audit.notification_log` | polymorphic |
| Audit log | `audit.activity_log` | polymorphic |
| Files | `storage.files` | existing |
| Templates | `commerce.report_templates` | letterhead |

## Standard columns

All major tables: `id`, `created_by`, `created_at`, `updated_by`, `updated_at`, `status`, `deleted_at` (soft delete where applicable).

## Migration plan

| # | File | Content |
|---|------|---------|
| 032 | `032_packages_catalog.sql` | packages + seed |
| 033 | `033_enquiries.sql` | enquiries |
| 034 | `034_service_orders.sql` | orders + status enum |
| 035 | `035_order_payments.sql` | payments, links |
| 036 | `036_fibroscan_order_link.sql` | order_id on fibroscan |
| 037 | `037_lab_reports_ai.sql` | uploads, AI jobs, fields |
| 038 | `038_final_reports_templates.sql` | reports, templates |
| 039 | `039_consultations_order_link.sql` | consultations → order |
| 040 | `040_notifications_audit_extend.sql` | logs |
| 041 | `041_lab_partner_extend.sql` | lab profile fields |

## TypeScript types (UI)

```
src/types/
  enquiry.ts
  package.ts
  serviceOrder.ts
  payment.ts
  aiExtraction.ts
  finalReport.ts
  consultation.ts  (extend)
```
