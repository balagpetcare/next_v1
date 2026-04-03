/**
 * Branch administration helpers: status resolution, capability parsing, KPI computation
 */

export type BranchStatus = 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'INACTIVE' | 'BLOCKED'

export type AdminBranchListRow = {
  id: number
  orgId: number
  name: string
  code?: string | null
  status: BranchStatus
  verificationStatus?: string
  capabilitiesJson?: unknown
  featuresJson?: unknown
  location?: unknown
  addressJson?: unknown
  createdAt?: string
  updatedAt?: string
  org?: {
    id: number
    name: string
    ownerUserId?: number
    status?: string
  }
  typeLinks?: Array<{
    isPrimary?: boolean
    branchType?: {
      id: number
      code: string
      nameEn?: string
      nameBn?: string
    }
  }>
}

export type BranchStatusInfo = {
  label: string
  variant: 'success' | 'secondary' | 'warning' | 'danger' | 'info'
}

/**
 * Resolve branch lifecycle status to UI label and badge variant
 */
export function resolveBranchLifecycleStatus(status: BranchStatus | string): BranchStatusInfo {
  const s = String(status).toUpperCase()
  
  switch (s) {
    case 'ACTIVE':
      return { label: 'Active', variant: 'success' }
    case 'INACTIVE':
      return { label: 'Inactive', variant: 'secondary' }
    case 'PENDING_REVIEW':
      return { label: 'Pending Review', variant: 'warning' }
    case 'DRAFT':
      return { label: 'Draft', variant: 'secondary' }
    case 'BLOCKED':
      return { label: 'Blocked', variant: 'danger' }
    default:
      return { label: s, variant: 'secondary' }
  }
}

/**
 * Parse capabilitiesJson from various formats into a normalized object
 */
export function parseCapabilitiesJson(value: unknown): Record<string, boolean> {
  if (!value) return {}
  
  // Already an object map
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, boolean>
  }
  
  // Legacy array format: [{ capability: "clinic" }, ...]
  if (Array.isArray(value)) {
    const result: Record<string, boolean> = {}
    value.forEach((item: any) => {
      const key = typeof item === 'string' ? item : item?.capability
      if (key) result[key] = true
    })
    return result
  }
  
  return {}
}

/**
 * List enabled capability keys from capabilitiesJson
 */
export function listEnabledCapabilityKeys(capabilitiesJson: unknown): string[] {
  const caps = parseCapabilitiesJson(capabilitiesJson)
  return Object.entries(caps)
    .filter(([_key, enabled]) => enabled === true)
    .map(([key]) => key)
}

/**
 * Check if clinic capability is enabled (via featuresJson.clinicEnabled or capabilitiesJson)
 */
export function isClinicEnabledBranch(row: AdminBranchListRow): boolean {
  // Check featuresJson.clinicEnabled first
  if (row.featuresJson && typeof row.featuresJson === 'object' && !Array.isArray(row.featuresJson)) {
    const features = row.featuresJson as Record<string, unknown>
    if (features.clinicEnabled === true) return true
  }
  
  // Check capabilitiesJson
  const caps = parseCapabilitiesJson(row.capabilitiesJson)
  return caps.clinic === true || caps.clinicEnabled === true
}

/**
 * Check if shop capability is enabled
 */
export function isShopEnabled(row: AdminBranchListRow): boolean {
  const caps = parseCapabilitiesJson(row.capabilitiesJson)
  return caps.shop === true || caps.shopEnabled === true
}

/**
 * Check if online_sales capability is enabled
 */
export function isOnlineSalesEnabled(row: AdminBranchListRow): boolean {
  const caps = parseCapabilitiesJson(row.capabilitiesJson)
  return caps.online_sales === true || caps.onlineSalesEnabled === true
}

/**
 * Human-readable capability labels
 */
export const CAPABILITY_LABELS: Record<string, string> = {
  clinic: 'Clinic',
  shop: 'Shop',
  online_sales: 'Online Sales',
  delivery_hub: 'Delivery Hub',
  hq_warehouse: 'HQ Warehouse',
  // Add more as they appear in real data
}

/**
 * Get human-readable label for a capability key
 */
export function getCapabilityLabel(key: string): string {
  return CAPABILITY_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export type BranchKpis = {
  total: number
  active: number
  inactive: number
  clinic: number
  shop: number
  onlineSales: number
}

/**
 * Compute KPI summary from loaded branches
 */
export function computeBranchKpis(branches: AdminBranchListRow[]): BranchKpis {
  return {
    total: branches.length,
    active: branches.filter(b => b.status === 'ACTIVE').length,
    inactive: branches.filter(b => b.status === 'INACTIVE' || b.status === 'DRAFT' || b.status === 'BLOCKED').length,
    clinic: branches.filter(isClinicEnabledBranch).length,
    shop: branches.filter(isShopEnabled).length,
    onlineSales: branches.filter(isOnlineSalesEnabled).length,
  }
}

/**
 * Format branch address summary from location or addressJson
 */
export function formatBranchAddressSummary(row: AdminBranchListRow): string {
  // Prefer location.address (standardized per schema)
  if (row.location && typeof row.location === 'object') {
    const loc = row.location as Record<string, unknown>
    if (loc.address && typeof loc.address === 'string') {
      return loc.address
    }
  }
  
  // Fall back to addressJson
  if (row.addressJson) {
    if (typeof row.addressJson === 'string') {
      return row.addressJson
    }
    if (typeof row.addressJson === 'object' && !Array.isArray(row.addressJson)) {
      const addr = row.addressJson as Record<string, unknown>
      // Try common address field names
      if (addr.address && typeof addr.address === 'string') return addr.address
      if (addr.street && typeof addr.street === 'string') return addr.street
      if (addr.line1 && typeof addr.line1 === 'string') return addr.line1
    }
  }
  
  return '—'
}
