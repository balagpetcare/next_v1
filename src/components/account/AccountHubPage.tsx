'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  MeApiError,
  meDelete,
  meGet,
  mePatch,
  mePost,
  mePostForm,
} from '@/src/lib/meProfileApi'
import {
  PROFILE_PHOTO_ACCEPT,
  PROFILE_PHOTO_MAX_BYTES,
  PROFILE_PHOTO_MAX_MB,
  isClientAllowedProfilePhotoType,
} from '@/src/lib/profilePhotoUpload'
import { getCropperConfig, useImageCropper } from '@/src/media/cropper'

export type AccountHubPageProps = {
  basePath: string
  supportHref?: string | null
}

type TabKey =
  | 'overview'
  | 'basic'
  | 'professional'
  | 'branches'
  | 'preferences'
  | 'notifications'
  | 'security'
  | 'audit'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'basic', label: 'Basic info' },
  { key: 'professional', label: 'Professional' },
  { key: 'branches', label: 'Roles & branches' },
  { key: 'preferences', label: 'Preferences' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'security', label: 'Security' },
  { key: 'audit', label: 'Audit' },
]

function tabFromSearch(sp: URLSearchParams | null): TabKey {
  const t = (sp?.get('tab') || '').toLowerCase()
  const allowed = new Set(TABS.map((x) => x.key))
  return allowed.has(t as TabKey) ? (t as TabKey) : 'overview'
}

function photoSourceLabel(source: string | undefined): string {
  if (source === 'MANUAL') return 'Uploaded photo'
  if (source === 'PROVIDER') return 'Social profile photo'
  return 'Default avatar'
}

function messageFromProfilePhotoError(err: unknown): string {
  if (err instanceof MeApiError && err.code) {
    switch (err.code) {
      case 'FILE_TOO_LARGE':
        return `Image must be ${PROFILE_PHOTO_MAX_MB} MB or smaller.`
      case 'INVALID_FILE_TYPE':
        return 'Use a JPG, PNG, or WEBP image.'
      case 'FILE_REQUIRED':
        return 'Choose an image file to upload.'
      case 'INVALID_MULTIPART_PAYLOAD':
        return 'Upload could not be read. Please try again with one image file.'
      case 'FILE_UPLOAD_FAILED':
        return 'Upload failed. Please try again.'
      case 'INVALID_IMAGE_PAYLOAD':
        return 'Selected image could not be processed. Please try another image.'
      default:
        return err.message
    }
  }
  return err instanceof Error ? err.message : 'Upload failed'
}

function messageFromMeDeleteError(err: unknown): string {
  if (err instanceof MeApiError) {
    return err.message || 'Could not remove your photo. Please try again.'
  }
  return err instanceof Error ? err.message : 'Remove failed'
}

