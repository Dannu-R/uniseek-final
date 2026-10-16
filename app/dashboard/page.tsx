// Dashboard — the signed-in home. Middleware already gates this route; we re-check here
// and hand the session user to the client shell (name/email/avatar for the account chip).
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/landing/Navbar";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/dashboard");

  const { name, email, image } = session.user;
  return (
    <>
      {/* The shared site header (fixed, 64px). dashboard.css offsets the shell below it. */}
      <Navbar />
      {/* DashboardClient reads the URL with useSearchParams, which needs a Suspense boundary. */}
      <Suspense>
        <DashboardClient user={{ name, email, image }} />
      </Suspense>
    </>
  );
}
