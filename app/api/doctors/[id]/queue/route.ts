import { NextResponse, connection } from "next/server";
import db from "@/lib/db";
import { getQueueForDoctor } from "@/lib/queue";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  const { id } = await params;
  const doctorId = Number(id);
  const doctor = db.prepare("SELECT * FROM doctors WHERE id = ?").get(doctorId);
  if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

  const queue = getQueueForDoctor(doctorId);
  return NextResponse.json({ doctor, queue });
}
