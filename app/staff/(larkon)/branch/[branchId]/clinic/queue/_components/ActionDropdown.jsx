"use client";

import { useState } from "react";

export default function ActionDropdown({ actions, disabled, label = "Actions" }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!actions || actions.length === 0) return null;

  return (
    <div className="btn-group btn-group-sm">
      <button
        type="button"
        className="btn btn-outline-secondary dropdown-toggle"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
      >
        {label}
      </button>
      {isOpen && (
        <>
          <div
            className="position-fixed top-0 start-0 w-100 h-100"
            style={{ zIndex: 1040 }}
            onClick={() => setIsOpen(false)}
          />
          <ul
            className="dropdown-menu dropdown-menu-end show"
            style={{ position: "absolute", zIndex: 1050 }}
          >
            {actions.map((action, idx) => {
              if (action.divider) {
                return <li key={idx}><hr className="dropdown-divider" /></li>;
              }
              return (
                <li key={idx}>
                  <button
                    type="button"
                    className={`dropdown-item ${action.danger ? "text-danger" : ""}`}
                    onClick={() => {
                      setIsOpen(false);
                      action.onClick();
                    }}
                    disabled={action.disabled}
                  >
                    {action.icon && <span className="me-2">{action.icon}</span>}
                    {action.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
