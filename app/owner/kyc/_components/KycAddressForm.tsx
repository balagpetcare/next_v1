"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import LocationField from "@/src/components/location/LocationField";
import type { LocationValue } from "@/src/lib/location/normalizeLocation";
import {
  internationalAddressToLocationValue,
  locationValueToInternationalAddress,
} from "../_lib/addressAdapter";
import type { InternationalAddress } from "../_types/kyc";

const LocationFieldClient = dynamic(
  () => Promise.resolve(LocationField),
  { ssr: false }
);

export interface KycAddressFormProps {
  value: InternationalAddress | null;
  onChange: (addr: InternationalAddress | null) => void;
  disabled?: boolean;
}

export default function KycAddressForm({
  value,
  onChange,
  disabled = false,
}: KycAddressFormProps) {
  const [locValue, setLocValue] = useState<LocationValue | null>(() =>
    internationalAddressToLocationValue(value)
  );
  const [addressLine1, setAddressLine1] = useState(value?.addressLine1 ?? "");
  const [addressLine2, setAddressLine2] = useState(value?.addressLine2 ?? "");
  const [landmark, setLandmark] = useState(value?.landmark ?? "");

  useEffect(() => {
    const next = internationalAddressToLocationValue(value);
    setLocValue(next);
    setAddressLine1(value?.addressLine1 ?? "");
    setAddressLine2(value?.addressLine2 ?? "");
    setLandmark(value?.landmark ?? "");
  }, [value?.countryCode, value?.addressLine1, value?.addressLine2, value?.landmark]);

  const emit = useCallback(
    (patch: Partial<InternationalAddress>) => {
      const base = locationValueToInternationalAddress(locValue);
      const merged: InternationalAddress = {
        countryCode: "BD",
        countryName: "Bangladesh",
        latitude: 0,
        longitude: 0,
        ...base,
        ...patch,
        addressLine1: patch.addressLine1 ?? (addressLine1 || base?.addressLine1 || " "),
        addressLine2: patch.addressLine2 ?? (addressLine2 || base?.addressLine2 || undefined),
        landmark: patch.landmark ?? (landmark || base?.landmark || undefined),
      };
      onChange(merged);
    },
    [locValue, addressLine1, addressLine2, landmark, onChange]
  );

  const handleLocationChange = useCallback(
    (next: LocationValue) => {
      setLocValue(next);
      const addr = locationValueToInternationalAddress(next);
      if (!addr) return;
      addr.addressLine1 = addressLine1 || addr.addressLine1 || " ";
      addr.addressLine2 = addressLine2 || undefined;
      addr.landmark = landmark || undefined;
      onChange(addr);
    },
    [addressLine1, addressLine2, landmark, onChange]
  );

  const handleAddressLine1Change = (v: string) => {
    setAddressLine1(v);
    emit({ addressLine1: v || " " });
  };
  const handleAddressLine2Change = (v: string) => {
    setAddressLine2(v);
    emit({ addressLine2: v || undefined });
  };
  const handleLandmarkChange = (v: string) => {
    setLandmark(v);
    emit({ landmark: v || undefined });
  };

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white border-bottom py-3">
        <div className="d-flex align-items-center gap-2">
          <div className="bg-primary bg-opacity-10 text-primary p-2 rounded">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <div>
            <h5 className="mb-0 fw-bold">Present Address</h5>
            <small className="text-muted">Your current residential address</small>
          </div>
        </div>
      </div>
      <div className="card-body p-4">
        <div className="mb-4">
          <label className="form-label fw-semibold">Country & Region <span className="text-danger">*</span></label>
          <LocationFieldClient
            value={locValue}
            onChange={handleLocationChange}
            label=""
            required
            defaultCountryCode="BD"
            enableRecent={true}
            enableGPS={true}
            enableMap={true}
          />
          <small className="text-muted d-block mt-2">Select country first, then state/city. Use the map or GPS for coordinates.</small>
        </div>

        <div className="row g-3">
          <div className="col-12">
            <label className="form-label fw-semibold">Address Line 1 <span className="text-danger">*</span></label>
            <input
              type="text"
              className="form-control form-control-lg"
              value={addressLine1}
              onChange={(e) => handleAddressLine1Change(e.target.value)}
              placeholder="Street name, house number, area"
              disabled={disabled}
              dir="auto"
            />
            <small className="text-muted">Your street address, house/building number</small>
          </div>
          <div className="col-12 col-lg-6">
            <label className="form-label fw-semibold">Address Line 2 <span className="text-muted fw-normal">(Optional)</span></label>
            <input
              type="text"
              className="form-control form-control-lg"
              value={addressLine2}
              onChange={(e) => handleAddressLine2Change(e.target.value)}
              placeholder="Apartment, suite, floor"
              disabled={disabled}
              dir="auto"
            />
          </div>
          <div className="col-12 col-lg-6">
            <label className="form-label fw-semibold">Landmark <span className="text-muted fw-normal">(Optional)</span></label>
            <input
              type="text"
              className="form-control form-control-lg"
              value={landmark}
              onChange={(e) => handleLandmarkChange(e.target.value)}
              placeholder="Near hospital, school, etc."
              disabled={disabled}
              dir="auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
