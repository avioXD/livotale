# API Integration Matrix (Phase E)

**Status**: In progress — **recovery track active** (see [../recovery/00-MASTER-PLAN.md](../recovery/00-MASTER-PLAN.md))  
**Plan**: End-to-end wire livotale-ui → livotale-apis (FastAPI)

### Known blockers (2026-06-20)

| Area | Blocker | Recovery spec |
|------|---------|---------------|
| Notifications inbox | Migration 038 | [F03](../recovery/features/F03-notifications-inbox.md) |
| Admin dashboard / enquiries | Migration 034 | [F02](../recovery/features/F02-admin-dashboard-ops.md) |
| Staff user lists | Migration 036 | [F04](../recovery/features/F04-staff-hr-onboarding.md) |
| Auth sessions | Response schema | [F01](../recovery/features/F01-auth-profile-settings.md) |
| Appointments UI | No FastAPI routes | [F05](../recovery/features/F05-legacy-appointments.md) |
| Admin audit page | Path mismatch | [F02](../recovery/features/F02-admin-dashboard-ops.md) |
| Error visibility | Toasts mostly absent | [03-ERROR-TOAST-SPEC.md](../recovery/03-ERROR-TOAST-SPEC.md) |

| Journey | UI entry | Service | API route | WS channel | Mock |
|---------|----------|---------|-----------|------------|------|
| Public browse packages | `/packages` | `PackageService` | `GET /public/packages` | — | Yes |
| Public enquire | `/enquire` | `EnquiryService.createPublic` | `POST /public/enquiries` | — | Yes |
| Staff login | `/org/login` | `AuthService` | `POST /auth/login` | — | Yes |
| Ops enquiries CRM | ops hub | `EnquiryService` | `/admin/enquiries/*` | `ws:notifications:support` | Yes |
| Create order | ops hub | `OrderService` | `/admin/orders/*` | `ws:operations:orders:{id}` | Yes |
| Collect payment | order detail | `OrderService` | `/admin/orders/{id}/payments` | same | Dummy |
| Scan slot cards | patient / ops | `SlotService` | `GET /public/slots/scan`, `GET /admin/orders/{id}/scan-slots` | — | Yes |
| Patient scan preference | patient order | `PatientPortalService` | `POST /patient-portal/orders/{id}/scan-date` | same | Yes |
| Confirm scan + tech | order scan step | `OrderService` | `POST /admin/orders/{id}/confirm-scan-schedule` | same | Yes |
| Available tech for slot | order scan step | `OrderService` | `GET /admin/technicians/available-for-slot` | — | Yes |
| Reassign technician | order scan step | `OrderService` | `POST /admin/orders/{id}/assign-technician` | same | Yes |
| Technician field visit | `/technician/orders/:id` | `TechnicianOrderService` | `/technician/orders/*` | `ws:technician:orders:{id}` | Yes |
| Patient / FibroScan intake read | tech + ops order detail | `TechnicianOrderService.getPatientIntake` | `GET /technician/orders/{id}/patient-intake` | same | Yes |
| FibroScan intake submit | tech order detail step 2 | `TechnicianOrderService.submitFibroScanIntake` | `POST /technician/orders/{id}/fibroscan-intake` | same | Yes |
| FibroScan intake ops verify | admin scan step | `TechnicianOrderService.operatorVerifyFibroScanIntake` | `PATCH /admin/orders/{id}/fibroscan-intake/verify` | same | Yes |
| FibroScan capture | tech order detail | device registry | `/technician/orders/{id}/fibrosis-scan` | same | Dummy |
| Sample dispatch | ops order detail only | `PathologyService` | `/admin/orders/{id}/sample-dispatch` | same | Yes |
| Lab PDF upload | ops pathology | `PathologyService` | `/admin/pathology/*` | same | Yes |
| AI extraction | ops AI queue | `AIExtractionService` | `/admin/orders/{id}/ai-extraction` | same | Dummy |
| Final report | ops report | `FinalReportService` | `/admin/orders/{id}/final-report` | same | Dummy |
| Doctor consultation | `/doctor/consultations` | `ConsultationService` | `/doctor/consultations/*` | notifications | Yes |
| Doctor my patients | `/doctor/patients` | `DoctorConsultationService` | `GET /doctor/consultations/patients` | — | No |
| Staff patient registry | `/patients` | `PatientsService` | `/patients/*` | — | No |

**Patient registry RBAC (2026-06-20)**: `PatientsService.list/get*` responses are server-scoped by role — Super Admin sees all; Operations/City Manager see patients in assigned/promoted service zone pincodes (default address); Doctor sees assigned or order-linked patients; multi-role accounts get the union. No query params for zone filter in v1.
| Prescription | consult detail | `PrescriptionOrderService` | `/doctor/orders/{id}/prescription` | same | Yes |
| Patient OTP login | `/patient/login` | `PatientPortalService` | `/patient-portal/otp/*` | `ws:patient-portal:{phone}` | Demo |
| Patient pay/report | `/patient/orders/:id` | `PatientPortalService` | `/patient-portal/orders/*` | same | Dummy |
| Patient order timeline | patient order | `PatientPortalService` | `GET /patient-portal/orders/{id}/timeline` | same | Yes |
| Notifications bell | all layouts | `InboxNotificationService` | `/notifications/*` | WS replaces poll | Yes |

**Out of scope v1**: legacy Fastify-only domains (pharmacy, care chat, patient journey wizard).
