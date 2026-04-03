import { ReactNode } from "react";

export interface BranchHeaderProps {
  /** Branch payload from `useBranchContext` / API; shape varies by screen. */
  branch?: unknown;
  myAccess?: unknown;
  /** Present on most pages; some legacy screens omit until context loads. */
  branchId?: string;
}

declare function BranchHeader(props: BranchHeaderProps): ReactNode;
export default BranchHeader;
