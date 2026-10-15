"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PatientLogin() {
  const router = useRouter();
  const [phone, setPhone] = useState("9876500001");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/seed", { method: "POST" }).catch(() => {});
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/patient-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      localStorage.setItem("qc_patient", JSON.stringify(data.patient));
      router.push("/patient/dashboard");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="max-w-sm w-full">
        <h1 className="text-2xl font-bold text-slate-900">Patient login</h1>
        <p className="mt-1 text-sm text-slate-500">
          Demo accounts are pre-seeded — just hit continue.
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-teal-600 text-white py-2.5 text-sm font-medium hover:bg-teal-700 transition disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Continue"}
          </button>
        </form>

        <div className="mt-6 text-xs text-slate-400 space-y-1">
          <p>Demo patients (same password: demo1234):</p>
          <p>9876500001 — Aadav Mehta</p>
          <p>9876500002 — Nandini Gupta</p>
          <p>9876500003 — Rakesh Verma</p>
          <p>9876500004 — Priya Shah</p>
        </div>
      </div>
    </div>
  );
}
