import { redirect } from "next/navigation";

export default function LegacyMedicineCatalogImportNewRedirect() {
  redirect("/admin/medicine/imports/new");
}
