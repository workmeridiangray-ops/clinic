import db from "./db";

export interface QueueEntry {
  id: number;
  patient_id: number;
  patient_name: string;
  doctor_id: number;
  doctor_name: string;
  clinic_id: number;
  clinic_name: string;
  queue_position: number;
  status: string;
  scheduled_for: string;
  estimated_time: string | null;
  checked_in_at: string | null;
}

/**
 * Recalculates estimated consultation times for every waiting patient
 * in a doctor's queue, based on:
 * - doctor's average consult duration
 * - doctor's current delay_minutes (manually set, e.g. emergency/running late)
 * - position in queue
 *
 * This is called any time:
 * - a doctor's status/delay changes
 * - a patient is marked in_consult / completed
 * - a new patient checks in
 */
export function recalculateQueue(doctorId: number) {
  const doctor = db
    .prepare("SELECT * FROM doctors WHERE id = ?")
    .get(doctorId) as any;
  if (!doctor) return;

  const waiting = db
    .prepare(
      `SELECT * FROM appointments
       WHERE doctor_id = ? AND status IN ('waiting', 'in_consult')
       AND scheduled_for = date('now')
       ORDER BY queue_position ASC`
    )
    .all(doctorId) as any[];

  const now = new Date();
  // Doctor's delay pushes the very first estimate out; emergency adds extra buffer
  let cursor = new Date(now.getTime() + doctor.delay_minutes * 60000);

  const update = db.prepare(
    "UPDATE appointments SET estimated_time = ? WHERE id = ?"
  );

  for (const appt of waiting) {
    if (appt.status === "in_consult") {
      // in-progress patient: estimate is "now" effectively, don't push further
      update.run(now.toISOString(), appt.id);
      continue;
    }
    update.run(cursor.toISOString(), appt.id);
    cursor = new Date(cursor.getTime() + doctor.avg_consult_minutes * 60000);
  }
}

export function recalculateAllActiveDoctors() {
  const doctors = db.prepare("SELECT id FROM doctors").all() as { id: number }[];
  for (const d of doctors) recalculateQueue(d.id);
}

export function getQueueForDoctor(doctorId: number): QueueEntry[] {
  recalculateQueue(doctorId);
  return db
    .prepare(
      `SELECT a.id, a.patient_id, p.name as patient_name, a.doctor_id, d.name as doctor_name,
              a.clinic_id, c.name as clinic_name, a.queue_position, a.status,
              a.scheduled_for, a.estimated_time, a.checked_in_at
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN doctors d ON d.id = a.doctor_id
       JOIN clinics c ON c.id = a.clinic_id
       WHERE a.doctor_id = ? AND a.scheduled_for = date('now')
       ORDER BY a.queue_position ASC`
    )
    .all(doctorId) as QueueEntry[];
}

export function getPatientActiveAppointments(patientId: number): QueueEntry[] {
  // recalc doctors relevant to this patient first
  const docIds = db
    .prepare(
      `SELECT DISTINCT doctor_id FROM appointments
       WHERE patient_id = ? AND status IN ('waiting','in_consult') AND scheduled_for = date('now')`
    )
    .all(patientId) as { doctor_id: number }[];
  docIds.forEach((d) => recalculateQueue(d.doctor_id));

  return db
    .prepare(
      `SELECT a.id, a.patient_id, p.name as patient_name, a.doctor_id, d.name as doctor_name,
              a.clinic_id, c.name as clinic_name, a.queue_position, a.status,
              a.scheduled_for, a.estimated_time, a.checked_in_at
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN doctors d ON d.id = a.doctor_id
       JOIN clinics c ON c.id = a.clinic_id
       WHERE a.patient_id = ?
       ORDER BY a.created_at DESC`
    )
    .all(patientId) as QueueEntry[];
}

export function peopleAheadCount(appointmentId: number): number {
  const appt = db.prepare("SELECT * FROM appointments WHERE id = ?").get(appointmentId) as any;
  if (!appt) return 0;
  const ahead = db
    .prepare(
      `SELECT COUNT(*) as c FROM appointments
       WHERE doctor_id = ? AND scheduled_for = ? AND queue_position < ?
       AND status IN ('waiting','in_consult')`
    )
    .get(appt.doctor_id, appt.scheduled_for, appt.queue_position) as { c: number };
  return ahead.c;
}
