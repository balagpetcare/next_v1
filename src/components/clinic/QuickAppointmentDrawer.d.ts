import { ReactNode } from "react";

export interface QuickAppointmentDrawerProps {
  open?: boolean;
  onClose?: () => void;
  branchId?: string | number;
  [key: string]: unknown;
}

declare function QuickAppointmentDrawer(props: QuickAppointmentDrawerProps): ReactNode;
export default QuickAppointmentDrawer;
