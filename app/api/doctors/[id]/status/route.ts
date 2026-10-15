import { NextResponse, connection } from "next/server";
import db from "@/lib/db";
import { recalculateQueue } from "@/lib/queue";

// Doctor/clinic side: update status (available/delayed/emergency/on_break),
// delay_minutes, and an optional note. This is the action that ripples
// live updates to every patient waiting on this doctor.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  const { id } = await params;
  const doctorId = Number(id);
  const body = await req.json();

  const { status, delay_minutes, status_note } = body as {
    status?: string;
    delay_minutes?: number;
    status_note?: string;
  };

  const existing = db.prepare("SELECT * FROM doctors WHERE id = ?").get(doctorId) as any;
  if (!existing) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  db.prepare(
    `UPDATE doctors SET
      status = COALESCE(?, status),
      delay_minutes = COALESCE(?, delay_minutes),
      status_note = ?
     WHERE id = ?`
  ).run(status ?? null, delay_minutes ?? null, status_note ?? existing.status_note ?? null, doctorId);

  recalculateQueue(doctorId);

  const updated = db.prepare("SELECT * FROM doctors WHERE id = ?").get(doctorId);
  return NextResponse.json({ doctor: updated });
}
