"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicRoomDetail,
  ownerClinicRoomUpdate,
  type ClinicRoom,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { humanizeEnum } from "@/src/lib/displayFormatters";

const ROOM_TYPES = ["GENERAL", "CONSULTATION", "PROCEDURE", "RECOVERY", "LAB", "GROOMING", "IMAGING", "VACCINATION", "ISOLATION", "MULTIPURPOSE", "SURGERY", "OTHER"];

export default function OwnerClinicRoomEditPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params?.branchId as string | undefined;
  const roomId = params?.roomId as string | undefined;
  const [room, setRoom] = useState<ClinicRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    code: "",
    roomType: "GENERAL",
    floor: "",
    zone: "",
    capacity: "",
    notes: "",
    bookable: true,
    cleaningBufferMinutes: "",
    maintenanceBufferMinutes: "",
    supportsWalkIns: true,
    emergencyOverrideAllowed: false,
  });

  useEffect(() => {
    if (!branchId || !roomId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await ownerClinicRoomDetail(branchId, roomId);
        if (!cancelled && data) {
          setRoom(data);
          setForm({
            name: data.name ?? "",
            code: data.code ?? "",
            roomType: data.roomType ?? "GENERAL",
            floor: data.floor ?? "",
            zone: data.zone ?? "",
            capacity: data.capacity != null ? String(data.capacity) : "",
            notes: data.notes ?? "",
            bookable: data.bookable !== false,
            cleaningBufferMinutes: data.cleaningBufferMinutes != null ? String(data.cleaningBufferMinutes) : "",
            maintenanceBufferMinutes: data.maintenanceBufferMinutes != null ? String(data.maintenanceBufferMinutes) : "",
            supportsWalkIns: data.supportsWalkIns !== false,
            emergencyOverrideAllowed: data.emergencyOverrideAllowed === true,
          });
        } else if (!cancelled) setRoom(null);
      } catch (e) {
        if (!cancelled) setError((e as Error)?.message || "Failed to load room");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [branchId, roomId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || !roomId) return;
    const capacityNum = form.capacity.trim() ? parseInt(form.capacity, 10) : undefined;
    if (capacityNum !== undefined && (Number.isNaN(capacityNum) || capacityNum < 1)) {
      setError("Capacity must be at least 1 when provided.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await ownerClinicRoomUpdate(branchId, roomId, {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        roomType: form.roomType,
        floor: form.floor.trim() || undefined,
        zone: form.zone.trim() || undefined,
        capacity: capacityNum,
        notes: form.notes.trim() || undefined,
        bookable: form.bookable,
        cleaningBufferMinutes: form.cleaningBufferMinutes.trim() ? parseInt(form.cleaningBufferMinutes, 10) : undefined,
        maintenanceBufferMinutes: form.maintenanceBufferMinutes.trim() ? parseInt(form.maintenanceBufferMinutes, 10) : undefined,
        supportsWalkIns: form.supportsWalkIns,
        emergencyOverrideAllowed: form.emergencyOverrideAllowed,
      });
      router.push(`/owner/clinic/${branchId}/rooms/${roomId}`);
    } catch (e) {
      setError((e as Error)?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!branchId || !roomId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch or room.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-main-body">
        <PageHeader title="Edit room" subtitle="Loading…" breadcrumbs={[]} />
        <div className="card radius-12"><div className="card-body text-center py-5"><div className="spinner-border text-primary" role="status" /></div></div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-danger radius-12">{error || "Room not found."}</div>
        <Link href={`/owner/clinic/${branchId}/rooms`} className="btn btn-outline-secondary radius-12">Back to rooms</Link>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title={`Edit: ${room.name}`}
        subtitle={room.code ? `Code: ${room.code}` : ""}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Rooms", href: `/owner/clinic/${branchId}/rooms` },
          { label: room.name, href: `/owner/clinic/${branchId}/rooms/${roomId}` },
          { label: "Edit", href: `/owner/clinic/${branchId}/rooms/${roomId}/edit` },
        ]}
      />

      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}

      <div className="card radius-12">
        <div className="card-body p-24">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Name</label>
                <input type="text" className="form-control radius-12" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required maxLength={128} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Code</label>
                <input type="text" className="form-control radius-12" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} maxLength={32} placeholder="e.g. R1" />
              </div>
              <div className="col-md-3">
                <label className="form-label">Type</label>
                <select className="form-select radius-12" value={form.roomType} onChange={(e) => setForm((f) => ({ ...f, roomType: e.target.value }))}>
                  {ROOM_TYPES.map((t) => <option key={t} value={t}>{humanizeEnum(t)}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Floor</label>
                <input type="text" className="form-control radius-12" value={form.floor} onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))} maxLength={32} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Zone</label>
                <input type="text" className="form-control radius-12" value={form.zone} onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))} maxLength={64} />
              </div>
              <div className="col-md-2">
                <label className="form-label">Capacity</label>
                <input type="number" className="form-control radius-12" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} min={1} placeholder="Optional" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Notes</label>
                <input type="text" className="form-control radius-12" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="col-12">
                <hr />
                <h6 className="mb-2">Options</h6>
              </div>
              <div className="col-md-2">
                <div className="form-check form-switch mt-4">
                  <input className="form-check-input" type="checkbox" checked={form.bookable} onChange={(e) => setForm((f) => ({ ...f, bookable: e.target.checked }))} />
                  <label className="form-check-label">Bookable</label>
                </div>
              </div>
              <div className="col-md-2">
                <label className="form-label">Cleaning buffer (min)</label>
                <input type="number" className="form-control radius-12" value={form.cleaningBufferMinutes} onChange={(e) => setForm((f) => ({ ...f, cleaningBufferMinutes: e.target.value }))} min={0} placeholder="Optional" />
              </div>
              <div className="col-md-2">
                <label className="form-label">Maintenance buffer (min)</label>
                <input type="number" className="form-control radius-12" value={form.maintenanceBufferMinutes} onChange={(e) => setForm((f) => ({ ...f, maintenanceBufferMinutes: e.target.value }))} min={0} placeholder="Optional" />
              </div>
              <div className="col-md-2">
                <div className="form-check form-switch mt-4">
                  <input className="form-check-input" type="checkbox" checked={form.supportsWalkIns} onChange={(e) => setForm((f) => ({ ...f, supportsWalkIns: e.target.checked }))} />
                  <label className="form-check-label">Walk-ins</label>
                </div>
              </div>
              <div className="col-md-2">
                <div className="form-check form-switch mt-4">
                  <input className="form-check-input" type="checkbox" checked={form.emergencyOverrideAllowed} onChange={(e) => setForm((f) => ({ ...f, emergencyOverrideAllowed: e.target.checked }))} />
                  <label className="form-check-label">Emergency override</label>
                </div>
              </div>
            </div>
            <div className="mt-4 d-flex gap-2">
              <button type="submit" className="btn btn-primary radius-12" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
              <Link href={`/owner/clinic/${branchId}/rooms/${roomId}`} className="btn btn-outline-secondary radius-12">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
