/**
 * Producer Governance Phase 2: API helpers for backend DTO envelopes.
 * Backend returns { success, code, message, traceId, data } (Appendix A).
 */

const API_BASE = '/api/v1'

export type Envelope<T> = {
  success: boolean
  code?: string
  message?: string
  traceId?: string
  data?: T
  requiredPermission?: string
  requiredPermissions?: string[]
  details?: Record<string, unknown>
}

/** Human-friendly message for known error codes. */
export function messageForCode(code: string, fallback: string): string {
  const map: Record<string, string> = {
    ORG_SUSPENDED: 'This producer organization is suspended.',
    ORG_NOT_FOUND: 'Producer organization not found.',
    FLAG_DISABLED: 'This feature is disabled for the producer.',
    QUOTA_EXCEEDED: 'Quota exceeded. Try again later or contact support.',
    KYC_REQUIRED: 'Producer must complete KYC before this action.',
    NOT_FOUND: 'Resource not found.',
    REASON_REQUIRED: 'Rejection reason is required (min 5 characters).',
    NOT_PENDING: 'This approval was already processed. Refresh the list.',
    INVALID_STATE: "This product's status does not allow this action. Refresh the page to see the current state.",
    SERVER_ERROR: 'Server error. Please try again.',
    BATCH_FROZEN: 'Batch is frozen by admin. Unfreeze to allow print/export/allocate.',
    CODES_ALREADY_VERIFIED: 'Cannot void: some codes are already verified.',
    BATCH_NOT_APPROVED: 'Batch must be approved before code generation.',
    COMPLIANCE_FAILED: 'Product compliance checks failed. Use override to approve anyway.',
    BATCH_QUARANTINED: 'Batch is quarantined by admin.',
    ENFORCEMENT_HOLD: 'Blocked by an active enforcement case. Resolve or revert the enforcement action first.',
  }
  return map[code] ?? fallback
}

function getRequiredPermissions(body: Envelope<unknown>): string[] {
  if (Array.isArray(body?.requiredPermissions)) {
    return body.requiredPermissions.map((x) => String(x)).filter(Boolean)
  }
  if (body?.requiredPermission) return [String(body.requiredPermission)]
  return []
}

function buildErrorMessage(status: number, body: Envelope<unknown>): string {
  const raw = body?.message ?? messageForCode(body?.code ?? '', `Request failed (${status})`)
  if (status === 404 && String(raw).includes('Route not found')) {
    return 'Governance API is not available. Restart the backend API (port 3000) and ensure admin governance routes are enabled.'
  }
  if (status === 403) {
    const required = getRequiredPermissions(body)
    if (required.length === 1) return `${raw} Missing permission: ${required[0]}`
    if (required.length > 1) return `${raw} Missing one of: ${required.join(' | ')}`
  }
  return raw
}

export async function getGovernance<T>(path: string): Promise<Envelope<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  const body = (await res.json().catch(() => ({}))) as Envelope<T>
  if (!res.ok) {
    throw new Error(buildErrorMessage(res.status, body))
  }
  return body
}

export async function postGovernance<T>(path: string, body?: unknown): Promise<Envelope<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = (await res.json().catch(() => ({}))) as Envelope<T>
  if (!res.ok) {
    throw new Error(buildErrorMessage(res.status, json))
  }
  return json
}

export async function putGovernance<T>(path: string, body?: unknown): Promise<Envelope<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = (await res.json().catch(() => ({}))) as Envelope<T>
  if (!res.ok) {
    throw new Error(buildErrorMessage(res.status, json))
  }
  return json
}

export async function patchGovernance<T>(path: string, body?: unknown): Promise<Envelope<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = (await res.json().catch(() => ({}))) as Envelope<T>
  if (!res.ok) {
    throw new Error(buildErrorMessage(res.status, json))
  }
  return json
}

// ——— Governance Products ———

export type GovernanceProductStatus =
  | 'ALL'
  | 'UNAPPROVED'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'DECLINED'
  | 'REJECTED'

