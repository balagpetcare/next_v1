"use client";

import { useRouter } from "next/navigation";
import BranchForm from "@/src/components/branch/BranchForm";
import type { BranchFormValues } from "@/src/lib/branchSchema";

export default function NewBranchPage() {
  const router = useRouter();

  const onSubmit = async (data: BranchFormValues) => {
    const res = await fetch("/api/owner/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const e = await res.json().catch(() => null);
      console.error(e);
      alert("Failed to create branch");
      return;
    }
    const json = await res.json();
    const id = json?.data?.id;
    router.push(`/owner/branches/${id}`);
  };

  return <BranchForm mode="create" onSubmit={onSubmit} />;
}
