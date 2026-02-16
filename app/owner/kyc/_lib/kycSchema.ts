import { z } from "zod";

const iso2Regex = /^[A-Za-z]{2}$/;

export const kycIdentitySchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  mobile: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  nationalityCode: z
    .string()
    .min(1, "Nationality is required")
    .refine((v) => iso2Regex.test(v.trim()), "Invalid nationality code (2-letter ISO)"),
  nationalityLabel: z.string().optional(),
  nidNumber: z.string().optional(),
});

export const kycConsentSchema = z.object({
  consentAccepted: z.literal(true, { errorMap: () => ({ message: "Please accept the terms" }) }),
});

export type KycIdentityValues = z.infer<typeof kycIdentitySchema>;
