import { NextResponse } from "next/server";
import { connection } from "next/server";
import db from "@/lib/db";

export async function GET() {
  await connection();
  const clinics = db
    .prepare(
      `SELECT c.id, c.name, c.address,
              (SELECT COUNT(*) FROM doctors d WHERE d.clinic_id = c.id) as doctor_count
       FROM clinics c`
    )
    .all();
  const doctors = db
    .prepare(
      `SELECT id, clinic_id, name, specialty, avg_consult_minutes, status, delay_minutes, status_note
       FROM doctors`
    )
    .all();
  return NextResponse.json({ clinics, doctors });
}
