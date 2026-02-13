"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

const SCROLL_THRESHOLD = 400;

export default function GoToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () =>
      setVisible(typeof window !== "undefined" ? window.scrollY > SCROLL_THRESHOLD : false);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      className="jamina-goto-top"
      onClick={goToTop}
      aria-label="Go to top"
    >
      <Icon icon="solar:arrow-up-bold" width={22} height={22} aria-hidden />
    </button>
  );
}
