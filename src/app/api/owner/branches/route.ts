import { NextResponse } from "next/server";
import { BranchFormSchema } from "@/src/lib/branchSchema";
import { createBranch, listBranches } from "@/src/lib/mockBranches";

export async function GET() {
  const items = await listBranches();
  return NextResponse.json({ success: true, data: items });
}

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = BranchFormSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }
  const b = await createBranch(parsed.data);
  return NextResponse.json({ success: true, data: b }, { status: 201 });
}
