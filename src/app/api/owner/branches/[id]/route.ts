import { NextResponse } from "next/server";
import { BranchFormSchema } from "@/src/lib/branchSchema";
import { getBranch, updateBranch, toggleBranchStatus } from "@/src/lib/mockBranches";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const b = await getBranch(params.id);
  if (!b) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: b });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const json = await req.json();
  const parsed = BranchFormSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }
  const b = await updateBranch(params.id, parsed.data);
  if (!b) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: b });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const json = await req.json();
  if (json?.action === "toggleStatus") {
    const b = await toggleBranchStatus(params.id);
    if (!b) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: b });
  }
  return NextResponse.json({ success: false, error: "Unsupported" }, { status: 400 });
}
