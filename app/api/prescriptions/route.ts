import { NextResponse, connection } from "next/server";
import db from "@/lib/db";

// Doctor uploads a prescription/report for a patient; it's "sent" by
// simply becoming visible in the patient's history immediately.
export async function POST(req: Request) {
  await connection();
  const body = await req.json();
  const { patient_id, doctor_id, appointment_id, file_name, file_data, notes, diagnosis } = body as {
    patient_id: number;
    doctor_id: number;
    appointment_id?: number;
    file_name?: string;
    file_data?: string;
    notes?: string;
    diagnosis?: string;
  };

  if (!patient_id || !doctor_id) {
    return NextResponse.json({ error: "patient_id and doctor_id required" }, { status: 400 });
  }

  const rx = db
    .prepare(
      `INSERT INTO prescriptions (patient_id, doctor_id, appointment_id, file_name, file_data, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(patient_id, doctor_id, appointment_id ?? null, file_name ?? null, file_data ?? null, notes ?? null);

  // Also log a medical history entry for this visit
  const today = new Date().toISOString().slice(0, 10);
  db.prepare(
    `INSERT INTO medical_history (patient_id, doctor_id, appointment_id, visit_date, diagnosis, notes)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(patient_id, doctor_id, appointment_id ?? null, today, diagnosis ?? null, notes ?? null);

  return NextResponse.json({ ok: true, id: rx.lastInsertRowid });
}
