'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  campaignAdminCreateIncludedVaccine,
  campaignAdminDeleteIncludedVaccine,
  campaignAdminListIncludedVaccines,
  campaignAdminReorderIncludedVaccines,
  campaignAdminUpdateIncludedVaccine,
  type CampaignIncludedVaccine,
} from '@/lib/campaignApi'

type FormState = {
  name: string
  description: string
  coveredDiseasesText: string
}

const emptyForm = (): FormState => ({
  name: '',
  description: '',
  coveredDiseasesText: '',
})

function diseasesFromText(text: string): string[] {
  return text
    .split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function diseasesToText(list: string[]): string {
  return list.join('\n')
}

type Props = { campaignId: number }

export default function CampaignIncludedVaccinesPanel({ campaignId }: Props) {
  const [items, setItems] = useState<CampaignIncludedVaccine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    if (!Number.isFinite(campaignId)) return
    setLoading(true)
    setError('')
    try {
      const rows = await campaignAdminListIncludedVaccines(campaignId, { includeInactive: true })
      setItems(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load vaccines')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEdit(row: CampaignIncludedVaccine) {
    setEditingId(row.id)
    setForm({
      name: row.name,
      description: row.description ?? '',
      coveredDiseasesText: diseasesToText(row.coveredDiseases ?? []),
    })
    setShowForm(true)
  }

  async function saveForm(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      coveredDiseases: diseasesFromText(form.coveredDiseasesText),
    }
    try {
      if (editingId) {
        await campaignAdminUpdateIncludedVaccine(campaignId, editingId, payload)
      } else {
        await campaignAdminCreateIncludedVaccine(campaignId, payload)
      }
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: number) {
    if (!confirm('Delete this vaccine from the campaign display?')) return
    setBusy(true)
    try {
      await campaignAdminDeleteIncludedVaccine(campaignId, id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  async function move(id: number, direction: -1 | 1) {
    const idx = items.findIndex((r) => r.id === id)
    const target = idx + direction
    if (idx < 0 || target < 0 || target >= items.length) return
    const orderedIds = items.map((r) => r.id)
    ;[orderedIds[idx], orderedIds[target]] = [orderedIds[target], orderedIds[idx]]
    setBusy(true)
    try {
      const next = await campaignAdminReorderIncludedVaccines(campaignId, orderedIds)
      setItems(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reorder failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-transparent d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h5 className="mb-0">Vaccines included</h5>
          <p className="text-muted small mb-0">
            Shown on landing, booking, and campaign details. Pricing stays on campaign settings.
          </p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={openCreate} disabled={busy}>
          Add vaccine
        </button>
      </div>
      <div className="card-body">
        {error ? <div className="alert alert-danger">{error}</div> : null}
        {loading ? <p className="text-muted">Loading…</p> : null}

        {!loading && items.length === 0 ? (
          <p className="text-muted mb-0">No vaccines configured yet. Add vaccines for the public booking page.</p>
        ) : null}

        <div className="list-group list-group-flush">
          {items.map((row, index) => (
            <div key={row.id} className="list-group-item px-0">
              <div className="d-flex justify-content-between align-items-start gap-2">
                <div>
                  <h6 className="mb-1">{row.name}</h6>
                  {row.description ? <p className="small text-muted mb-2">{row.description}</p> : null}
                  {row.coveredDiseases?.length ? (
                    <ul className="small mb-0 ps-3">
                      {row.coveredDiseases.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="small text-muted mb-0">No diseases listed</p>
                  )}
                </div>
                <div className="d-flex flex-column gap-1 flex-shrink-0">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={busy || index === 0}
                    onClick={() => move(row.id, -1)}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={busy || index === items.length - 1}
                    onClick={() => move(row.id, 1)}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    disabled={busy}
                    onClick={() => openEdit(row)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    disabled={busy}
                    onClick={() => remove(row.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showForm ? (
          <form onSubmit={saveForm} className="border rounded p-3 mt-4 bg-light">
            <h6 className="mb-3">{editingId ? 'Edit vaccine' : 'Add vaccine'}</h6>
            <div className="mb-3">
              <label className="form-label">Vaccine name *</label>
              <input
                className="form-control"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                placeholder="e.g. PUREVAX® Feline 4"
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional short description"
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Covered diseases</label>
              <textarea
                className="form-control font-monospace"
                rows={4}
                value={form.coveredDiseasesText}
                onChange={(e) => setForm((f) => ({ ...f, coveredDiseasesText: e.target.value }))}
                placeholder="One per line or comma-separated"
              />
              <div className="form-text">Example: Feline Panleukopenia (FPV)</div>
            </div>
            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={busy}
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  )
}
