"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Package, AlertTriangle, RefreshCw, BarChart3 } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/constants";

export default function InventoryAnalyticsPage() {
  const { user } = useAuthStore();
  const orgId = (user as any)?.ownedOrg?.id;

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(fmt(thirtyDaysAgo));
  const [toDate, setToDate] = useState(fmt(today));
  const [locationId, setLocationId] = useState("");

  const [movementSummary, setMovementSummary] = useState(null as any);
  const [turnover, setTurnover] = useState(null as any);
  const [abc, setAbc] = useState(null as any);
  const [deadStock, setDeadStock] = useState(null as any);
  const [loadingTab, setLoadingTab] = useState("");

  async function fetchTab(tab: string) {
    if (!orgId) return;
    setLoadingTab(tab);
    try {
      const base = `${API_BASE_URL}/api/v1/inventory/analytics`;
      const q = new URLSearchParams({ orgId: String(orgId), fromDate, toDate });
      if (locationId) q.append("locationId", locationId);

      if (tab === "movement") {
        const r = await fetch(`${base}/movement-summary?${q}`, { credentials: "include" });
        const d = await r.json();
        if (d.success) setMovementSummary(d.data); else toast.error(d.message);
      } else if (tab === "turnover") {
        const r = await fetch(`${base}/stock-turnover?${q}`, { credentials: "include" });
        const d = await r.json();
        if (d.success) setTurnover(d.data); else toast.error(d.message);
      } else if (tab === "abc") {
        const r = await fetch(`${base}/abc-analysis?${q}`, { credentials: "include" });
        const d = await r.json();
        if (d.success) setAbc(d.data); else toast.error(d.message);
      } else if (tab === "dead") {
        const dq = new URLSearchParams({ orgId: String(orgId) });
        if (locationId) dq.append("locationId", locationId);
        const r = await fetch(`${base}/dead-stock?${dq}`, { credentials: "include" });
        const d = await r.json();
        if (d.success) setDeadStock(d.data); else toast.error(d.message);
      }
    } catch { toast.error("Failed to load analytics"); }
    finally { setLoadingTab(""); }
  }

  useEffect(() => { if (orgId) fetchTab("movement"); }, [orgId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory Analytics</h1>
        <p className="text-muted-foreground">Movement summary, turnover, ABC analysis & dead stock</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label>From Date</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label>To Date</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label>Location ID (optional)</Label>
              <Input type="number" placeholder="All locations" value={locationId} onChange={(e) => setLocationId(e.target.value)} className="w-40" />
            </div>
            <Button onClick={() => { fetchTab("movement"); fetchTab("turnover"); fetchTab("abc"); fetchTab("dead"); }}>
              <RefreshCw className="mr-2 h-4 w-4" />Refresh All
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="movement" onValueChange={fetchTab}>
        <TabsList>
          <TabsTrigger value="movement"><BarChart3 className="mr-2 h-4 w-4" />Movement</TabsTrigger>
          <TabsTrigger value="turnover"><TrendingUp className="mr-2 h-4 w-4" />Turnover</TabsTrigger>
          <TabsTrigger value="abc"><TrendingDown className="mr-2 h-4 w-4" />ABC Analysis</TabsTrigger>
          <TabsTrigger value="dead"><AlertTriangle className="mr-2 h-4 w-4" />Dead Stock</TabsTrigger>
        </TabsList>

        {/* Movement Summary */}
        <TabsContent value="movement">
          {loadingTab === "movement" ? <p className="text-center py-8">Loading...</p> : movementSummary ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { label: "Total Inbound", value: movementSummary.totalInbound, icon: TrendingUp, color: "text-green-600" },
                  { label: "Total Outbound", value: movementSummary.totalOutbound, icon: TrendingDown, color: "text-red-600" },
                  { label: "Adjustments", value: movementSummary.totalAdjustments, icon: Package, color: "text-blue-600" },
                  { label: "COGS", value: `$${movementSummary.totalCOGS.toFixed(2)}`, icon: BarChart3, color: "text-purple-600" },
                ].map((m) => (
                  <Card key={m.label}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">{m.label}</CardTitle>
                      <m.icon className={`h-4 w-4 ${m.color}`} />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{m.value}</div></CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardHeader><CardTitle>By Movement Type</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Qty</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {Object.entries(movementSummary.byType || {}).sort(([,a],[,b]) => (b as number) - (a as number)).map(([type, qty]) => (
                        <TableRow key={type}>
                          <TableCell><Badge variant="outline">{type}</Badge></TableCell>
                          <TableCell className="font-medium">{String(qty)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          ) : <p className="text-center py-8 text-muted-foreground">No data loaded. Click Refresh.</p>}
        </TabsContent>

        {/* Stock Turnover */}
        <TabsContent value="turnover">
          {loadingTab === "turnover" ? <p className="text-center py-8">Loading...</p> : turnover ? (
            <Card>
              <CardHeader><CardTitle>Stock Turnover Report</CardTitle><CardDescription>{turnover.totalItems} variants</CardDescription></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Sold Qty</TableHead>
                      <TableHead>On Hand</TableHead>
                      <TableHead>COGS</TableHead>
                      <TableHead>Turnover Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(turnover.items || []).map((item: any) => (
                      <TableRow key={item.variantId}>
                        <TableCell>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">{item.variantTitle}</p>
                        </TableCell>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell>{item.soldQty}</TableCell>
                        <TableCell>{item.currentOnHand}</TableCell>
                        <TableCell>${item.cogs.toFixed(2)}</TableCell>
                        <TableCell>
                          {item.turnoverRate !== null ? (
                            <Badge className={item.turnoverRate >= 2 ? "bg-green-100 text-green-800" : item.turnoverRate >= 0.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}>
                              {item.turnoverRate}x
                            </Badge>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : <p className="text-center py-8 text-muted-foreground">No data loaded. Click Refresh.</p>}
        </TabsContent>

        {/* ABC Analysis */}
        <TabsContent value="abc">
          {loadingTab === "abc" ? <p className="text-center py-8">Loading...</p> : abc ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total COGS</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">${abc.grandTotalCOGS?.toFixed(2)}</div></CardContent></Card>
                {["A","B","C"].map((cat) => (
                  <Card key={cat}>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Category {cat}</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{abc.summary?.[cat] ?? 0} items</div></CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardHeader><CardTitle>ABC Classification</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>COGS</TableHead><TableHead>% of Total</TableHead><TableHead>Cumulative %</TableHead><TableHead>Category</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(abc.items || []).map((item: any) => (
                        <TableRow key={item.variantId}>
                          <TableCell>
                            <p className="font-medium">{item.variant?.product?.name}</p>
                            <p className="text-xs text-muted-foreground">{item.variant?.sku}</p>
                          </TableCell>
                          <TableCell>${item.cogs.toFixed(2)}</TableCell>
                          <TableCell>{item.pct}%</TableCell>
                          <TableCell>{item.cumPct}%</TableCell>
                          <TableCell>
                            <Badge className={item.category === "A" ? "bg-green-100 text-green-800" : item.category === "B" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}>
                              {item.category}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          ) : <p className="text-center py-8 text-muted-foreground">No data loaded. Click Refresh.</p>}
        </TabsContent>

        {/* Dead Stock */}
        <TabsContent value="dead">
          {loadingTab === "dead" ? <p className="text-center py-8">Loading...</p> : deadStock ? (
            <Card>
              <CardHeader><CardTitle>Dead Stock</CardTitle><CardDescription>{deadStock.totalItems} variants with no sales in 90+ days</CardDescription></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>On Hand</TableHead><TableHead>Last Sale</TableHead><TableHead>Days Since Sale</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(deadStock.items || []).map((item: any) => (
                      <TableRow key={item.variantId}>
                        <TableCell>
                          <p className="font-medium">{item.variant?.product?.name}</p>
                          <p className="text-xs text-muted-foreground">{item.variant?.sku}</p>
                        </TableCell>
                        <TableCell>{item.totalOnHand}</TableCell>
                        <TableCell>{item.lastSaleAt ? new Date(item.lastSaleAt).toLocaleDateString() : "Never"}</TableCell>
                        <TableCell>
                          <Badge className={!item.daysSinceLastSale ? "bg-red-100 text-red-800" : item.daysSinceLastSale > 180 ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}>
                            {item.daysSinceLastSale ?? "Never sold"}d
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : <p className="text-center py-8 text-muted-foreground">No data loaded. Click Refresh.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
