"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth";
import { getAiControlTowerOverview } from "@/app/owner/_lib/ownerApi";

export default function ControlTowerPage() {
  const { user } = useAuthStore();
  const orgId = (user as any)?.ownedOrg?.id as number | undefined;
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const res = await getAiControlTowerOverview({ orgId });
        const payload = (res as any)?.data ?? res;
        setData(payload);
      } catch (e: any) {
        setErr(e?.message || "Failed to load");
      }
    })();
  }, [orgId]);

  if (!orgId) {
    return <p className="text-muted-foreground p-4">Select an organization context to view the control tower.</p>;
  }

  const kpis = data?.kpis;
  const alerts = data?.alerts ?? [];
  const top = data?.topRecommendations ?? [];

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory control tower</h1>
        <p className="text-muted-foreground">Network KPIs, critical alerts, and top AI actions (explainable; no auto-purchase).</p>
        <p className="text-sm mt-2">
          <a className="text-primary underline" href="/owner/inventory/network-command">
            Open Wave-5 network command →
          </a>{" "}
          for unified cross-domain dashboards, recommendations, and scenarios.
        </p>
      </div>
      {err && <p className="text-destructive text-sm">{err}</p>}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Branches</CardDescription>
            <CardTitle className="text-2xl">{kpis?.branchesMonitored ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Forecast snapshots</CardDescription>
            <CardTitle className="text-2xl">{kpis?.forecastSnapshots ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Critical replenishment</CardDescription>
            <CardTitle className="text-2xl">{kpis?.criticalReplenishmentLines ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Low-confidence forecasts</CardDescription>
            <CardTitle className="text-2xl">{kpis?.lowConfidenceForecasts ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top recommendations</CardTitle>
          <CardDescription>Prioritized from open critical replenishment suggestions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No critical actions. Run forecast / replenishment jobs to populate data.
                  </TableCell>
                </TableRow>
              )}
              {top.map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{r.branchName ?? r.branchId}</TableCell>
                  <TableCell>{r.sku ?? r.variantId}</TableCell>
                  <TableCell>{r.suggestedQty}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Critical alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No alerts.
                  </TableCell>
                </TableRow>
              )}
              {alerts.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Badge variant={a.severity === "CRITICAL" ? "destructive" : "secondary"}>{a.severity}</Badge>
                  </TableCell>
                  <TableCell>{a.branchName ?? a.branchId}</TableCell>
                  <TableCell>{a.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
