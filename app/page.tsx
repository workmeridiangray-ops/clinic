import Link from "next/link";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full text-center">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="h-9 w-9 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold">
            Q
          </div>
          <span className="text-lg font-semibold tracking-tight">QueueCare</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          Stop waiting in clinics.
        </h1>
        <p className="mt-3 text-slate-600 text-base sm:text-lg">
          See your live queue position and wait time across hospitals &amp; clinics —
          updated the moment a doctor runs late or an emergency comes in.
        </p>

        <div className="mt-10 grid sm:grid-cols-2 gap-4 text-left">
          <Link
            href="/patient"
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-teal-300 transition"
          >
            <div className="text-sm font-medium text-teal-700">I'm a patient</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">
              Check my queue
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Book appointments, track live wait time, view history &amp; prescriptions
            </div>
            <div className="mt-4 text-sm font-medium text-teal-600 group-hover:translate-x-0.5 transition">
              Continue →
            </div>
          </Link>

          <Link
            href="/clinic"
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-400 transition"
          >
            <div className="text-sm font-medium text-slate-600">I'm a clinic / doctor</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">
              Manage my queue
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Call patients in, flag delays or emergencies, send prescriptions
            </div>
            <div className="mt-4 text-sm font-medium text-slate-700 group-hover:translate-x-0.5 transition">
              Continue →
            </div>
          </Link>
        </div>

        <p className="mt-10 text-xs text-slate-400">
          Prototype demo — seeded with sample clinics &amp; patients
        </p>
      </div>
    </div>
  );
}
