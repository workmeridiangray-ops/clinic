import { NextResponse, connection } from "next/server";
import db from "@/lib/db";
import { getPatientActiveAppointments, peopleAheadCount } from "@/lib/queue";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  const { id } = await params;
  const patientId = Number(id);
  const appts = getPatientActiveAppointments(patientId);
  const withAhead = appts.map((a) => ({
    ...a,
    people_ahead: a.status === "waiting" ? peopleAheadCount(a.id) : 0,
  }));
  return NextResponse.json({ appointments: withAhead });
}

// Book a new appointment (joins the back of the doctor's queue for today)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  const { id } = await params;
  const patientId = Number(id);
  const { doctor_id } = (await req.json()) as { doctor_id: number };

  const doctor = db.prepare("SELECT * FROM doctors WHERE id = ?").get(doctor_id) as any;
  if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

  const today = new Date().toISOString().slice(0, 10);
  const maxPos = db
    .prepare(
      `SELECT COALESCE(MAX(queue_position), 0) as m FROM appointments
       WHERE doctor_id = ? AND scheduled_for = ?`
    )
    .get(doctor_id, today) as { m: number };

  const result = db
    .prepare(
      `INSERT INTO appointments (patient_id, doctor_id, clinic_id, queue_position, status, scheduled_for, checked_in_at)
       VALUES (?, ?, ?, ?, 'waiting', ?, datetime('now'))`
    )
    .run(patientId, doctor_id, doctor.clinic_id, maxPos.m + 1, today);

  const appt = db.prepare("SELECT * FROM appointments WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json({ appointment: appt });
}
