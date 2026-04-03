import { ReactNode } from "react";

export interface CardProps {
  children?: ReactNode;
  className?: string;
}

declare function Card(props: CardProps): ReactNode;
export default Card;
