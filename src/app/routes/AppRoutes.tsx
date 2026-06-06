import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminShell } from '@/app/layouts/AdminShell';
import { ProtectedRoute, PublicRoute } from '@/app/routes/ProtectedRoute';
import {
  AppointmentsPage,
  CoachingPage,
  DashboardPage,
  DeliveryPage,
  FibroScanPage,
  LabSamplesPage,
  NotFoundPage,
  PatientsPage,
  PrescriptionsPage,
  ReportsPage,
  SettingsPage,
  TreatmentPlansPage,
} from '@/app/pages';
import { LoginPage, RegisterPage, ResetPasswordPage } from '@/app/pages/auth/AuthPages';
import { AppRole } from '@/types';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route
            element={
              <ProtectedRoute
                allowedRoles={[AppRole.DOCTOR, AppRole.ADMIN, AppRole.TECHNICIAN]}
              />
            }
          >
            <Route path="/patients" element={<PatientsPage />} />
          </Route>

          <Route path="/appointments" element={<AppointmentsPage />} />

          <Route
            element={
              <ProtectedRoute allowedRoles={[AppRole.TECHNICIAN, AppRole.DOCTOR, AppRole.ADMIN]} />
            }
          >
            <Route path="/fibroscan" element={<FibroScanPage />} />
            <Route path="/lab-samples" element={<LabSamplesPage />} />
          </Route>

          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/treatment-plans" element={<TreatmentPlansPage />} />
          <Route path="/prescriptions" element={<PrescriptionsPage />} />
          <Route path="/delivery" element={<DeliveryPage />} />
          <Route path="/coaching" element={<CoachingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
