import { NextResponse, connection } from "next/server";
import db from "@/lib/db";
import { recalculateQueue } from "@/lib/queue";

// Mark a patient as checked-in / in_consult / completed / no_show.
// Advancing the queue this way also triggers a recalc for everyone behind them.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  const { id } = await params;
  const apptId = Number(id);
  const { status } = (await req.json()) as { status: string };

  const appt = db.prepare("SELECT * FROM appointments WHERE id = ?").get(apptId) as any;
  if (!appt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

  const timestampCol =
    status === "in_consult" ? "called_at" : status === "completed" ? "completed_at" : null;

  if (timestampCol) {
    db.prepare(
      `UPDATE appointments SET status = ?, ${timestampCol} = datetime('now') WHERE id = ?`
    ).run(status, apptId);
  } else {
    db.prepare(`UPDATE appointments SET status = ? WHERE id = ?`).run(status, apptId);
  }

  recalculateQueue(appt.doctor_id);

  const updated = db.prepare("SELECT * FROM appointments WHERE id = ?").get(apptId);
  return NextResponse.json({ appointment: updated });
}
