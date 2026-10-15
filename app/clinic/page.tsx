"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Doctor {
  id: number;
  clinic_id: number;
  name: string;
  specialty: string;
  status: string;
}

interface Clinic {
  id: number;
  name: string;
  address: string;
}

export default function ClinicSelect() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    fetch("/api/seed", { method: "POST" })
      .then(() => fetch("/api/clinics"))
      .then((r) => r.json())
      .then((d) => {
        setClinics(d.clinics || []);
        setDoctors(d.doctors || []);
      });
  }, []);

  return (
    <div className="flex-1 max-w-xl w-full mx-auto px-5 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Clinic / Doctor login</h1>
      <p className="mt-1 text-sm text-slate-500">Pick a doctor to manage their live queue.</p>

      <div className="mt-6 space-y-5">
        {clinics.map((c) => (
          <div key={c.id}>
            <p className="text-sm font-semibold text-slate-700 mb-2">
              {c.name} <span className="text-slate-400 font-normal">· {c.address}</span>
            </p>
            <div className="space-y-2">
              {doctors
                .filter((d) => d.clinic_id === c.id)
                .map((d) => (
                  <Link
                    key={d.id}
                    href={`/clinic/dashboard/${d.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400 transition"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{d.name}</p>
                      <p className="text-xs text-slate-500">{d.specialty}</p>
                    </div>
                    <span className="text-sm text-slate-400">Manage →</span>
                  </Link>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
