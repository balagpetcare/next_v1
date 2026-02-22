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

declare module "@/src/hooks/useToast" {
  export function useToast(): {
    success: (msg: string, opts?: { duration?: number; dedupe?: boolean }) => void;
    error: (msg: string, opts?: { duration?: number; dedupe?: boolean }) => void;
    warning: (msg: string, opts?: { duration?: number; dedupe?: boolean }) => void;
    info: (msg: string, opts?: { duration?: number; dedupe?: boolean }) => void;
  };
}

declare module "@/src/lib/apiErrorToMessage" {
  export function getMessageFromApiError(error: unknown): string;
}

declare module "@/src/utils/authHelpers" {
  export function getStoredToken(): string | null;
  export function clearStoredToken(): void;
  export function detectAuthType(input: string): { type: "email" | "phone" | null; normalized: string };
}

declare module "@/src/bpa/components/AuthFooter" {
  export default function AuthFooter(): JSX.Element;
}

declare module "@/lib/useBranchContext" {
  export function useBranchContext(branchId: string | null): {
    branch: unknown;
    myAccess: { role: string; permissions: string[]; scopes: string[] };
    isLoading: boolean;
    kpis: Record<string, unknown>;
    todayBoard: Record<string, unknown>;
  };
}

declare module "@/src/components/NotificationBell" {
  export interface NotificationBellProps {
    enabled?: boolean;
  }
  export default function NotificationBell(props: NotificationBellProps): JSX.Element;
}

declare module "leaflet/dist/leaflet.css" {
  const url: string;
  export default url;
}

declare module "@/src/bpa/components/PageHeader" {
  import { ReactNode } from "react";
  export interface PageHeaderProps {
    title?: string;
    subtitle?: string;
    right?: ReactNode;
  }
  export default function PageHeader(props: PageHeaderProps): JSX.Element;
}

declare module "@/src/bpa/admin/components/SectionCard" {
  import { ReactNode } from "react";
  export interface SectionCardProps {
    title?: string;
    right?: ReactNode;
    children?: ReactNode;
    className?: string;
  }
  export default function SectionCard(props: SectionCardProps): JSX.Element;
}

declare module "@/src/bpa/admin/components/FilterPanel" {
  import { ReactNode } from "react";
  export interface FilterPanelProps {
    title?: string;
    defaultCollapsed?: boolean;
    children?: ReactNode;
  }
  export default function FilterPanel(props: FilterPanelProps): JSX.Element;
}

declare module "@/src/bpa/admin/components/StatusChip" {
  export interface StatusChipProps {
    status?: string;
  }
  export default function StatusChip(props: StatusChipProps): JSX.Element;
}

declare module "@/src/bpa/admin/components/StatCard" {
  import { ReactNode } from "react";
  export interface StatCardProps {
    title?: string;
    value?: ReactNode;
    subtitle?: string;
    icon?: ReactNode;
    tone?: string;
    href?: string;
  }
  export default function StatCard(props: StatCardProps): JSX.Element;
}

declare module "@/src/bpa/admin/components/DetailDrawer" {
  import { ReactNode } from "react";
  export interface DetailDrawerProps {
    open?: boolean;
    onClose?: () => void;
    title?: string | ReactNode;
    subtitle?: ReactNode;
    tabs?: Array<{ key: string; label: string; children?: ReactNode }>;
    actionBar?: ReactNode;
    loading?: boolean;
  }
  export default function DetailDrawer(props: DetailDrawerProps): JSX.Element;
}

declare module "@/src/bpa/admin/components/DecisionPanel" {
  export interface DecisionPanelProps {
    basePath?: string;
    onDone?: () => void | Promise<void>;
    loading?: boolean;
  }
  export default function DecisionPanel(props: DecisionPanelProps): JSX.Element;
}

declare module "@/src/bpa/admin/components/DocGrid" {
  export interface DocGridProps {
    documents?: unknown[];
  }
  export default function DocGrid(props: DocGridProps): JSX.Element;
}

declare module "@/src/bpa/admin/components/TimelineView" {
  export interface TimelineViewProps {
    logs?: unknown[];
  }
  export default function TimelineView(props: TimelineViewProps): JSX.Element;
}

declare module "@/src/bpa/admin/components/CommentThread" {
  export interface CommentThreadProps {
    comments?: Array<{ id?: unknown; author?: string; createdAt?: string; text?: string; comment?: string }>;
    onSend?: (text: string) => void | Promise<void>;
  }
  export default function CommentThread(props: CommentThreadProps): JSX.Element;
}
