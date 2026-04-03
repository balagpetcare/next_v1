import { ReactNode } from "react";

export interface AccessDeniedProps {
  title?: string;
  message?: string;
  missingPerm?: string;
  /** Alias used by some clinic pages for the missing permission key. */
  requiredPerm?: string;
  onBack?: () => void;
}

declare function AccessDenied(props: AccessDeniedProps): ReactNode;
export default AccessDenied;
