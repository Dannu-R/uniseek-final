// The College Explorer now renders inline inside the dashboard (app/dashboard/ExplorerView).
// This route is kept only so old links resolve — it redirects into the dashboard.
import { redirect } from "next/navigation";

export default function ExplorerPage() {
  redirect("/dashboard");
}