export default function AccountHubPage({ basePath, supportHref }: AccountHubPageProps) {
  const sp = useSearchParams()
  const [tab, setTab] = useState<TabKey>(() => tabFromSearch(sp))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [security, setSecurity] = useState<any>(null)
  const [capabilities, setCapabilities] = useState<any>(null)
  const [branches, setBranches] = useState<any>(null)
  const [audit, setAudit] = useState<any>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [removingPhoto, setRemovingPhoto] = useState(false)
  const { openCropper, CropperModal } = useImageCropper()

  const support = supportHref ?? `${basePath}/notifications`

  useEffect(() => {
    setTab(tabFromSearch(sp))
  }, [sp])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [p, s, sec, cap, br, au] = await Promise.all([
        meGet<{ success?: boolean; data?: unknown }>('/profile'),
        meGet<{ success?: boolean; data?: unknown }>('/settings'),
        meGet<{ success?: boolean; data?: unknown }>('/security'),
        meGet<{ success?: boolean; data?: unknown }>('/capabilities'),
        meGet<{ success?: boolean; data?: unknown }>('/branches'),
        meGet<{ success?: boolean; data?: unknown }>('/audit?limit=30'),
      ])
      setProfile((p as any)?.data ?? p)
      setSettings((s as any)?.data ?? s)
      setSecurity((sec as any)?.data ?? sec)
      setCapabilities((cap as any)?.data ?? cap)
      setBranches((br as any)?.data ?? br)
      setAudit((au as any)?.data ?? au)
    } catch (e: any) {
      setError(e?.message || 'Failed to load account data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const basicForm = useMemo(() => {
    const b = profile?.basic || {}
    return {
      displayName: b.displayName || '',
      bio: b.bio || '',
      phone: b.phone || '',
      email: b.email || '',
      gender: b.gender || '',
      dateOfBirth: b.dateOfBirth ? String(b.dateOfBirth).slice(0, 10) : '',
    }
  }, [profile])

  const [basicDraft, setBasicDraft] = useState(basicForm)
  useEffect(() => {
    setBasicDraft(basicForm)
  }, [basicForm])

  const onSaveBasic = async () => {
    setSaveMsg(null)
    setError(null)
    try {
      await mePatch('/profile', {
        displayName: basicDraft.displayName,
        bio: basicDraft.bio || null,
        phone: basicDraft.phone || null,
        email: basicDraft.email || null,
        gender: basicDraft.gender || null,
        dateOfBirth: basicDraft.dateOfBirth || null,
      })
      setSaveMsg('Saved basic profile.')
      await loadAll()
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    }
  }

  const [prefDraft, setPrefDraft] = useState({
    language: '',
    theme: '',
    timezone: '',
    dashboardLanding: '',
  })
  useEffect(() => {
    const a = settings?.app || {}
    setPrefDraft({
      language: a.language || '',
      theme: a.theme || '',
      timezone: a.timezone || '',
      dashboardLanding: a.dashboardLanding || '',
    })
  }, [settings])

  const onSavePrefs = async () => {
    setSaveMsg(null)
    setError(null)
    try {
      await mePatch('/settings', {
        language: prefDraft.language || null,
        theme: prefDraft.theme || null,
        timezone: prefDraft.timezone || null,
        dashboardLanding: prefDraft.dashboardLanding || null,
      })
      setSaveMsg('Preferences saved.')
      await loadAll()
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    }
  }

  const [notifDraft, setNotifDraft] = useState({
    allowEmail: true,
    allowSms: false,
    allowInApp: true,
    soundEnabled: true,
  })
  useEffect(() => {
    const n = settings?.notifications || {}
    setNotifDraft({
      allowEmail: n.allowEmail !== false,
      allowSms: !!n.allowSms,
      allowInApp: n.allowInApp !== false,
      soundEnabled: n.soundEnabled !== false,
    })
  }, [settings])

  const onSaveNotif = async () => {
    setSaveMsg(null)
    setError(null)
    try {
      await mePatch('/settings', { notifications: notifDraft })
      setSaveMsg('Notification preferences saved.')
      await loadAll()
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    }
  }

  const [pwd, setPwd] = useState({ current: '', next: '', next2: '' })
  const onChangePassword = async () => {
    setSaveMsg(null)
    setError(null)
    if (pwd.next !== pwd.next2) {
      setError('New password fields do not match')
      return
    }
    try {
      await mePost('/security/password', { currentPassword: pwd.current, newPassword: pwd.next })
      setSaveMsg('Password updated.')
      setPwd({ current: '', next: '', next2: '' })
      await loadAll()
    } catch (e: any) {
      setError(e?.message || 'Password change failed')
    }
  }

  const onSetActiveBranch = async (branchId: number) => {
    setSaveMsg(null)
    setError(null)
    try {
      await mePatch('/active-branch', { branchId })
      setSaveMsg('Active branch updated.')
      await loadAll()
    } catch (e: any) {
      setError(e?.message || 'Could not update branch')
    }
  }

  const photoFileRef = useRef<HTMLInputElement>(null)
  const hubBasic = profile?.basic || {}

  const onPickProfilePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setSaveMsg(null)
    setError(null)
    if (f.size === 0) {
      setError('The selected file is empty. Choose a different image.')
      return
    }
    if (f.size > PROFILE_PHOTO_MAX_BYTES) {
      setError(`Image must be ${PROFILE_PHOTO_MAX_MB} MB or smaller.`)
      return
    }
    if (!isClientAllowedProfilePhotoType(f)) {
      setError('Use a JPG, PNG, or WEBP image.')
      return
    }
    let cropped
    try {
      cropped = await openCropper(f, getCropperConfig('avatar'))
    } catch (cropErr: unknown) {
      setError(cropErr instanceof Error ? cropErr.message : 'Could not open the crop editor. Please try again.')
      return
    }
    if (!cropped) return
    const uploadFile =
      cropped.file ??
      new File([cropped.blob], 'profile-photo.jpg', { type: cropped.blob.type || 'image/jpeg' })
    if (uploadFile.size > PROFILE_PHOTO_MAX_BYTES) {
      setError(`Image must be ${PROFILE_PHOTO_MAX_MB} MB or smaller after cropping.`)
      return
    }
    setPhotoUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      await mePostForm('/profile/photo', fd)
      setSaveMsg('Profile photo updated.')
      await loadAll()
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bpa:me-refresh'))
    } catch (err: unknown) {
      setError(messageFromProfilePhotoError(err))
    } finally {
      setPhotoUploading(false)
    }
  }

  const onRemoveProfilePhoto = async () => {
    setSaveMsg(null)
    setError(null)
    setRemovingPhoto(true)
    try {
      await meDelete('/profile/photo')
      setSaveMsg('Uploaded photo removed. A social profile photo may show again if available.')
      await loadAll()
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bpa:me-refresh'))
    } catch (err: unknown) {
      setError(messageFromMeDeleteError(err))
    } finally {
      setRemovingPhoto(false)
    }
  }

  return (
    <div className="dashboard-main-body">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <div>
          <h6 className="text-lg mb-0">Account</h6>
          <p className="text-secondary-light text-sm mb-0">Profile, preferences, and security</p>
        </div>
        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={() => loadAll()}
          disabled={loading || photoUploading || removingPhoto}
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}
      {saveMsg ? (
        <div className="alert alert-success" role="status">
          {saveMsg}
        </div>
      ) : null}

      <ul className="nav nav-pills flex-wrap gap-2 pb-3">
        {TABS.map((t) => (
          <li className="nav-item" key={t.key}>
            <button
              type="button"
              className={`nav-link ${tab === t.key ? 'active' : ''}`}
              onClick={() => {
                setTab(t.key)
                if (typeof window !== 'undefined') {
                  const u = new URL(window.location.href)
                  u.searchParams.set('tab', t.key)
                  window.history.replaceState({}, '', u.toString())
                }
              }}
            >
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      {loading ? (
        <div className="text-secondary-light">Loading…</div>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="row g-3">
              <div className="col-12">
                <div className="card p-20 radius-12 border">
                  <div className="fw-semibold mb-12">Profile photo</div>
                  <div className="d-flex flex-wrap align-items-start gap-4">
                    <div
                      className="rounded-circle border bg-neutral-50 d-flex align-items-center justify-content-center overflow-hidden flex-shrink-0"
                      style={{ width: 96, height: 96, minWidth: 96, minHeight: 96 }}
                    >
                      {hubBasic.effectivePhotoUrl ? (
                        <img
                          key={`${hubBasic.effectivePhotoUrl}-${String(hubBasic.photoSource ?? '')}`}
                          src={hubBasic.effectivePhotoUrl}
                          alt=""
                          width={96}
                          height={96}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          decoding="async"
                        />
                      ) : (
                        <span className="text-secondary-light text-sm px-8 text-center">No photo</span>
                      )}
                    </div>
                    <div className="flex-grow-1" style={{ minWidth: 200 }}>
                      <span className="badge bg-primary-focus text-primary-600 radius-12">
                        {photoSourceLabel(hubBasic.photoSource)}
                      </span>
                      <p className="text-secondary-light text-sm mt-12 mb-8">
                        If you have not uploaded a photo, your social sign-in profile photo may be used when available.
                        An uploaded photo always takes priority.
                      </p>
                      <p className="text-secondary-light text-xs mb-12">
                        Accepted: JPG, PNG, WEBP · Max size: {PROFILE_PHOTO_MAX_MB} MB · You will crop to a square
                        before upload; images are optimized for storage.
                      </p>
                      <input
                        ref={photoFileRef}
                        type="file"
                        accept={PROFILE_PHOTO_ACCEPT}
                        className="d-none"
                        onChange={onPickProfilePhoto}
                        disabled={photoUploading || removingPhoto}
                      />
                      <div className="d-flex flex-wrap gap-8">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => photoFileRef.current?.click()}
                          disabled={photoUploading || removingPhoto}
                        >
                          {photoUploading ? 'Uploading…' : 'Upload or change photo'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          disabled={hubBasic.photoSource !== 'MANUAL' || photoUploading || removingPhoto}
                          onClick={onRemoveProfilePhoto}
                        >
                          {removingPhoto ? 'Removing…' : 'Remove uploaded photo'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="card p-20 radius-12 border">
                  <div className="fw-semibold mb-12">Account status</div>
                  <div className="text-secondary-light text-sm">Status: {profile?.user?.status || '—'}</div>
                  <div className="text-secondary-light text-sm mt-8">
                    Member since: {profile?.user?.createdAt ? new Date(profile.user.createdAt).toLocaleString() : '—'}
                  </div>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="card p-20 radius-12 border">
                  <div className="fw-semibold mb-12">Quick links</div>
                  <div className="d-flex flex-column gap-8">
                    <Link href={support}>Support / notifications</Link>
                    <Link href={`${basePath}/logout`}>Logout</Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'basic' && (
            <div className="card p-20 radius-12 border max-w-720">
              <div className="fw-semibold mb-16">Basic information</div>
              <div className="row g-12">
                <div className="col-md-6">
                  <label className="form-label text-sm">Display name</label>
                  <input
                    className="form-control"
                    value={basicDraft.displayName}
                    onChange={(e) => setBasicDraft((d) => ({ ...d, displayName: e.target.value }))}
                  />
                </div>
                {profile?.basic?.providerDisplayName ? (
                  <div className="col-12">
                    <label className="form-label text-sm">Name from your sign-in provider</label>
                    <div className="form-control-plaintext border rounded px-12 py-8 bg-neutral-50">
                      {String(profile.basic.providerDisplayName)}
                    </div>
                    <p className="text-secondary-light text-xs mb-0 mt-4">Reference only; edit your display name above.</p>
                  </div>
                ) : null}
                <div className="col-md-6">
                  <label className="form-label text-sm">Gender</label>
                  <select
                    className="form-select"
                    value={basicDraft.gender}
                    onChange={(e) => setBasicDraft((d) => ({ ...d, gender: e.target.value }))}
                  >
                    <option value="">—</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="UNKNOWN">Unknown</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label text-sm">Date of birth</label>
                  <input
                    type="date"
                    className="form-control"
                    value={basicDraft.dateOfBirth}
                    onChange={(e) => setBasicDraft((d) => ({ ...d, dateOfBirth: e.target.value }))}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label text-sm">Email</label>
                  <input
                    className="form-control"
                    value={basicDraft.email}
                    onChange={(e) => setBasicDraft((d) => ({ ...d, email: e.target.value }))}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label text-sm">Phone</label>
                  <input
                    className="form-control"
                    value={basicDraft.phone}
                    onChange={(e) => setBasicDraft((d) => ({ ...d, phone: e.target.value }))}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label text-sm">Bio</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={basicDraft.bio}
                    onChange={(e) => setBasicDraft((d) => ({ ...d, bio: e.target.value }))}
                  />
                </div>
              </div>
              <div className="mt-16">
                <button type="button" className="btn btn-primary" onClick={onSaveBasic}>
                  Save
                </button>
              </div>
            </div>
          )}

          {tab === 'professional' && (
            <div className="card p-20 radius-12 border">
              <div className="fw-semibold mb-12">Professional details</div>
              <p className="text-secondary-light text-sm mb-16">
                Branch-scoped roles and clinic profiles are managed by your organization. Below is a read-only summary.
              </p>
              <div className="table-responsive">
                <table className="table table-bordered mb-0">
                  <thead>
                    <tr>
                      <th>Branch</th>
                      <th>Org</th>
                      <th>Member role</th>
                      <th>Clinic / staff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(profile?.professional?.branchAssignments || []).length ? (
                      profile.professional.branchAssignments.map((row: any) => (
                        <tr key={row.branchMemberId}>
                          <td>{row.branch?.name || row.branchId}</td>
                          <td>{row.org?.name || row.orgId}</td>
                          <td>{row.primaryRole}</td>
                          <td className="text-sm">
                            {row.clinic
                              ? `${row.clinic.staffType || '—'} · ${row.clinic.roleInClinic || '—'}`
                              : '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-secondary-light">
                          No branch assignments found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {profile?.organization?.doctorVerification ? (
                <div className="mt-16 text-sm">
                  <div className="fw-semibold mb-8">Doctor verification (summary)</div>
                  <div>Status: {String(profile.organization.doctorVerification.verificationStatus || '—')}</div>
                </div>
              ) : null}
            </div>
          )}

          {tab === 'branches' && (
            <div className="card p-20 radius-12 border">
              <div className="fw-semibold mb-12">Roles & branches</div>
              <p className="text-secondary-light text-sm">
                Active branch (preference):{' '}
                <strong>{branches?.activeBranchId ?? '—'}</strong>
              </p>
              <div className="table-responsive">
                <table className="table table-bordered mb-16">
                  <thead>
                    <tr>
                      <th>Branch</th>
                      <th>Role</th>
                      <th>RBAC</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(branches?.memberships || []).map((m: any) => (
                      <tr key={m.branchMemberId}>
                        <td>{m.branch?.name || m.branchId}</td>
                        <td>{m.memberRole}</td>
                        <td className="text-sm">{(m.rbacRoles || []).map((r: any) => r.key).join(', ') || '—'}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => onSetActiveBranch(m.branchId)}
                          >
                            Set active
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-sm text-secondary-light">
                Permissions are assigned by administrators; you cannot edit them here.
              </div>
            </div>
          )}

          {tab === 'preferences' && (
            <div className="card p-20 radius-12 border max-w-720">
              <div className="fw-semibold mb-16">App preferences</div>
              <div className="row g-12">
                <div className="col-md-6">
                  <label className="form-label text-sm">Language</label>
                  <input
                    className="form-control"
                    placeholder="en"
                    value={prefDraft.language}
                    onChange={(e) => setPrefDraft((d) => ({ ...d, language: e.target.value }))}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label text-sm">Theme</label>
                  <select
                    className="form-select"
                    value={prefDraft.theme}
                    onChange={(e) => setPrefDraft((d) => ({ ...d, theme: e.target.value }))}
                  >
                    <option value="">System default</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label text-sm">Timezone</label>
                  <input
                    className="form-control"
                    placeholder="Asia/Dhaka"
                    value={prefDraft.timezone}
                    onChange={(e) => setPrefDraft((d) => ({ ...d, timezone: e.target.value }))}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label text-sm">Dashboard landing (optional)</label>
                  <input
                    className="form-control"
                    value={prefDraft.dashboardLanding}
                    onChange={(e) => setPrefDraft((d) => ({ ...d, dashboardLanding: e.target.value }))}
                  />
                </div>
              </div>
              <div className="mt-16">
                <button type="button" className="btn btn-primary" onClick={onSavePrefs}>
                  Save preferences
                </button>
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="card p-20 radius-12 border max-w-520">
              <div className="fw-semibold mb-16">Notifications</div>
              {settings?.notifications == null ? (
                <div className="text-secondary-light text-sm">No notification preferences stored yet.</div>
              ) : null}
              <div className="form-check mb-12">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="n-email"
                  checked={notifDraft.allowEmail}
                  onChange={(e) => setNotifDraft((d) => ({ ...d, allowEmail: e.target.checked }))}
                />
                <label className="form-check-label" htmlFor="n-email">
                  Email
                </label>
              </div>
              <div className="form-check mb-12">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="n-sms"
                  checked={notifDraft.allowSms}
                  onChange={(e) => setNotifDraft((d) => ({ ...d, allowSms: e.target.checked }))}
                />
                <label className="form-check-label" htmlFor="n-sms">
                  SMS
                </label>
              </div>
              <div className="form-check mb-12">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="n-inapp"
                  checked={notifDraft.allowInApp}
                  onChange={(e) => setNotifDraft((d) => ({ ...d, allowInApp: e.target.checked }))}
                />
                <label className="form-check-label" htmlFor="n-inapp">
                  In-app
                </label>
              </div>
              <div className="form-check mb-16">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="n-sound"
                  checked={notifDraft.soundEnabled}
                  onChange={(e) => setNotifDraft((d) => ({ ...d, soundEnabled: e.target.checked }))}
                />
                <label className="form-check-label" htmlFor="n-sound">
                  Sound
                </label>
              </div>
              <button type="button" className="btn btn-primary" onClick={onSaveNotif}>
                Save notifications
              </button>
            </div>
          )}

          {tab === 'security' && (
            <div className="row g-3">
              <div className="col-lg-6">
                <div className="card p-20 radius-12 border">
                  <div className="fw-semibold mb-12">Session information</div>
                  <div className="text-sm text-secondary-light">Last login</div>
                  <div className="mb-12">{security?.lastLoginAt ? new Date(security.lastLoginAt).toLocaleString() : '—'}</div>
                  <div className="text-sm text-secondary-light">Password last updated</div>
                  <div className="mb-12">
                    {security?.passwordUpdatedAt ? new Date(security.passwordUpdatedAt).toLocaleString() : '—'}
                  </div>
                  <div className="text-sm text-secondary-light">Active sessions (approx.)</div>
                  <div>{security?.activeSessionCount ?? '—'}</div>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="card p-20 radius-12 border">
                  <div className="fw-semibold mb-12">Change password</div>
                  <div className="mb-12">
                    <label className="form-label text-sm">Current password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={pwd.current}
                      onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
                      autoComplete="current-password"
                    />
                  </div>
                  <div className="mb-12">
                    <label className="form-label text-sm">New password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={pwd.next}
                      onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="mb-16">
                    <label className="form-label text-sm">Confirm new password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={pwd.next2}
                      onChange={(e) => setPwd((p) => ({ ...p, next2: e.target.value }))}
                      autoComplete="new-password"
                    />
                  </div>
                  <button type="button" className="btn btn-primary" onClick={onChangePassword}>
                    Update password
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'audit' && (
            <div className="card p-20 radius-12 border">
              <div className="fw-semibold mb-12">Recent profile audit events</div>
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(audit || []).length ? (
                      audit.map((row: any) => (
                        <tr key={row.id}>
                          <td className="text-nowrap">{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</td>
                          <td>{row.action}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="text-secondary-light">
                          No audit entries yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'overview' && capabilities ? (
        <div className="card p-20 radius-12 border mt-16">
          <div className="fw-semibold mb-12">Capabilities (summary)</div>
          <div className="text-sm text-secondary-light mb-8">
            Effective permission keys (read-only). Full routing still uses <code>/api/v1/auth/me</code>.
          </div>
          <div className="text-sm" style={{ maxHeight: 160, overflow: 'auto' }}>
            {(capabilities?.permissions || []).slice(0, 80).join(', ') || '—'}
          </div>
        </div>
      ) : null}
      {CropperModal}
    </div>
  )
}
