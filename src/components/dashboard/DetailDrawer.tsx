'use client';

import { ReactNode } from 'react';
import { Offcanvas } from 'react-bootstrap';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  placement?: 'start' | 'end';
  width?: string;
  className?: string;
};

/**
 * Right-side (or left) detail drawer for quick entity preview.
 * Uses Bootstrap Offcanvas; responsive (full-width on small screens).
 */
export default function DetailDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  placement = 'end',
  width,
  className = '',
}: Props) {
  return (
    <Offcanvas
      show={open}
      onHide={onClose}
      placement={placement}
      className={`bpa-detail-drawer ${className}`.trim()}
      style={width ? { width, maxWidth: '100%' } : undefined}
    >
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>
          <div>
            <div className="fw-semibold">{title}</div>
            {subtitle && <div className="text-muted small">{subtitle}</div>}
          </div>
        </Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body className="pt-0">{children}</Offcanvas.Body>
    </Offcanvas>
  );
}
