"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Package } from "lucide-react";
import { API_BASE_URL } from "@/lib/constants";
import { useAuthStore } from "@/lib/auth";

interface Location {
  id: number;
  name: string;
  type: string;
  branchId: number;
}

interface Variant {
  id: number;
  sku: string;
  title: string;
  product: {
    id: number;
    name: string;
  };
}

interface Lot {
  id: number;
  lotCode: string;
  expDate: string;
  onHandQty: number;
}

interface LineItem {
  id: string;
  variantId: number;
  variant: Variant | null;
  lotId: number | null;
  lot: Lot | null;
  quantity: number;
  unitCost: number;
  note: string;
}

const reasonOptions = [
  { value: "DAMAGE", label: "Damage" },
  { value: "THEFT", label: "Theft" },
  { value: "OBSOLETE", label: "Obsolete" },
  { value: "SAMPLE", label: "Sample" },
  { value: "OTHER", label: "Other" },
];

export default function NewWriteOffRequestPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId") || user?.ownedOrg?.id;

  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [lines, setLines] = useState<LineItem[]>([]);

  // For adding new line
  const [variantSearch, setVariantSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Variant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [availableLots, setAvailableLots] = useState<Lot[]>([]);
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [quantity, setQuantity] = useState<string>("");
  const [unitCost, setUnitCost] = useState<string>("");
  const [lineNote, setLineNote] = useState<string>("");

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedVariant && selectedLocation) {
      fetchLots(selectedVariant.id);
    }
  }, [selectedVariant, selectedLocation]);

  async function fetchLocations() {
    if (!orgId) return;
    setLoadingLocations(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/inventory/locations?orgId=${orgId}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (data.success) {
        setLocations(data.data || []);
      }
    } catch (err) {
      toast.error("Failed to load locations");
    } finally {
      setLoadingLocations(false);
    }
  }

  async function searchVariants(query: string) {
    if (!orgId || query.length < 2) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/inventory/variants/search?orgId=${orgId}&q=${encodeURIComponent(query)}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data?.items || []);
      }
    } catch (err) {
      console.error("Error searching variants:", err);
    }
  }

  async function fetchLots(variantId: number) {
    if (!selectedLocation) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/inventory/lots?locationId=${selectedLocation}&variantId=${variantId}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (data.success) {
        setAvailableLots(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching lots:", err);
    }
  }

  function addLine() {
    if (!selectedVariant || !quantity || parseInt(quantity) <= 0) {
      toast.error("Please select a variant and enter a valid quantity");
      return;
    }

    const maxQty = selectedLot?.onHandQty || 999999;
    const qty = parseInt(quantity);

    if (qty > maxQty) {
      toast.error(`Quantity exceeds available stock (${maxQty})`);
      return;
    }

    const newLine: LineItem = {
      id: Math.random().toString(36).substr(2, 9),
      variantId: selectedVariant.id,
      variant: selectedVariant,
      lotId: selectedLot?.id || null,
      lot: selectedLot,
      quantity: qty,
      unitCost: unitCost ? parseFloat(unitCost) : 0,
      note: lineNote,
    };

    setLines([...lines, newLine]);

    // Reset line form
    setSelectedVariant(null);
    setSelectedLot(null);
    setQuantity("");
    setUnitCost("");
    setLineNote("");
    setVariantSearch("");
    setSearchResults([]);
    setAvailableLots([]);
  }

  function removeLine(id: string) {
    setLines(lines.filter((l) => l.id !== id));
  }

  async function handleSubmit() {
    if (!orgId || !selectedLocation || !reason || lines.length === 0) {
      toast.error("Please fill in all required fields and add at least one line item");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        orgId: parseInt(orgId),
        locationId: parseInt(selectedLocation),
        reason,
        note: note || undefined,
        lines: lines.map((l) => ({
          variantId: l.variantId,
          lotId: l.lotId,
          quantity: l.quantity,
          unitCost: l.unitCost || undefined,
          note: l.note || undefined,
        })),
      };

      const res = await fetch(
        `${API_BASE_URL}/api/v1/inventory/write-off-requests`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();

      if (data.success) {
        toast.success(data.message || "Write-off request created successfully");
        router.push("/owner/inventory/write-offs");
      } else {
        toast.error(data.message || "Failed to create write-off request");
      }
    } catch (err) {
      toast.error("Error creating write-off request");
    } finally {
      setSubmitting(false);
    }
  }

  const totalQty = lines.reduce((sum, l) => sum + l.quantity, 0);
  const totalCost = lines.reduce((sum, l) => sum + (l.quantity * l.unitCost), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/owner/inventory/write-offs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Write-Off Request</h1>
          <p className="text-muted-foreground">
            Create a request to write off damaged, stolen, or obsolete stock
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
              <CardDescription>
                Select the location and reason for the write-off
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Select
                  value={selectedLocation}
                  onValueChange={setSelectedLocation}
                  disabled={loadingLocations}
                >
                  <SelectTrigger id="location">
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id.toString()}>
                        {loc.name} ({loc.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason *</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="reason">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {reasonOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Notes</Label>
                <Textarea
                  id="note"
                  placeholder="Additional details about this write-off..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add Line Item</CardTitle>
              <CardDescription>Select variant and quantity to write off</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Variant Search */}
              <div className="space-y-2">
                <Label>Search Variant *</Label>
                <Input
                  placeholder="Type SKU or product name..."
                  value={variantSearch}
                  onChange={(e) => {
                    setVariantSearch(e.target.value);
                    searchVariants(e.target.value);
                  }}
                />
                {searchResults.length > 0 && !selectedVariant && (
                  <div className="border rounded-md mt-1 max-h-40 overflow-auto">
                    {searchResults.map((v) => (
                      <button
                        key={v.id}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                        onClick={() => {
                          setSelectedVariant(v);
                          setVariantSearch(`${v.product.name} - ${v.title}`);
                          setSearchResults([]);
                        }}
                      >
                        <span className="font-medium">{v.product.name}</span>
                        <span className="text-muted-foreground ml-2">({v.sku})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lot Selection */}
              {selectedVariant && availableLots.length > 0 && (
                <div className="space-y-2">
                  <Label>Select Lot (Optional)</Label>
                  <Select
                    value={selectedLot?.id.toString() || ""}
                    onValueChange={(v) => {
                      const lot = availableLots.find((l) => l.id.toString() === v);
                      setSelectedLot(lot || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a lot (or leave blank for non-lot items)" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLots.map((lot) => (
                        <SelectItem key={lot.id} value={lot.id.toString()}>
                          {lot.lotCode} (Exp: {new Date(lot.expDate).toLocaleDateString()}) -{" "}
                          {lot.onHandQty} available
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Quantity & Cost */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max={selectedLot?.onHandQty || undefined}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                  />
                  {selectedLot && (
                    <p className="text-xs text-muted-foreground">
                      Available: {selectedLot.onHandQty}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitCost">Unit Cost</Label>
                  <Input
                    id="unitCost"
                    type="number"
                    step="0.01"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lineNote">Line Note</Label>
                <Input
                  id="lineNote"
                  value={lineNote}
                  onChange={(e) => setLineNote(e.target.value)}
                  placeholder="Details about this item..."
                />
              </div>

              <Button
                type="button"
                variant="secondary"
                onClick={addLine}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add to Request
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Summary</CardTitle>
              <CardDescription>
                Review items before submitting
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No items added yet</p>
                  <p className="text-sm">Add line items from the form on the left</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>
                            <div className="font-medium">
                              {line.variant?.product.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {line.variant?.title}
                              {line.lot && <span className="ml-1">({line.lot.lotCode})</span>}
                            </div>
                          </TableCell>
                          <TableCell>{line.quantity}</TableCell>
                          <TableCell>
                            {line.unitCost > 0
                              ? `$${(line.quantity * line.unitCost).toFixed(2)}`
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLine(line.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Items:</span>
                      <span>{lines.length}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-medium">Total Quantity:</span>
                      <span>{totalQty} units</span>
                    </div>
                    {totalCost > 0 && (
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-medium">Total Cost:</span>
                        <span>${totalCost.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Link href="/owner/inventory/write-offs" className="flex-1">
              <Button variant="outline" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={submitting || lines.length === 0 || !reason || !selectedLocation}
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
