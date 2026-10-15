import { NextResponse, connection } from "next/server";
import { seedIfEmpty } from "@/lib/db";

export async function POST() {
  await connection();
  seedIfEmpty();
  return NextResponse.json({ ok: true });
}
