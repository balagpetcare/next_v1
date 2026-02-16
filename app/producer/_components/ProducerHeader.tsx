"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";

const SCROLL_THRESHOLD = 8;

export default function ProducerHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () =>
      setScrolled(typeof window !== "undefined" ? window.scrollY > SCROLL_THRESHOLD : false);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={"producer-header" + (scrolled ? " scrolled" : "")}
      role="banner"
    >
      <div className="producer-header-inner">
        <Link href="/" className="producer-logo" aria-label="Producer Portal Home">
          <Icon
            icon="solar:qr-code-outline"
            width={24}
            height={24}
            className="producer-logo-icon"
            aria-hidden
          />
          <span>Producer Portal</span>
        </Link>
        <nav className="producer-header-nav" aria-label="Producer landing navigation">
          <a href="#solution" className="producer-header-link">
            See Features
          </a>
          <a href="#how-it-works" className="producer-header-link">
            How It Works
          </a>
          <a href="#the-problem" className="producer-header-link">
            The Problem
          </a>
          <a href="#live-demo" className="producer-header-link">
            Live Demo
          </a>
        </nav>
        <div className="producer-header-actions">
          <Link
            href="/producer/login"
            className="producer-btn producer-btn-ghost"
            aria-label="Log in to Producer Portal"
          >
            Log in
          </Link>
          <Link
            href="/producer/dashboard"
            className="producer-btn producer-btn-primary"
            aria-label="Enter Producer Dashboard"
          >
            Enter Console
          </Link>
        </div>
      </div>
    </header>
  );
}
