import { ReactNode } from "react";

export interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  className?: string;
}

declare function Card(props: CardProps): ReactNode;
export default Card;
