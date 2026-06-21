import 'dotenv/config';
import pg from 'pg';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import { hashPassword } from '../src/security/passwords.js';
import { createAppointmentSlotService } from '../src/services/appointmentSlotService.js';

const { Pool } = pg;

const EXTRA_DOCTORS = [
  {
    userId: '00000000-0000-4000-8000-000000000109',
    doctorId: '00000000-0000-4000-8000-000000000209',
    username: 'doctor.rajesh',
    password: 'Doctor@123',
    fullName: 'Dr. Rajesh Kumar',
    mobile: '+919900000009',
    email: 'rajesh.mock@livotale.test',
    registrationNumber: 'MMC-2010-MH-88231',
    specialization: 'Gastroenterology',
  },
  {
    userId: '00000000-0000-4000-8000-000000000110',
    doctorId: '00000000-0000-4000-8000-000000000210',
    username: 'doctor.meera',
    password: 'Doctor@123',
    fullName: 'Dr. Meera Shah',
    mobile: '+919900000010',
    email: 'meera.mock@livotale.test',
    registrationNumber: 'MMC-2012-MH-77102',
    specialization: 'Hepatology',
  },
];

const WEEKDAY_RULES = [
  { day: 1, start: '09:00', end: '13:00' },
  { day: 1, start: '14:00', end: '17:00' },
  { day: 2, start: '09:00', end: '13:00' },
  { day: 2, start: '14:00', end: '17:00' },
  { day: 3, start: '09:00', end: '13:00' },
  { day: 3, start: '14:00', end: '17:00' },
  { day: 4, start: '09:00', end: '13:00' },
  { day: 4, start: '14:00', end: '17:00' },
  { day: 5, start: '09:00', end: '13:00' },
  { day: 5, start: '14:00', end: '17:00' },
  { day: 6, start: '10:00', end: '14:00' },
];

export async function seedDoctorBookingData(pool) {
  const client = await pool.connect();
  const slotService = createAppointmentSlotService(pool);
  try {
    await client.query('BEGIN');

    const clinic = await client.query("SELECT id FROM core.clinics LIMIT 1");
    const clinicId = clinic.rows[0]?.id;
    if (!clinicId) throw new Error('No clinic found — run seed:mock first');

    const role = await client.query("SELECT id FROM identity.roles WHERE code = 'doctor'");

    for (const doc of EXTRA_DOCTORS) {
      await client.query(
        `INSERT INTO identity.users(id, username, password_hash, full_name, mobile, email, gender, status)
         VALUES ($1,$2,$3,$4,$5,$6,'undisclosed','active')
         ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, mobile = EXCLUDED.mobile, status = 'active'`,
        [doc.userId, doc.username, hashPassword(doc.password), doc.fullName, doc.mobile, doc.email],
      );
      await client.query(
        `INSERT INTO identity.user_roles(user_id, role_id, clinic_id, is_primary)
         VALUES ($1,$2,$3,true)
         ON CONFLICT (user_id, role_id, clinic_id) DO NOTHING`,
        [doc.userId, role.rows[0].id, clinicId],
      );
      await client.query(
        `INSERT INTO clinical.doctors(id, user_id, clinic_id, registration_number, qualification, specialization, years_experience, status)
         VALUES ($1,$2,$3,$4,'MD DM',$5,12,'active')
         ON CONFLICT (id) DO UPDATE SET specialization = EXCLUDED.specialization, status = 'active'`,
        [doc.doctorId, doc.userId, clinicId, doc.registrationNumber, doc.specialization],
      );
    }

    const doctors = await client.query(
      `SELECT id FROM clinical.doctors WHERE status = 'active'`,
    );

    for (const { id: doctorId } of doctors.rows) {
      await client.query(
        `UPDATE operations.doctor_availability SET is_active = false WHERE doctor_id = $1`,
        [doctorId],
      );

      for (const rule of WEEKDAY_RULES) {
        await client.query(
          `INSERT INTO operations.doctor_availability(
            doctor_id, day_of_week, start_time, end_time,
            slot_duration_minutes, buffer_minutes, visit_modes, effective_from, is_active
          ) VALUES ($1,$2,$3,$4,30,0,'["clinic","tele"]'::jsonb,CURRENT_DATE,true)`,
          [doctorId, rule.day, rule.start, rule.end],
        );
      }
    }

    const fromDate = new Date().toISOString().slice(0, 10);
    const to = new Date();
    to.setDate(to.getDate() + 30);
    const toDate = to.toISOString().slice(0, 10);

    let totalSlots = 0;
    for (const { id: doctorId } of doctors.rows) {
      totalSlots += await slotService.generateSlotsForDoctorRange(client, doctorId, fromDate, toDate);
    }

    await client.query('COMMIT');
    return { doctors: doctors.rowCount, slotsGenerated: totalSlots };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  seedDoctorBookingData(pool)
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => pool.end());
}
