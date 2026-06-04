"use client";

import { useEffect } from "react";
import DivisionDropdown from "./DivisionDropdown";
import DistrictDropdown from "./DistrictDropdown";
import UpazilaDropdown from "./UpazilaDropdown";
import UnionDropdown from "./UnionDropdown";
import { prefetchBangladeshLocationMaster } from "./locationMasterClient";

export type BangladeshLocationSelection = {
  divisionId?: string;
  districtId?: string;
  upazilaId?: string;
  unionId?: string;
  divisionName?: string;
  districtName?: string;
  upazilaName?: string;
  unionName?: string;
};

type Props = {
  value?: BangladeshLocationSelection | null;
  onChange: (next: BangladeshLocationSelection) => void;
  locale?: "en" | "bn";
  disabled?: boolean;
  required?: boolean;
};

function asId(value: string | number | null | undefined): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return String(Math.trunc(n));
}

export default function LocationSelector({
  value,
  onChange,
  locale = "en",
  disabled = false,
  required = false,
}: Props) {
  const safeValue = value || {};

  useEffect(() => {
    prefetchBangladeshLocationMaster().catch(() => undefined);
  }, []);

  return (
    <div className="border rounded-3 p-3 bg-light-subtle">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <label className="form-label fw-semibold mb-0">
          Bangladesh Location {required ? <span className="text-danger">*</span> : null}
        </label>
      </div>

      <div className="row g-3">
        <div className="col-12 col-md-6">
          <DivisionDropdown
            valueId={safeValue.divisionId}
            locale={locale}
            disabled={disabled}
            onChange={(division) => {
              onChange({
                divisionId: asId(division?.id),
                divisionName: division?.name,
                districtId: undefined,
                districtName: undefined,
                upazilaId: undefined,
                upazilaName: undefined,
                unionId: undefined,
                unionName: undefined,
              });
            }}
          />
        </div>

        <div className="col-12 col-md-6">
          <DistrictDropdown
            divisionId={safeValue.divisionId}
            valueId={safeValue.districtId}
            locale={locale}
            disabled={disabled}
            onChange={(district) => {
              onChange({
                ...safeValue,
                districtId: asId(district?.id),
                districtName: district?.name,
                upazilaId: undefined,
                upazilaName: undefined,
                unionId: undefined,
                unionName: undefined,
              });
            }}
          />
        </div>

        <div className="col-12 col-md-6">
          <UpazilaDropdown
            districtId={safeValue.districtId}
            valueId={safeValue.upazilaId}
            locale={locale}
            disabled={disabled}
            onChange={(upazila) => {
              onChange({
                ...safeValue,
                upazilaId: asId(upazila?.id),
                upazilaName: upazila?.name,
                unionId: undefined,
                unionName: undefined,
              });
            }}
          />
        </div>

        <div className="col-12 col-md-6">
          <UnionDropdown
            upazilaId={safeValue.upazilaId}
            valueId={safeValue.unionId}
            locale={locale}
            disabled={disabled}
            onChange={(union) => {
              onChange({
                ...safeValue,
                unionId: asId(union?.id),
                unionName: union?.name,
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}

