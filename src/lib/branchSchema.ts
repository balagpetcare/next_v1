/**
 * Branch form schema and types for owner branches API.
 * Used by API routes and BranchForm.
 */
import { z } from "zod";

export const BranchFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  typeCodes: z.array(z.string()).default([]),
  branchPhone: z.string().optional(),
  branchEmail: z.string().email().optional().or(z.literal("")),
  addressText: z.string().optional(),
  googleMapLink: z.string().url().optional().or(z.literal("")),
  managerName: z.string().optional(),
  managerPhone: z.string().optional(),
  organizationId: z.number().optional(),
  location: z.record(z.unknown()).optional(),
});

export type BranchFormValues = z.infer<typeof BranchFormSchema>;
