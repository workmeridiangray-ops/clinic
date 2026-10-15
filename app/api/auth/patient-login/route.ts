import { NextResponse, connection } from "next/server";
import db from "@/lib/db";

// Prototype auth: phone + password, plaintext compare against seeded demo
// patients. Not production security — fine for a local demo.
export async function POST(req: Request) {
  await connection();
  const { phone, password } = (await req.json()) as { phone: string; password: string };

  const patient = db
    .prepare("SELECT id, name, phone FROM patients WHERE phone = ? AND password_hash = ?")
    .get(phone, password) as any;

  if (!patient) {
    return NextResponse.json({ error: "Invalid phone or password" }, { status: 401 });
  }

  return NextResponse.json({ patient });
}
