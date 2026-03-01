/**
 * Admin support tickets API. Backend returns { success, data, message, traceId }.
 */

const API_BASE = '/api/v1'

type Envelope<T> = {
  success: boolean
  code?: string
  message?: string
  traceId?: string
  data?: T
}

async function getSupport<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  const body = (await res.json().catch(() => ({}))) as Envelope<T>
  if (!res.ok) {
    throw new Error(body?.message ?? `Request failed (${res.status})`)
  }
  return body?.data as T
}

async function patchSupport<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  const envelope = (await res.json().catch(() => ({}))) as Envelope<T>
  if (!res.ok) {
    throw new Error(envelope?.message ?? `Request failed (${res.status})`)
  }
  return envelope?.data as T
}

async function postSupport<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const envelope = (await res.json().catch(() => ({}))) as Envelope<T>
  if (!res.ok) {
    throw new Error(envelope?.message ?? `Request failed (${res.status})`)
  }
  return envelope?.data as T
}

export type TicketStats = {
  openCount: number
  urgentCount: number
  slaBreachedCount: number
  avgFirstResponseHours: number | null
}

export type TicketRow = {
  id: number
  ticketNo: string
  producerOrgId: number
  category: string
  priority: string
  subject: string
  status: string
  assignedToUserId?: number | null
  createdAt: string
  updatedAt: string
  producerOrg?: { id: number; name: string; status?: string } | null
  createdBy?: { id: number; profile?: { displayName?: string } } | null
  assignedTo?: { id: number; profile?: { displayName?: string } } | null
}

export type TicketListPayload = {
  items: TicketRow[]
  total: number
  page: number
  pageSize: number
}

export async function adminTicketStats(): Promise<TicketStats> {
  return getSupport<TicketStats>('/admin/support/tickets/stats')
}

export async function adminTicketsList(params: {
  status?: string
  priority?: string
  category?: string
  producerOrgId?: number
  assignedToUserId?: number | string | null
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}): Promise<TicketListPayload> {
  const q = new URLSearchParams()
  if (params.status) q.set('status', params.status)
  if (params.priority) q.set('priority', params.priority)
  if (params.category) q.set('category', params.category)
  if (params.producerOrgId != null) q.set('producerOrgId', String(params.producerOrgId))
  if (params.assignedToUserId !== undefined && params.assignedToUserId !== null && params.assignedToUserId !== '')
    q.set('assignedToUserId', String(params.assignedToUserId))
  if (params.search) q.set('search', params.search)
  if (params.dateFrom) q.set('dateFrom', params.dateFrom)
  if (params.dateTo) q.set('dateTo', params.dateTo)
  if (params.page != null) q.set('page', String(params.page))
  if (params.pageSize != null) q.set('pageSize', String(params.pageSize))
  const query = q.toString()
  const path = query ? `/admin/support/tickets?${query}` : '/admin/support/tickets'
  return getSupport<TicketListPayload>(path)
}

export async function adminTicketGet(id: number | string) {
  return getSupport(`/admin/support/tickets/${id}`)
}

export async function adminTicketUpdate(
  id: number | string,
  data: { status?: string; priority?: string; category?: string; assignedToUserId?: number | null }
) {
  return patchSupport(`/admin/support/tickets/${id}`, data)
}

export async function adminTicketReply(id: number | string, data: { message: string }) {
  return postSupport(`/admin/support/tickets/${id}/messages`, data)
}

export async function adminTicketAddNote(id: number | string, data: { message: string }) {
  return postSupport(`/admin/support/tickets/${id}/internal-notes`, data)
}

export async function adminTicketEscalate(id: number | string, data?: { summary?: string; details?: string }) {
  return postSupport(`/admin/support/tickets/${id}/escalate`, data ?? {})
}
