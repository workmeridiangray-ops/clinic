"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Patient {
  id: number;
  name: string;
  phone: string;
}

interface Appointment {
  id: number;
  doctor_id: number;
  doctor_name: string;
  clinic_id: number;
  clinic_name: string;
  queue_position: number;
  status: string;
  scheduled_for: string;
  estimated_time: string | null;
  checked_in_at: string | null;
  people_ahead: number;
}

interface Doctor {
  id: number;
  clinic_id: number;
  name: string;
  specialty: string;
  avg_consult_minutes: number;
  status: string;
  delay_minutes: number;
  status_note: string | null;
}

interface Clinic {
  id: number;
  name: string;
  address: string;
  doctor_count: number;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    available: "bg-emerald-50 text-emerald-700 border-emerald-200",
    delayed: "bg-amber-50 text-amber-700 border-amber-200",
    emergency: "bg-red-50 text-red-700 border-red-200",
    on_break: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return map[status] || map.available;
}

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso.includes("Z") || iso.includes("+") ? iso : iso + "Z");
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function minutesUntil(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso.includes("Z") || iso.includes("+") ? iso : iso + "Z");
  const diffMs = d.getTime() - Date.now();
  return Math.max(0, Math.round(diffMs / 60000));
}

export default function PatientDashboard() {
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [tab, setTab] = useState<"queue" | "book" | "history">("queue");
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("qc_patient");
    if (!raw) {
      router.push("/patient");
      return;
    }
    setPatient(JSON.parse(raw));
  }, [router]);

  const refresh = useCallback(async (patientId: number) => {
    const [apptsRes, clinicsRes, historyRes] = await Promise.all([
      fetch(`/api/patients/${patientId}/appointments`).then((r) => r.json()),
      fetch(`/api/clinics`).then((r) => r.json()),
      fetch(`/api/patients/${patientId}/history`).then((r) => r.json()),
    ]);
    setAppts(apptsRes.appointments || []);
    setClinics(clinicsRes.clinics || []);
    setDoctors(clinicsRes.doctors || []);
    setHistory(historyRes.history || []);
    setPrescriptions(historyRes.prescriptions || []);
  }, []);

  useEffect(() => {
    if (!patient) return;
    refresh(patient.id);
    const interval = setInterval(() => refresh(patient.id), 5000);
    return () => clearInterval(interval);
  }, [patient, refresh]);

  async function bookAppointment(doctorId: number) {
    if (!patient) return;
    setBooking(true);
    try {
      await fetch(`/api/patients/${patient.id}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: doctorId }),
      });
      await refresh(patient.id);
      setTab("queue");
    } finally {
      setBooking(false);
    }
  }

  function logout() {
    localStorage.removeItem("qc_patient");
    router.push("/patient");
  }

  if (!patient) return null;

  const activeAppts = appts.filter((a) => a.status === "waiting" || a.status === "in_consult");
  const pastAppts = appts.filter((a) => !["waiting", "in_consult"].includes(a.status));

  return (
    <div className="flex-1 max-w-2xl w-full mx-auto px-5 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-slate-500">Welcome back</p>
          <h1 className="text-xl font-bold text-slate-900">{patient.name}</h1>
        </div>
        <button onClick={logout} className="text-sm text-slate-400 hover:text-slate-600">
          Log out
        </button>
      </div>

      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 text-sm">
        {(["queue", "book", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-1.5 font-medium capitalize transition ${
              tab === t ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
            }`}
          >
            {t === "queue" ? "My Queue" : t === "book" ? "Book" : "History"}
          </button>
        ))}
      </div>

      {tab === "queue" && (
        <div className="space-y-4">
          {activeAppts.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <p className="text-sm">No active appointments.</p>
              <button
                onClick={() => setTab("book")}
                className="mt-3 text-teal-600 text-sm font-medium"
              >
                Book one now →
              </button>
            </div>
          )}

          {activeAppts.map((a) => {
            const doctor = doctors.find((d) => d.id === a.doctor_id);
            const mins = minutesUntil(a.estimated_time);
            return (
              <div
                key={a.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{a.doctor_name}</p>
                    <p className="text-sm text-slate-500">{a.clinic_name}</p>
                  </div>
                  {doctor && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full border font-medium capitalize ${statusBadge(
                        doctor.status
                      )}`}
                    >
                      {doctor.status.replace("_", " ")}
                    </span>
                  )}
                </div>

                {doctor?.status_note && (
                  <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                    {doctor.status_note}
                  </p>
                )}

                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {a.status === "in_consult" ? "Now" : a.people_ahead}
                    </p>
                    <p className="text-xs text-slate-500">
                      {a.status === "in_consult" ? "In consult" : "people ahead"}
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-teal-600">
                      {a.status === "in_consult" ? "—" : mins !== null ? `${mins}m` : "—"}
                    </p>
                    <p className="text-xs text-slate-500">estimated wait</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {fmtTime(a.estimated_time)}
                    </p>
                    <p className="text-xs text-slate-500">est. time</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "book" && (
        <div className="space-y-5">
          {clinics.map((c) => (
            <div key={c.id}>
              <p className="text-sm font-semibold text-slate-700 mb-2">
                {c.name} <span className="text-slate-400 font-normal">· {c.address}</span>
              </p>
              <div className="space-y-2">
                {doctors
                  .filter((d) => d.clinic_id === c.id)
                  .map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{d.name}</p>
                        <p className="text-xs text-slate-500">
                          {d.specialty} · ~{d.avg_consult_minutes} min/patient
                        </p>
                      </div>
                      <button
                        disabled={booking}
                        onClick={() => bookAppointment(d.id)}
                        className="text-sm font-medium bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 disabled:opacity-60"
                      >
                        Book
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Past visits</p>
            {pastAppts.length === 0 && history.length === 0 && (
              <p className="text-sm text-slate-400">No past visits yet.</p>
            )}
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-sm font-medium text-slate-900">
                    {h.doctor_name || "Doctor"} · {h.visit_date}
                  </p>
                  {h.diagnosis && (
                    <p className="text-sm text-slate-600 mt-1">Diagnosis: {h.diagnosis}</p>
                  )}
                  {h.notes && <p className="text-xs text-slate-500 mt-1">{h.notes}</p>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Prescriptions & reports</p>
            {prescriptions.length === 0 && (
              <p className="text-sm text-slate-400">None uploaded yet.</p>
            )}
            <div className="space-y-2">
              {prescriptions.map((p) => (
                <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-sm font-medium text-slate-900">
                    {p.doctor_name || "Doctor"} · {new Date(p.issued_at + "Z").toLocaleDateString()}
                  </p>
                  {p.notes && <p className="text-sm text-slate-600 mt-1">{p.notes}</p>}
                  {p.file_name && (
                    <p className="text-xs text-teal-600 mt-1">📎 {p.file_name}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
