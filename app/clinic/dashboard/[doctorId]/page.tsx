import { Suspense } from "react";
import ClinicDashboardClient from "./dashboard-client";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ClinicDashboardClient />
    </Suspense>
  );
}
