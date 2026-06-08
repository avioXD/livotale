# Alignment Map — Existing Code vs 012 Platform

## UI (`livotale-ui`)

| Existing | Maps to 012 module | Action |
|----------|-------------------|--------|
| `AdminOperationsHubPage` (tabs: overview, appointments, samples, orders) | Operations hub | **Extend** — add Enquiries, Orders (workflow), AI review tabs |
| `AdminBookAppointmentPage` | Order creation | **Realign** — create Order + Patient, not just appointment |
| `PatientsPage` / `PatientDetailPage` | Patient profile + timeline | **Extend** — enquiry source, medical history fields, order timeline |
| `AdminStaffHubPage` (technicians, doctors, lab-partners) | Staff + partner labs | **Extend** — full lab profile (GST, contract, charges) |
| `TechnicianSchedulePage` / `TechnicianVisitDetailPage` | Technician assigned orders | **Realign** — order-centric, scan status steps |
| `FibroScanClinicalPanel` | Fibrosis scan capture | **Extend** — full LSM/CAP/F-stage params, device dummy fetch |
| `DoctorAppointmentsPage` | Doctor consultations | **Realign** — assigned consultation orders (pkg 3) |
| `PrescriptionsPage` | Prescription module | **Extend** — structured medicines, letterhead, publish lock |
| `ReportsPage` | Clinical reports | **Realign** — final published reports only for patient |
| `PatientJourneyPage` | Patient onboarding | **Partially replace** — patient portal dashboard |
| `LoginPage` (4 staff mock logins) | Staff auth | **Keep** staff; **Add** patient OTP login route |
| `navigation.ts` / `010` RBAC | Role sidebars | **Update** per `spec-rbac-screens.md` |
| `services/mock/*.mock.ts` | Mock data layer | **Extend** for enquiries, orders, packages |
| `services/admin/AdminOperationsService` | Orders & payments | **Extend** — link to Order entity + DummyPaymentService |
| `services/sampleCollection/*` | Legacy home-visit samples | **Deprecated for pathology** — schedule tab only; pathology via `PathologyService` |
| No public website routes | Packages + enquiry form | **New** — `/packages`, `/enquire` |

## API (`livotale_app/api`)

| Existing | Maps to 012 | Action |
|----------|-------------|--------|
| `patientManagementService` | Patients | Extend profile fields |
| `adminOperationsService` | Ops overview | Extend KPIs |
| `sampleCollectionService` | Samples/lab | Link to orders |
| `reportService` | Reports | Split: fibrosis / pathology / final |
| `technicianService` / `technicianAppointmentService` | Technician | Order assignment |
| `doctorAppointmentService` | Doctor consult | Consultation on order |
| `appointmentSchedulingService` | Scheduling | Secondary to order workflow |
| No enquiry module | Enquiries | **New** migration + service |
| No package catalog API | Packages | **New** |
| No order workflow engine | Orders | **New** — status machine |
| No dummy service layer | External APIs | **New** `src/services/external/` interfaces |

## Database

| Existing tables (approx.) | 012 entity | Action |
|---------------------------|------------|--------|
| `clinical.patients` | Patients | Extend columns |
| `clinical.fibroscan_results` | Fibrosis scan records | Link `order_id` |
| `operations.appointments` | Partial order | **New** `commerce.orders` or `operations.service_orders` |
| `operations.lab_*` | Pathology | Link to order |
| Staff tables | Technicians, doctors | Keep |
| `operations.lab_partners` | Partner labs | Extend profile fields |
| — | Enquiries, packages, payments, AI jobs, audit | **New migrations** |

## Dummy services (new)

| Service | Existing equivalent | Action |
|---------|---------------------|--------|
| `DummyPaymentService` | `demoCollectPayment` in adminOperations | **Extract** to interface |
| `DummyWhatsAppService` | None | **New** |
| `DummyFibrosisScanDeviceService` | Manual fibroscan entry | **New** |
| `DummyAIExtractionService` | None | **New** |
| `DummyNotificationService` | appointment notifications partial | **New** |
| `DummyPDFGenerationService` | prescription PDF partial | **New** |

## Do not rebuild (reuse)

- Auth JWT + sessions (`003`)
- Staff onboarding (`031` migration)
- Technician schedule patterns (legacy `008` sample collection — not partner lab pathology)
- Mock mode infrastructure (`011`)
- Liver Fibrosis Scan terminology (not FibroScan) in UI copy
- Operations hub tab pattern (`009`)

## Deprecate / simplify

- Dietician, health coach, pharmacy, lab-partner **login** UI (removed)
- In-house lab pages (`/lab-samples`, `LabSamplesPage`) — removed; external partner lab only
- Appointment-first ops flow → **order-first** flow
- Separate `/appointments` for ops → merged into order/enquiry queues
- Patient staff-style login in mock mode → **phone OTP only** for patients
