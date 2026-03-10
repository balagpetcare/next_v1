"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Icon } from "@iconify/react";

/**
 * Expandable action dropdown component for table rows.
 * Renders menu in a portal so it is not clipped by overflow/transform.
 */
export default function ActionDropdown({ actions = [], item, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);

  // Compute position synchronously when opening so menu doesn't flash at (0,0)
  useLayoutEffect(() => {
    if (!isOpen || !dropdownRef.current) return;
    const buttonRect = dropdownRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const estimatedHeight = actions.length * 45 + 16;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    let top;
    if (spaceAbove > spaceBelow && spaceAbove > estimatedHeight) {
      top = buttonRect.top - estimatedHeight - 8;
    } else {
      top = buttonRect.bottom + 8;
    }
    const right = viewportWidth - buttonRect.right;
    setPosition({ top, right });
  }, [isOpen, actions.length]);

  // Close on click outside (button or portaled menu). Delay listener so the same gesture that opened doesn't close.
  const outsideListenerRef = useRef(null);
  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => {
      const handleClickOutside = (event) => {
        const inButton = dropdownRef.current?.contains(event.target);
        const inMenu = menuRef.current?.contains(event.target);
        if (!inButton && !inMenu) setIsOpen(false);
      };
      document.addEventListener("mousedown", handleClickOutside);
      outsideListenerRef.current = () => {
        document.removeEventListener("mousedown", handleClickOutside);
        outsideListenerRef.current = null;
      };
    }, 0);
    return () => {
      clearTimeout(id);
      outsideListenerRef.current?.();
    };
  }, [isOpen]);

  if (!actions || actions.length === 0) return null;

  return (
    <div
      ref={dropdownRef}
      className={`action-dropdown position-relative ${className}`.trim()}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        className="btn btn-sm btn-light radius-12 d-flex align-items-center gap-1"
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
        style={{
          border: "1px solid #d1d5db",
          padding: "6px 12px",
          transition: "all 0.2s ease",
          backgroundColor: "#ffffff",
          color: "#374151",
          fontWeight: 500,
          fontSize: "13px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#f3f4f6";
          e.currentTarget.style.borderColor = "#9ca3af";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "#ffffff";
          e.currentTarget.style.borderColor = "#d1d5db";
        }}
      >
        <span>Action</span>
        <Icon 
          icon={isOpen ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"}
          className="fs-6" 
          style={{ 
            color: "#374151", 
            width: "16px", 
            height: "16px",
            transition: "transform 0.2s ease",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }} 
        />
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        document.body &&
        createPortal(
          <>
            <div
              role="presentation"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9998,
              }}
              onClick={() => setIsOpen(false)}
            />
            <div
              ref={menuRef}
              className="action-dropdown-menu dropdown-menu show"
              style={{
                position: "fixed",
                display: "block",
                visibility: "visible",
                minWidth: "200px",
                padding: "8px",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                zIndex: 9999,
                backgroundColor: "#ffffff",
                top: `${position.top}px`,
                right: `${position.right}px`,
              }}
            >
              {actions.map((action, idx) => {
                if (action.divider) {
                  return (
                    <div
                      key={idx}
                      className="dropdown-divider"
                      style={{ margin: "8px 0", borderColor: "#e5e7eb" }}
                    />
                  );
                }

                if (action.href) {
                  return (
                    <Link
                      key={idx}
                      href={action.href}
                      className={`dropdown-item d-flex align-items-center gap-2 radius-8 ${
                        action.variant === "danger" ? "text-danger" : ""
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                        if (action.onClick) {
                          action.onClick(e, item);
                        }
                      }}
                      style={{
                        padding: "10px 12px",
                        fontSize: "14px",
                        transition: "background-color 0.2s ease",
                        color: action.variant === "danger" ? "#dc2626" : "#111827",
                        textDecoration: "none",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = action.variant === "danger" ? "#fef2f2" : "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "";
                      }}
                    >
                      {action.icon && (
                        <Icon
                          icon={action.icon}
                          className="fs-6"
                          style={{ width: "18px", height: "18px", color: "inherit" }}
                        />
                      )}
                      <span style={{ fontWeight: 500, color: "inherit" }}>{action.label}</span>
                    </Link>
                  );
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    className={`dropdown-item d-flex align-items-center gap-2 radius-8 border-0 bg-transparent w-100 text-start ${
                      action.variant === "danger" ? "text-danger" : action.variant === "warning" ? "text-warning" : ""
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                      if (action.onClick) {
                        action.onClick(e, item);
                      }
                    }}
                    disabled={action.disabled}
                    style={{
                      padding: "10px 12px",
                      fontSize: "14px",
                      transition: "background-color 0.2s ease",
                      cursor: action.disabled ? "not-allowed" : "pointer",
                      opacity: action.disabled ? 0.5 : 1,
                      color: action.variant === "danger" ? "#dc2626" : action.variant === "warning" ? "#d97706" : "#111827",
                    }}
                    onMouseEnter={(e) => {
                      if (!action.disabled) {
                        e.currentTarget.style.backgroundColor = action.variant === "danger" ? "#fef2f2" : action.variant === "warning" ? "#fffbeb" : "#f9fafb";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "";
                    }}
                  >
                    {action.icon && (
                      <Icon
                        icon={action.icon}
                        className="fs-6"
                        style={{ width: "18px", height: "18px", color: "inherit" }}
                      />
                    )}
                    <span style={{ fontWeight: 500, color: "inherit" }}>{action.label}</span>
                  </button>
                );
              })}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
