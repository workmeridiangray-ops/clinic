import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "clinic.db");
const isNew = !fs.existsSync(dbPath);

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS clinics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT
);

CREATE TABLE IF NOT EXISTS doctors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL REFERENCES clinics(id),
  name TEXT NOT NULL,
  specialty TEXT,
  avg_consult_minutes INTEGER NOT NULL DEFAULT 15,
  status TEXT NOT NULL DEFAULT 'available', -- available | delayed | emergency | on_break
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  status_note TEXT
);

CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  date_of_birth TEXT,
  gender TEXT
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  doctor_id INTEGER NOT NULL REFERENCES doctors(id),
  clinic_id INTEGER NOT NULL REFERENCES clinics(id),
  queue_position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting | in_consult | completed | cancelled | no_show
  scheduled_for TEXT NOT NULL, -- ISO date for the day of visit
  estimated_time TEXT, -- ISO computed estimate
  checked_in_at TEXT,
  called_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS medical_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  doctor_id INTEGER REFERENCES doctors(id),
  appointment_id INTEGER REFERENCES appointments(id),
  visit_date TEXT NOT NULL,
  diagnosis TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  doctor_id INTEGER REFERENCES doctors(id),
  appointment_id INTEGER REFERENCES appointments(id),
  file_name TEXT,
  file_data TEXT, -- base64
  notes TEXT,
  issued_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

export function seedIfEmpty() {
  const clinicCount = db.prepare("SELECT COUNT(*) as c FROM clinics").get() as { c: number };
  if (clinicCount.c > 0) return;

  const insertClinic = db.prepare("INSERT INTO clinics (name, address) VALUES (?, ?)");
  const c1 = insertClinic.run("Sunrise Family Clinic", "Balewadi, Pune").lastInsertRowid as number;
  const c2 = insertClinic.run("CarePlus Multispeciality", "Baner, Pune").lastInsertRowid as number;

  const insertDoctor = db.prepare(
    "INSERT INTO doctors (clinic_id, name, specialty, avg_consult_minutes, status) VALUES (?, ?, ?, ?, 'available')"
  );
  const d1 = insertDoctor.run(c1, "Dr. Rohan Deshpande", "General Physician", 12).lastInsertRowid as number;
  const d2 = insertDoctor.run(c1, "Dr. Ananya Kulkarni", "Pediatrician", 15).lastInsertRowid as number;
  const d3 = insertDoctor.run(c2, "Dr. Sameer Joshi", "Dermatologist", 10).lastInsertRowid as number;

  const insertPatient = db.prepare(
    "INSERT INTO patients (name, phone, password_hash, date_of_birth, gender) VALUES (?, ?, ?, ?, ?)"
  );
  // password for all demo patients: "demo1234" (plain for prototype simplicity, see auth note)
  const p1 = insertPatient.run("Aadav Mehta", "9876500001", "demo1234", "1998-03-14", "Male").lastInsertRowid as number;
  const p2 = insertPatient.run("Nandini Gupta", "9876500002", "demo1234", "1999-07-22", "Female").lastInsertRowid as number;
  const p3 = insertPatient.run("Rakesh Verma", "9876500003", "demo1234", "1985-11-02", "Male").lastInsertRowid as number;
  const p4 = insertPatient.run("Priya Shah", "9876500004", "demo1234", "1992-05-30", "Female").lastInsertRowid as number;

  const today = new Date().toISOString().slice(0, 10);
  const insertAppt = db.prepare(
    `INSERT INTO appointments (patient_id, doctor_id, clinic_id, queue_position, status, scheduled_for, checked_in_at)
     VALUES (?, ?, ?, ?, 'waiting', ?, datetime('now'))`
  );
  insertAppt.run(p1, d1, c1, 1, today);
  insertAppt.run(p2, d1, c1, 2, today);
  insertAppt.run(p3, d1, c1, 3, today);
  insertAppt.run(p4, d3, c2, 1, today);
}

export default db;
