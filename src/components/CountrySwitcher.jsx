"use client";

import { useRouter } from "next/navigation";
import { getCountryCode, setCountryCode } from "@/lib/countryContext";

const COUNTRIES = [
  { code: "BD", label: "Bangladesh" },
  { code: "IN", label: "India" },
  { code: "US", label: "United States" },
  { code: "AE", label: "UAE" },
];

export default function CountrySwitcher() {
  const router = useRouter();
  const current = getCountryCode();

  const handleChange = (e) => {
    const code = e.target?.value;
    if (!code) return;
    setCountryCode(code);
    router.refresh();
  };

  return (
    <select
      className="form-select form-select-sm radius-12"
      value={current}
      onChange={handleChange}
      title="Country (Global-Ready)"
      style={{ width: "auto", minWidth: 100 }}
      aria-label="Select country"
    >
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.code} – {c.label}
        </option>
      ))}
    </select>
  );
}
