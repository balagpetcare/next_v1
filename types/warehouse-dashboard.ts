/**
 * Warehouse Staff Dashboard Type Contracts
 * Shared types for backend/frontend alignment
 */

export type BadgeTone = "success" | "warning" | "danger" | "primary" | "secondary" | "info";

export type WarehouseRole =
  | "WAREHOUSE_MANAGER"
  | "SUPERVISOR"
  | "INVENTORY_CONTROLLER"
  | "RECEIVING_STAFF"
  | "PICKING_STAFF"
  | "PACKING_STAFF"
  | "DISPATCH_STAFF"
  | "RETURNS_STAFF"
  | "BRANCH_STAFF";

export type QueueStatus =
  | "ASSIGNED"
  | "SUBMITTED"
  | "OWNER_REVIEW"
  | "PICKING"
  | "EN_ROUTE"
  | "PACKED"
  | "IN_TRANSIT"
  | "APPROVED"
  | "COMPLETED"
  | "RECEIVED"
  | "FULFILLED_FULL"
  | "FAILED"
  | "REJECTED"
  | "CANCELLED"
  | "ARRIVED"
  | "CREATED"
  | "DRAFT";

export type AlertSeverity = "critical" | "high" | "medium" | "low";

export interface WarehouseContext {
  id: number;
  orgId: number;
  name: string;
  type?: string;
  manager?: {
    id: number;
    profile?: { displayName?: string };
  };
}

export interface BranchContext {
  branchId: number | null;
  branchName: string | null;
  branchType: string | null;
  isWarehouseFlow: boolean;
}

export interface UserContext {
  userId: number;
  role: string;
  roleLabel: string;
  permissions: string[];
  permissionFlags: {
    canManageWarehouse: boolean;
    canReceive: boolean;
    canDispatch: boolean;
    canAssignTasks: boolean;
    canAdjustStock: boolean;
    canAudit: boolean;
  };
}

export interface KpiSummary {
  totalLocations: number;
  myOpenTasks: number;
  pendingStockRequests: number;
  transferQueue: number;
  receivingQueue: number;
  dispatchQueue: number;
  lowStockAlerts: number;
  nearExpiryAlerts: number;
  damagedOrShortAlerts: number;
  /** Expired lot rows still on hand at linked locations (summary metric; distinct from near-expiry). */
  expiredOnHandLotRows?: number;
  holdStockAlerts: number;
}

export interface AlertItem {
  key: string;
  label: string;
  count: number;
  severity: AlertSeverity;
}

export interface MyTaskItem {
  id: number;
  type: string;
  status: string;
  priority: AlertSeverity;
  title: string;
  reference: string | null;
  from: string | null;
  to: string | null;
  itemCount: number;
  assignedAt: string;
  href: string | null;
}

export interface RequestQueueItem {
  id: number;
  status: QueueStatus;
  branch?: { id: number; name: string };
  items?: unknown[];
  dispatches?: unknown[];
  _meta?: {
    lineCount: number;
    dispatchCount: number;
  };
  /** Set when loaded from warehouse operations dashboard (enterprise routing). */
  warehouseAction?: { openHref: string; nextActionLabel: string } | null;
}

export interface TransferQueueItem {
  id: number;
  status: QueueStatus;
  fromLocation: string | null;
  toLocation: string | null;
  lineCount: number;
  requestedQtyTotal: number;
  updatedAt: string;
}

export interface ReceivingQueueItem {
  id: number;
  status: QueueStatus;
  location?: { id: number; name: string; type?: string; warehouseId?: number };
  locationName?: string;
  lines?: unknown[];
  vendor?: { id: number; name: string };
}

export interface DispatchQueueItem {
  id: number;
  status: QueueStatus;
  toLocation?: { id: number; name: string };
  toLocationName?: string;
  items?: unknown[];
  stockRequest?: { id: number };
}

export interface QueuePagination {
  items: unknown[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InventoryHealth {
  lowStockItems: Array<{
    id: number;
    onHandQty: number;
    location?: { id: number; name: string };
    variant?: { id: number; sku: string; title: string; barcode?: string };
  }>;
  nearExpiryCount: number;
  expiredCount: number;
  quarantineOnHand: number;
  writeOffsLast30d: number;
  recallsWithStock: number;
}

export interface ActivityTimelineItem {
  id: number;
  timestamp: string;
  category: string;
  action: string;
  entityType: string;
  entityId: number;
  actorName: string;
  metadata: Record<string, unknown>;
}

export interface ShiftHandoverNote {
  id: number;
  action: string;
  note: string | null;
  createdAt: string;
  actorName: string;
}

export interface QuickAction {
  key: string;
  label: string;
  href: string | null;
  requiredAny: string[];
  allowed: boolean;
}

export interface SearchResults {
  query: string;
  products: Array<{ id: number; sku: string; title: string; barcode?: string }>;
  batches: Array<{
    id: number;
    lotCode: string;
    expDate?: string;
    variant?: { id: number; sku: string; title: string };
  }>;
  locations: Array<{ id: number; name: string; code?: string; type?: string }>;
  requests: Array<{ id: number; status: string; createdAt: string; branch?: { id: number; name: string } }>;
  transfers: Array<{
    id: number;
    status: string;
    updatedAt: string;
    fromLocation?: { id: number; name: string };
    toLocation?: { id: number; name: string };
  }>;
}

export interface WarehouseStaffDashboardData {
  warehouse: WarehouseContext;
  branchContext: BranchContext;
  userContext: UserContext;
  kpis: KpiSummary;
  queues: {
    myTasks: { items: MyTaskItem[]; total: number; page?: number; pageSize?: number };
    pendingRequests: QueuePagination;
    transferQueue: QueuePagination;
    receivingQueue: QueuePagination;
    dispatchQueue: QueuePagination;
  };
  inventoryHealth: InventoryHealth;
  alerts: AlertItem[];
  activityTimeline: ActivityTimelineItem[];
  shiftHandoverNotes: ShiftHandoverNote[];
  quickActions: QuickAction[];
  searchResults: SearchResults;
}

export interface BranchCandidate {
  branchId: number;
  branchName: string;
  branchType: string;
  role: string;
  status: string;
}
