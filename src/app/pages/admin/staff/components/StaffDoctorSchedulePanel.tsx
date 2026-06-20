import { useCallback, useEffect, useState } from 'react';
import { AvailabilityEditor } from '@/app/pages/doctor/appointments/components/AvailabilityEditor';
import { HolidayForm } from '@/app/pages/doctor/appointments/components/HolidayForm';
import { canManageDoctorSchedule } from '@/app/config/productRoles';
import { adminAppointmentsService } from '@/services/appointments';
import { useUserRole } from '@/store';
import type { DoctorAvailabilityRule, DoctorHoliday } from '@/types';

interface StaffDoctorSchedulePanelProps {
  doctorId: string;
  doctorName: string;
}

export function StaffDoctorSchedulePanel({ doctorId, doctorName }: StaffDoctorSchedulePanelProps) {
  const userRole = useUserRole();
  const canManage = canManageDoctorSchedule(userRole);
  const [rules, setRules] = useState<DoctorAvailabilityRule[]>([]);
  const [holidays, setHolidays] = useState<DoctorHoliday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canManage) return;
    setIsLoading(true);
    setError(null);
    try {
      const [schedule, leaveRows] = await Promise.all([
        adminAppointmentsService.getDoctorSchedule(doctorId),
        adminAppointmentsService.listDoctorHolidays(doctorId),
      ]);
      setRules(schedule.rules);
      setHolidays(leaveRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load doctor schedule');
    } finally {
      setIsLoading(false);
    }
  }, [canManage, doctorId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canManage) {
    return null;
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading schedule…</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Consultation schedule</h2>
        <p className="text-sm text-muted-foreground">
          Manage weekly clinic and teleconsultation hours for {doctorName}. Changes apply to new booking slots immediately.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          {success}
        </div>
      )}

      <AvailabilityEditor
        rules={rules}
        isSaving={isSaving}
        onSave={async (nextRules) => {
          setIsSaving(true);
          setError(null);
          setSuccess(null);
          try {
            const saved = await adminAppointmentsService.saveDoctorSchedule(doctorId, { rules: nextRules });
            setRules(saved.rules);
            setSuccess('Weekly schedule saved.');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save schedule');
            throw err;
          } finally {
            setIsSaving(false);
          }
        }}
      />

      <HolidayForm
        holidays={holidays}
        isSaving={isSaving}
        onCreate={async (payload) => {
          setIsSaving(true);
          setError(null);
          setSuccess(null);
          try {
            const created = await adminAppointmentsService.createDoctorHoliday(doctorId, payload);
            setHolidays((rows) => [created, ...rows]);
            setSuccess('Leave dates saved.');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save leave');
            throw err;
          } finally {
            setIsSaving(false);
          }
        }}
      />
    </div>
  );
}