export type GovernanceProductItem = {
  productId: number
  name: string
  sku: string
  producerOrgId: number
  producerOrgName: string
  currentStatus: Exclude<GovernanceProductStatus, 'ALL'>
  status?: string
  submittedAt: string | null
  reviewedAt: string | null
  reviewedBy: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ListGovernanceProductsParams = {
  status?: GovernanceProductStatus
  producerOrgId?: string | number | null
  q?: string | null
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'name'
  sortDir?: 'asc' | 'desc'
}

export type ListGovernanceProductsResult = {
  items: GovernanceProductItem[]
  page: number
  limit: number
  total: number
  facets: { statusCounts: Record<Exclude<GovernanceProductStatus, 'ALL'>, number> }
}

export async function listGovernanceProducts(
  params: ListGovernanceProductsParams
): Promise<Envelope<ListGovernanceProductsResult>> {
  const search = new URLSearchParams()
  if (params.status && params.status !== 'ALL') search.set('status', params.status)
  if (params.producerOrgId != null && params.producerOrgId !== '') search.set('producerOrgId', String(params.producerOrgId))
  if (params.q) search.set('q', params.q)
  if (params.page != null) search.set('page', String(params.page))
  if (params.limit != null) search.set('limit', String(params.limit))
  if (params.sortBy) search.set('sortBy', params.sortBy)
  if (params.sortDir) search.set('sortDir', params.sortDir)
  return getGovernance<ListGovernanceProductsResult>(`/admin/governance/products?${search}`)
}

export async function getGovernanceProduct(productId: number): Promise<Envelope<Record<string, unknown>>> {
  return getGovernance<Record<string, unknown>>(`/admin/governance/products/${productId}`)
}

export type ActOnGovernanceProductBody = {
  action: 'APPROVE' | 'DECLINE' | 'REJECT' | 'RESET_TO_UNAPPROVED' | 'PUBLISH' | 'UNPUBLISH'
  note?: string
}

export async function actOnGovernanceProduct(
  productId: number,
  body: ActOnGovernanceProductBody
): Promise<Envelope<{ success: boolean; message: string }>> {
  return postGovernance<{ success: boolean; message: string }>(`/admin/governance/products/${productId}/actions`, body)
}

// ——— Trust & Safety / Enforcement cases ———

export type EnforcementCaseRow = {
  id: number
  caseNo: string
  source: string
  entityType: string
  entityId: string
  producerOrgId: number
  status: string
  severity: string
  summary: string
  details?: string | null
  assignedToUserId?: number | null
  resolvedAt?: string | null
  resolvedByUserId?: number | null
  resolutionNote?: string | null
  createdByUserId: number
  createdAt: string
  updatedAt: string
  producerOrg?: { id: number; name: string } | null
}

export type EnforcementCaseStats = {
  total: number
  open: number
  investigating: number
  actioned: number
  resolved: number
  rejected: number
  critical: number
}

export type EnforcementCasesListPayload = {
  data: EnforcementCaseRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type EnforcementCaseDetail = EnforcementCaseRow & {
  evidence?: Array<{ id: number; type: string; url?: string | null; note?: string | null; createdAt: string }>
  actions?: Array<{
    id: number
    targetType: string
    targetId: string
    actionType: string
    reason: string
    status: string
    appliedByUserId: number
    appliedAt: string
    revertedByUserId?: number | null
    revertedAt?: string | null
    revertNote?: string | null
  }>
  trace?: {
    code?: { id: number; status: string } | null
    batch?: { id: number; batchNo: string; status: string; frozenAt?: string | null; quarantinedAt?: string | null } | null
    product?: { id: number; productName: string; sku: string; status: string } | null
    producerOrg?: { id: number; name: string; status: string } | null
  } | null
}

export async function getEnforcementCasesStats(): Promise<Envelope<EnforcementCaseStats>> {
  return getGovernance<EnforcementCaseStats>('/admin/enforcement/cases/stats')
}

export async function listEnforcementCases(params: {
  entityType?: string
  orgId?: string | number
  producerOrgId?: string | number
  status?: string
  severity?: string
  q?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}): Promise<Envelope<EnforcementCasesListPayload>> {
  const search = new URLSearchParams()
  if (params.entityType) search.set('entityType', params.entityType)
  if (params.producerOrgId != null && params.producerOrgId !== '') search.set('producerOrgId', String(params.producerOrgId))
  if (params.orgId != null && params.orgId !== '') search.set('orgId', String(params.orgId))
  if (params.status) search.set('status', params.status)
  if (params.severity) search.set('severity', params.severity)
  if (params.q) search.set('q', params.q)
  if (params.dateFrom) search.set('dateFrom', params.dateFrom)
  if (params.dateTo) search.set('dateTo', params.dateTo)
  if (params.page != null) search.set('page', String(params.page))
  if (params.limit != null) search.set('limit', String(params.limit))
  return getGovernance<EnforcementCasesListPayload>(`/admin/enforcement/cases?${search}`)
}

export async function getEnforcementCase(id: number): Promise<Envelope<EnforcementCaseDetail>> {
  return getGovernance<EnforcementCaseDetail>(`/admin/enforcement/cases/${id}`)
}

export async function createEnforcementCase(body: {
  source?: string
  entityType: string
  entityId?: string | number
  producerOrgId: number
  severity?: string
  summary: string
  details?: string
}): Promise<Envelope<EnforcementCaseRow>> {
  return postGovernance<EnforcementCaseRow>('/admin/enforcement/cases', {
    ...body,
    entityId: body.entityId != null ? String(body.entityId) : undefined,
  })
}

export async function updateEnforcementCase(
  id: number,
  body: { status?: string; assignedToUserId?: number | null; severity?: string; resolutionNote?: string }
): Promise<Envelope<EnforcementCaseRow>> {
  return patchGovernance<EnforcementCaseRow>(`/admin/enforcement/cases/${id}`, body)
}

export async function addEnforcementCaseEvidence(
  caseId: number,
  body: { type: string; url?: string; note?: string }
): Promise<Envelope<{ id: number; type: string; url?: string | null; note?: string | null; createdAt: string }>> {
  return postGovernance(`/admin/enforcement/cases/${caseId}/evidence`, body)
}

export async function applyEnforcementAction(
  caseId: number,
  body: { actionType: string; targetType: string; targetId: string; reason: string; meta?: Record<string, unknown> }
): Promise<Envelope<Record<string, unknown>>> {
  return postGovernance(`/admin/enforcement/cases/${caseId}/actions`, body)
}

export async function revertEnforcementAction(
  actionId: number,
  body: { revertNote: string }
): Promise<Envelope<Record<string, unknown>>> {
  return postGovernance(`/admin/enforcement/actions/${actionId}/revert`, body)
}

export async function traceEnforcementByCode(code: string): Promise<
  Envelope<{ found: boolean; code?: unknown; batch?: unknown; product?: unknown; producerOrg?: unknown }>
> {
  return getGovernance(`/admin/enforcement/trace?code=${encodeURIComponent(code)}`)
}
