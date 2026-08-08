// The intake wizard now lives embedded in the dashboard (app/dashboard). This route is
// kept only so old links/bookmarks resolve — it redirects into the dashboard.
import { redirect } from "next/navigation";

export default function BuildPage() {
  redirect("/dashboard");
}
