"use client";

import { useEffect } from "react";

export default function StaffBranchPosLayout({ children }) {
  useEffect(() => {
    document.documentElement.classList.add("staff-pos-dense-mode");
    document.body.classList.add("staff-pos-dense-mode");

    return () => {
      document.documentElement.classList.remove("staff-pos-dense-mode");
      document.body.classList.remove("staff-pos-dense-mode");
    };
  }, []);

  return children;
}
