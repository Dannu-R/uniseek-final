// The recommended-colleges list now renders inside the dashboard (app/dashboard). This
// route is kept only so old links/bookmarks resolve — it redirects into the dashboard.
import { redirect } from "next/navigation";

export default function ResultsPage() {
  redirect("/dashboard");
}
