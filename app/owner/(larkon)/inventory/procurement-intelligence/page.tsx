"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ownerClinicBranches, getAiProcurementRecommendations, getAiForecast, getAiDemandTrend } from "@/app/owner/_lib/ownerApi";

export default function ProcurementIntelligencePage() {
  const [branches, setBranches] = useState<{ id: number; name?: string }[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [recs, setRecs] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any[]>([]);
  const [trend, setTrend] = useState<{ date: string; units: number }[]>([]);
  const [trendVariantId, setTrendVariantId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const r = await ownerClinicBranches();
      const list = (r as any)?.data ?? [];
      const mapped = Array.isArray(list)
        ? list.map((b: any) => ({ id: b.id ?? b.branchId, name: b.name ?? b.title }))
        : [];
      setBranches(mapped);
      if (mapped[0]?.id) setBranchId(mapped[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!branchId) return;
    (async () => {
      const pr = await getAiProcurementRecommendations({ branchId });
      const rows = (pr as any)?.data ?? [];
      setRecs(Array.isArray(rows) ? rows : []);
      const fc = await getAiForecast({ branchId, horizonDays: 14 });
      const fd = (fc as any)?.data ?? [];
      const arr = Array.isArray(fd) ? fd : [];
      setForecast(arr);
      const firstVid = arr[0]?.snapshot?.variantId as number | undefined;
      if (firstVid) setTrendVariantId(firstVid);
    })();
  }, [branchId]);

  useEffect(() => {
    if (!branchId || !trendVariantId) return;
    (async () => {
      const tr = await getAiDemandTrend({ branchId, variantId: trendVariantId, windowDays: 90 });
      const series = (tr as any)?.data?.series ?? [];
      setTrend(Array.isArray(series) ? series : []);
    })();
  }, [branchId, trendVariantId]);

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Procurement intelligence</h1>
        <p className="text-muted-foreground">Ranked vendor options with transparent weights — drafts only; no auto-PO.</p>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">Branch</span>
        <Select
          value={branchId ? String(branchId) : ""}
          onValueChange={(v) => setBranchId(Number(v))}
        >
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.name ?? `Branch ${b.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Demand trend (sample SKU)</CardTitle>
          <CardDescription>Daily consumption from ledger (Phase-4 simple model)</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px]">
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="units" stroke="hsl(var(--primary))" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm">No trend data for selected branch/SKU.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Forecast snapshots</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Forecast (units)</TableHead>
                <TableHead>Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forecast.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No snapshots. Run job:ai-forecast on the API host.
                  </TableCell>
                </TableRow>
              )}
              {forecast.map((row: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{row.snapshot?.variant?.sku ?? row.snapshot?.variantId}</TableCell>
                  <TableCell>{row.snapshot?.forecastUnits}</TableCell>
                  <TableCell>{row.snapshot?.confidence?.toFixed?.(2) ?? row.snapshot?.confidence}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendor rankings (cached)</CardTitle>
          <CardDescription>Weights: price, GRN reliability, returns — see API scoresJson</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variant</TableHead>
                <TableHead>Top vendor</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No procurement rows yet.
                  </TableCell>
                </TableRow>
              )}
              {recs.map((r: any) => {
                const ranked = Array.isArray(r.rankedVendorsJson)
                  ? r.rankedVendorsJson
                  : Array.isArray(r.rankedVendors)
                    ? r.rankedVendors
                    : [];
                const top = ranked[0];
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.variant?.sku ?? r.variantId}</TableCell>
                    <TableCell>{top?.vendorName ?? "—"}</TableCell>
                    <TableCell>{top?.score != null ? Number(top.score).toFixed(2) : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
