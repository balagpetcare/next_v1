/**
 * Declaration for JS/JSX modules that have no TypeScript definitions.
 * Keeps strict TypeScript without converting every file to .tsx.
 */

declare module "@/src/lib/apiFetch" {
  export function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T>;
}

declare module "@/app/owner/_components/shared/PageHeader" {
  import { ReactNode } from "react";
  export interface PageHeaderProps {
    title?: ReactNode;
    subtitle?: ReactNode;
    breadcrumbs?: Array<{ label: ReactNode; href?: string }>;
    actions?: ReactNode[];
    className?: string;
  }
  export default function PageHeader(props: PageHeaderProps): JSX.Element;
}

declare module "@/app/owner/_components/StatusBadge" {
  export interface StatusBadgeProps {
    status: string;
  }
  export default function StatusBadge(props: StatusBadgeProps): JSX.Element;
}

declare module "@/app/owner/_components/branch/BranchForm" {
  export interface BranchFormValues {
    name: string;
    typeCodes: string[];
    organizationId?: number;
    branchPhone?: string;
    branchEmail?: string;
    addressText?: string;
    googleMapLink?: string;
    managerName?: string;
    managerPhone?: string;
    location?: Record<string, unknown>;
    [key: string]: unknown;
  }
  export interface BranchFormProps {
    mode?: "create" | "edit";
    organizationId?: number;
    branchId?: string | null;
    onDone?: () => void;
    onSubmit?: (data: BranchFormValues) => void | Promise<void>;
  }
  export default function BranchForm(props: BranchFormProps): JSX.Element;
}

declare module "@/src/utils/authHelpers" {
  export function getStoredToken(): string | null;
  export function clearStoredToken(): void;
  export function detectAuthType(input: string): { type: "email" | "phone" | null; normalized: string };
}

declare module "@/src/bpa/components/AuthFooter" {
  export default function AuthFooter(): JSX.Element;
}

declare module "leaflet/dist/leaflet.css" {
  const url: string;
  export default url;
}
