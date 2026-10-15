"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface QueueEntry {
  id: number;
  patient_id: number;
  patient_name: string;
  queue_position: number;
  status: string;
  estimated_time: string | null;
  checked_in_at: string | null;
}

interface Doctor {
  id: number;
  name: string;
  specialty: string;
  avg_consult_minutes: number;
  status: string;
  delay_minutes: number;
  status_note: string | null;
}

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso.includes("Z") || iso.includes("+") ? iso : iso + "Z");
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ClinicDashboardClient() {
  const params = useParams();
  const doctorId = Number(params.doctorId);

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [delayInput, setDelayInput] = useState(0);
  const [noteInput, setNoteInput] = useState("");
  const [rxModal, setRxModal] = useState<QueueEntry | null>(null);
  const [rxNotes, setRxNotes] = useState("");
  const [rxDiagnosis, setRxDiagnosis] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/doctors/${doctorId}/queue`).then((r) => r.json());
    setDoctor(res.doctor);
    setQueue(res.queue || []);
  }, [doctorId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (doctor) {
      setDelayInput(doctor.delay_minutes);
      setNoteInput(doctor.status_note || "");
    }
  }, [doctor]);

  async function updateStatus(status: string, extraDelay?: number) {
    setSaving(true);
    try {
      await fetch(`/api/doctors/${doctorId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          delay_minutes: extraDelay !== undefined ? extraDelay : delayInput,
          status_note: noteInput || null,
        }),
      });
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function markAppointment(apptId: number, status: string) {
    await fetch(`/api/appointments/${apptId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await refresh();
  }

  async function submitPrescription() {
    if (!rxModal || !doctor) return;
    await fetch("/api/prescriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: rxModal.patient_id,
        doctor_id: doctor.id,
        appointment_id: rxModal.id,
        diagnosis: rxDiagnosis,
        notes: rxNotes,
      }),
    });
    setRxModal(null);
    setRxNotes("");
    setRxDiagnosis("");
    await refresh();
  }

  if (!doctor) return null;

  const waiting = queue.filter((q) => q.status === "waiting");
  const inConsult = queue.find((q) => q.status === "in_consult");
  const done = queue.filter((q) => ["completed", "no_show", "cancelled"].includes(q.status));

  return (
    <div className="flex-1 max-w-2xl w-full mx-auto px-5 py-8">
      <Link href="/clinic" className="text-xs text-slate-400 hover:text-slate-600">
        ← Switch doctor
      </Link>
      <div className="flex items-start justify-between mt-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{doctor.name}</h1>
          <p className="text-sm text-slate-500">{doctor.specialty}</p>
        </div>
        <span className="text-sm font-medium text-slate-900 capitalize bg-slate-100 px-2.5 py-1 rounded-full">
          {doctor.status.replace("_", " ")}
        </span>
      </div>

      {/* Status controls — the core "ripple" action */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-700 mb-3">Update status</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => updateStatus("available", 0)}
            disabled={saving}
            className="text-sm font-medium py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          >
            Mark Available
          </button>
          <button
            onClick={() => updateStatus("emergency", Math.max(delayInput, 30))}
            disabled={saving}
            className="text-sm font-medium py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
          >
            Emergency (+30m)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={delayInput}
            onChange={(e) => setDelayInput(Number(e.target.value))}
            className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
          <span className="text-sm text-slate-500">min delay</span>
          <button
            onClick={() => updateStatus("delayed")}
            disabled={saving}
            className="ml-auto text-sm font-medium bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600"
          >
            Apply delay
          </button>
        </div>

        <input
          value={noteInput}
          onChange={(e) => setNoteInput(e.target.value)}
          placeholder="Note for patients (e.g. 'In surgery, back by 3pm')"
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          onBlur={() => updateStatus(doctor.status)}
        />
        <p className="mt-2 text-xs text-slate-400">
          Changing status instantly recalculates wait times for everyone waiting.
        </p>
      </div>

      {/* Currently in consult */}
      {inConsult && (
        <div className="mt-6">
          <p className="text-sm font-semibold text-slate-700 mb-2">In consultation</p>
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 flex items-center justify-between">
            <p className="font-medium text-slate-900">{inConsult.patient_name}</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setRxModal(inConsult);
                }}
                className="text-xs font-medium bg-white border border-slate-300 px-2.5 py-1.5 rounded-lg hover:bg-slate-50"
              >
                Add Rx / notes
              </button>
              <button
                onClick={() => markAppointment(inConsult.id, "completed")}
                className="text-xs font-medium bg-teal-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-teal-700"
              >
                Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Waiting queue */}
      <div className="mt-6">
        <p className="text-sm font-semibold text-slate-700 mb-2">
          Waiting ({waiting.length})
        </p>
        <div className="space-y-2">
          {waiting.length === 0 && (
            <p className="text-sm text-slate-400">No one waiting right now.</p>
          )}
          {waiting.map((q, idx) => (
            <div
              key={q.id}
              className="rounded-lg border border-slate-200 bg-white p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {idx + 1}. {q.patient_name}
                </p>
                <p className="text-xs text-slate-500">Est. {fmtTime(q.estimated_time)}</p>
              </div>
              <div className="flex gap-2">
                {!inConsult && idx === 0 && (
                  <button
                    onClick={() => markAppointment(q.id, "in_consult")}
                    className="text-xs font-medium bg-teal-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-teal-700"
                  >
                    Call in
                  </button>
                )}
                <button
                  onClick={() => markAppointment(q.id, "no_show")}
                  className="text-xs font-medium text-slate-400 hover:text-red-500"
                >
                  No-show
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {done.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-semibold text-slate-700 mb-2">Completed today</p>
          <div className="space-y-1">
            {done.map((q) => (
              <p key={q.id} className="text-sm text-slate-400">
                {q.patient_name} — <span className="capitalize">{q.status}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Prescription modal */}
      {rxModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-5 z-50">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full">
            <p className="font-semibold text-slate-900">
              Prescription for {rxModal.patient_name}
            </p>
            <input
              value={rxDiagnosis}
              onChange={(e) => setRxDiagnosis(e.target.value)}
              placeholder="Diagnosis"
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <textarea
              value={rxNotes}
              onChange={(e) => setRxNotes(e.target.value)}
              placeholder="Prescription / notes"
              rows={4}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="mt-3 flex gap-2 justify-end">
              <button
                onClick={() => setRxModal(null)}
                className="text-sm px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={submitPrescription}
                className="text-sm font-medium bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700"
              >
                Send to patient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
