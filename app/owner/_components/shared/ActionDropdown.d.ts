import { ReactNode } from "react";

export interface ActionDropdownProps {
  label?: string;
  children?: ReactNode;
  className?: string;
  align?: "start" | "end";
  [key: string]: unknown;
}

declare function ActionDropdown(props: ActionDropdownProps): ReactNode;
export default ActionDropdown;
