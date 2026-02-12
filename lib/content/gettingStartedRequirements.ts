/**
 * Getting Started — Requirements & Steps content.
 * Single source of truth for onboarding documentation.
 * Edit this file to update "What you'll need" and "Steps" for each path.
 *
 * Derived from: backend-api/docs/verification/business-requirements.md,
 * backend-api/docs/verification/business/producer.md,
 * app/owner/kyc/page.jsx
 */

export type PathKey = "owner" | "clinic" | "shop" | "producer" | "customer";

export interface RequirementDoc {
  label: string;
  required: boolean;
  hint?: string;
}

export interface PathRequirement {
  pathKey: PathKey;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  /** Document checklist */
  documents: RequirementDoc[];
  /** Step-by-step flow */
  steps: Array<{
    title: string;
    description: string;
  }>;
  /** "Start Setup" button label (navigates — may trigger KYC) */
  startSetupLabel: string;
  /** Route to navigate on Start Setup */
  ctaRoute: string;
  /** Append ?intro=1 when navigating (for owner/clinic/shop overview) */
  useIntroParam?: boolean;
  /** Cookie key: intendedPanel or selectedPanel */
  cookieKey: "intendedPanel" | "selectedPanel";
  /** Cookie value */
  cookieValue: string;
}

export const GETTING_STARTED_PATHS: PathRequirement[] = [
  {
    pathKey: "owner",
    label: "Owner / Business",
    shortLabel: "Owner",
    description: "Run a pet shop, clinic, or multi-branch business. Create organizations, add branches, manage products, staff, and sales.",
    icon: "ri-store-3-line",
    documents: [
      { label: "NID Front & Back", required: true, hint: "Clear, readable images" },
      { label: "Selfie with NID", required: true, hint: "Hold NID near face; good lighting" },
      { label: "Trade License", required: false, hint: "Optional; speeds up verification" },
    ],
    steps: [
      { title: "Register or sign in", description: "Create an owner account with email or phone." },
      { title: "Complete KYC", description: "Submit identity documents for verification." },
      { title: "Create organization & branch", description: "Add your business name and first location." },
      { title: "Start selling", description: "Add products, invite staff, use POS, track sales." },
    ],
    startSetupLabel: "Start Setup",
    ctaRoute: "/owner/onboarding",
    useIntroParam: true,
    cookieKey: "intendedPanel",
    cookieValue: "owner",
  },
  {
    pathKey: "clinic",
    label: "Clinic",
    shortLabel: "Clinic",
    description: "Run a veterinary clinic. Manage appointments, patients, services, and staff.",
    icon: "ri-hospital-line",
    documents: [
      { label: "NID Front & Back", required: true, hint: "Clear, readable images" },
      { label: "Selfie with NID", required: true, hint: "Hold NID near face" },
      { label: "Vet / Drug License", required: false, hint: "For clinic branch verification" },
      { label: "Trade License", required: false, hint: "Optional" },
    ],
    steps: [
      { title: "Register or sign in", description: "Create an owner account." },
      { title: "Complete KYC", description: "Submit identity and clinic documents." },
      { title: "Create clinic branch", description: "Add your clinic as a branch (type: Clinic)." },
      { title: "Go live", description: "Add services, manage appointments, invite staff." },
    ],
    startSetupLabel: "Start Setup",
    ctaRoute: "/owner/onboarding",
    useIntroParam: true,
    cookieKey: "intendedPanel",
    cookieValue: "owner",
  },
  {
    pathKey: "shop",
    label: "Shop / Partner",
    shortLabel: "Shop",
    description: "Run a pet retail shop. POS, inventory, orders, and online store.",
    icon: "ri-shopping-cart-line",
    documents: [
      { label: "NID Front & Back", required: true, hint: "Clear, readable images" },
      { label: "Selfie with NID", required: true, hint: "Hold NID near face" },
      { label: "Trade License", required: false, hint: "Optional; speeds up verification" },
    ],
    steps: [
      { title: "Register or sign in", description: "Create an owner account." },
      { title: "Complete KYC", description: "Submit identity documents." },
      { title: "Create shop branch", description: "Add your shop as a branch (type: Pet Shop)." },
      { title: "Go live", description: "Add products, use POS, manage orders." },
    ],
    startSetupLabel: "Start Setup",
    ctaRoute: "/owner/onboarding",
    useIntroParam: true,
    cookieKey: "intendedPanel",
    cookieValue: "owner",
  },
  {
    pathKey: "producer",
    label: "Producer",
    shortLabel: "Producer",
    description: "Supply products to the platform. Manage batches, products, and distribution.",
    icon: "ri-box-3-line",
    documents: [
      { label: "Identity proof", required: true, hint: "NID front OR selfie with NID" },
      { label: "Business proof", required: true, hint: "Trade license, incorporation cert, or other" },
      { label: "NID Back", required: false, hint: "Optional" },
    ],
    steps: [
      { title: "Register as producer", description: "Create a producer account (separate from owner)." },
      { title: "Complete producer KYC", description: "Submit identity + business documents." },
      { title: "Wait for approval", description: "Admin reviews your documents." },
      { title: "Start supplying", description: "Add products, batches, manage catalog." },
    ],
    startSetupLabel: "Start Setup",
    ctaRoute: "/producer",
    useIntroParam: false,
    cookieKey: "intendedPanel",
    cookieValue: "producer",
  },
  {
    pathKey: "customer",
    label: "Browse as Customer",
    shortLabel: "Customer",
    description: "Shop for pet products and services. No verification required.",
    icon: "ri-user-line",
    documents: [],
    steps: [
      { title: "Sign in or continue as guest", description: "No documents needed." },
      { title: "Browse & shop", description: "Find products, place orders, track deliveries." },
    ],
    startSetupLabel: "Browse as Customer",
    ctaRoute: "/mother",
    useIntroParam: false,
    cookieKey: "selectedPanel",
    cookieValue: "mother",
  },
];

export function getPathByKey(key: PathKey): PathRequirement | undefined {
  return GETTING_STARTED_PATHS.find((p) => p.pathKey === key);
}
