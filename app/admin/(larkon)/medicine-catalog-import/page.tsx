import { redirect } from "next/navigation";

/** Legacy URL; canonical workspace is `/admin/medicine/imports`. */
export default function LegacyMedicineCatalogImportRedirect() {
  redirect("/admin/medicine/imports");
}
