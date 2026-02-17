"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import LkInput from "@larkon-ui/components/LkInput";
import LkButton from "@larkon-ui/components/LkButton";

export type Brand = {
  id: number;
  name: string;
  slug: string;
};

type Props = {
  brands: Brand[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
};

export default function BrandSelect({
  brands,
  value,
  onChange,
  disabled,
  className = "",
  placeholder = "Search and select brand...",
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get selected brand name
  const selectedBrand = useMemo(() => {
    if (!value) return null;
    return brands.find((b) => String(b.id) === value);
  }, [brands, value]);

  // Filter brands based on search query
  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) return brands;
    const query = searchQuery.toLowerCase();
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(query) ||
        b.slug.toLowerCase().includes(query)
    );
  }, [brands, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (brandId: string) => {
    onChange(brandId);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearchQuery("");
    setIsOpen(false);
  };

  return (
    <div className={`position-relative ${className}`} ref={containerRef}>
      <label className="form-label">Brand</label>
      <div className="position-relative">
        <div
          className="form-control radius-12 d-flex align-items-center justify-content-between"
          style={{
            cursor: disabled ? "not-allowed" : "pointer",
            minHeight: "38px",
            padding: "6px 12px",
          }}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <span className={selectedBrand ? "" : "text-muted"}>
            {selectedBrand ? selectedBrand.name : placeholder}
          </span>
          <div className="d-flex align-items-center gap-2">
            {value && !disabled && (
              <LkButton
                type="button"
                variant="link"
                size="sm"
                className="p-0 border-0 bg-transparent text-body"
                onClick={handleClear}
                style={{ fontSize: "18px", lineHeight: 1 }}
              >
                ×
              </LkButton>
            )}
            <span className="text-muted">▼</span>
          </div>
        </div>

        {isOpen && !disabled && (
          <div
            className="position-absolute w-100 bg-white border rounded radius-12 shadow-sm"
            style={{
              top: "100%",
              left: 0,
              zIndex: 1000,
              maxHeight: "300px",
              overflow: "hidden",
              marginTop: "4px",
            }}
          >
            <div className="p-2 border-bottom">
              <LkInput
                ref={inputRef}
                type="text"
                size="sm"
                className="radius-12"
                placeholder="Type to search brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
            <div
              style={{
                maxHeight: "250px",
                overflowY: "auto",
              }}
            >
              {filteredBrands.length === 0 ? (
                <div className="p-3 text-center text-muted">
                  {searchQuery ? "No brands found" : "No brands available"}
                </div>
              ) : (
                filteredBrands.map((brand) => (
                  <div
                    key={brand.id}
                    className="p-2 cursor-pointer"
                    style={{
                      cursor: "pointer",
                      backgroundColor:
                        value === String(brand.id) ? "#f0f0f0" : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f8f9fa";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        value === String(brand.id) ? "#f0f0f0" : "transparent";
                    }}
                    onClick={() => handleSelect(String(brand.id))}
                  >
                    <div className="d-flex align-items-center justify-content-between">
                      <span>{brand.name}</span>
                      {value === String(brand.id) && (
                        <span className="text-primary">✓</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
