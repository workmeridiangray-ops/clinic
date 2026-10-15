import { NextResponse, connection } from "next/server";
import db from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  const { id } = await params;
  const patientId = Number(id);

  const history = db
    .prepare(
      `SELECT mh.*, d.name as doctor_name FROM medical_history mh
       LEFT JOIN doctors d ON d.id = mh.doctor_id
       WHERE mh.patient_id = ? ORDER BY mh.visit_date DESC`
    )
    .all(patientId);

  const prescriptions = db
    .prepare(
      `SELECT p.id, p.file_name, p.notes, p.issued_at, d.name as doctor_name
       FROM prescriptions p
       LEFT JOIN doctors d ON d.id = p.doctor_id
       WHERE p.patient_id = ? ORDER BY p.issued_at DESC`
    )
    .all(patientId);

  return NextResponse.json({ history, prescriptions });
}
