'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Icon } from '@iconify/react'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import { apiGet, apiPut } from '@/lib/api'

const FEATURE_CODES = [
  'DONATION',
  'FUNDRAISING',
  'ADS',
  'PRODUCTS',
  'POS',
  'ORDERS',
  'CLINIC',
  'ADOPTION',
  'RESCUE',
  'FOSTER',
  'SHELTER',
  'SERVICES',
  'DELIVERY',
]

type PolicyRow = { id: number; name?: string; status?: string; features?: { featureCode: string; enabled: boolean }[] }

export default function StateFeaturesPage() {
  const params = useParams<{ id?: string }>()
  const stateId = useMemo(() => Number(params?.id), [params])
  const [policies, setPolicies] = useState<PolicyRow[]>([])
  const [policyId, setPolicyId] = useState<number | null>(null)
  const [features, setFeatures] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!stateId) return
    setLoading(true)
    setError('')
    try {
      const res = await apiGet<{ data?: PolicyRow[] }>(`/api/v1/admin/state/states/${stateId}/policies`)
      const list = res?.data ?? []
      setPolicies(list)
      const active = list.find((p) => p.status === 'ACTIVE') || list[0]
      if (active) {
        setPolicyId(active.id)
        const map: Record<string, boolean> = {}
        ;(active.features || []).forEach((f) => {
          map[f.featureCode] = !!f.enabled
        })
        setFeatures(map)
      }
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [stateId])

  useEffect(() => {
    load()
  }, [load])

  const onSelectPolicy = (id: string) => {
    const p = policies.find((x) => x.id === Number(id))
    setPolicyId(p?.id ?? null)
    const map: Record<string, boolean> = {}
    ;(p?.features || []).forEach((f) => {
      map[f.featureCode] = !!f.enabled
    })
    setFeatures(map)
  }

  const onToggle = (code: string) => {
    setFeatures((prev) => ({ ...prev, [code]: !prev[code] }))
  }

  const onSave = async () => {
    if (!policyId) return
    setLoading(true)
    setError('')
    try {
      await apiPut(`/api/v1/admin/state/policies/${policyId}/features`, { features })
      await load()
    } catch (e) {
      setError((e as Error)?.message ?? 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminPageShell
      title="State Features"
      breadcrumbs={[{ label: 'Geography' }, { label: 'States', href: '/admin/states' }, { label: `#${stateId}` }, { label: 'Features' }]}
      actions={
        <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2" onClick={load} disabled={loading}>
          <Icon icon="solar:refresh-outline" aria-hidden />
          Refresh
        </button>
      }
    >
      <SectionCard title="Policy Features">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">Policy</label>
            <select className="form-select" value={policyId || ''} onChange={(e) => onSelectPolicy(e.target.value)}>
              {policies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.status})
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-8 d-flex align-items-end justify-content-end">
            <button className="btn btn-primary" onClick={onSave} disabled={loading || !policyId}>
              Save Features
            </button>
          </div>
        </div>

        <div className="row g-2 mt-3">
          {FEATURE_CODES.map((code) => (
            <div key={code} className="col-md-3">
              <label className="form-check">
                <input className="form-check-input" type="checkbox" checked={!!features[code]} onChange={() => onToggle(code)} />
                <span className="form-check-label">{code}</span>
              </label>
            </div>
          ))}
        </div>

        {error ? <div className="text-danger mt-2">{error}</div> : null}
        {loading ? <div className="mt-2 text-secondary">Saving…</div> : null}
      </SectionCard>
    </AdminPageShell>
  )
}

