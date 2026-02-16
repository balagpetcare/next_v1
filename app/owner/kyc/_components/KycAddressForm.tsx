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
        addressLine1: " ",
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
    <div className="card border radius-16">
      <div className="card-body p-20">
        <div className="fw-semibold mb-12">Address & Location</div>
        <p className="text-sm text-secondary-light mb-16">
          Select country first, then state/city. Use the map or &quot;Use current location&quot; to set coordinates.
        </p>

        <div className="mb-16">
          <LocationFieldClient
            value={locValue}
            onChange={handleLocationChange}
            label="Location"
            required
            defaultCountryCode="BD"
            enableRecent={true}
            enableGPS={true}
            enableMap={true}
          />
        </div>

        <div className="row g-3">
          <div className="col-12">
            <label className="form-label">Address Line 1 (street, house) *</label>
            <input
              type="text"
              className="form-control radius-12"
              value={addressLine1}
              onChange={(e) => handleAddressLine1Change(e.target.value)}
              placeholder="Street, house number, area"
              disabled={disabled}
              dir="auto"
            />
          </div>
          <div className="col-12">
            <label className="form-label">Address Line 2 (optional)</label>
            <input
              type="text"
              className="form-control radius-12"
              value={addressLine2}
              onChange={(e) => handleAddressLine2Change(e.target.value)}
              placeholder="Apartment, suite, floor"
              disabled={disabled}
              dir="auto"
            />
          </div>
          <div className="col-12">
            <label className="form-label">Landmark (optional)</label>
            <input
              type="text"
              className="form-control radius-12"
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
