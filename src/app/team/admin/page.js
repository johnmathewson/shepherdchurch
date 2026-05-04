'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Badge from '@/components/Badge'
import LoadingSpinner from '@/components/LoadingSpinner'
import TeamSidebar from '@/components/TeamSidebar'

const TZ = 'America/Chicago'
function fmtDate(d) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d))
}
function fmtDateTime(d) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(d))
}

export default function AdminPage() {
  const [tab, setTab] = useState('overview')
  const [authError, setAuthError] = useState(false)
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState(null)
  const [allMembers, setAllMembers] = useState([])
  const [allRequests, setAllRequests] = useState([])

  const [selectedRequest, setSelectedRequest] = useState(null)
  const [memberDetail, setMemberDetail] = useState(null)   // { member, pickups, prophetic_words, stats }
  const [memberDetailLoading, setMemberDetailLoading] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)

  const [actionError, setActionError] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, membersRes, requestsRes] = await Promise.all([
        fetch('/api/team?action=stats'),
        fetch('/api/team?action=all_members'),
        fetch('/api/team?action=all_requests'),
      ])

      if (statsRes.status === 401 || statsRes.status === 403) {
        setAuthError(true)
        setLoading(false)
        return
      }

      const [statsData, membersData, requestsData] = await Promise.all([
        statsRes.json(), membersRes.json(), requestsRes.json(),
      ])
      setStats(statsData.stats || null)
      setAllMembers(membersData.members || [])
      setAllRequests(requestsData.requests || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ─── Member actions ────────────────────────────────────────────────
  async function handleAddMember(payload) {
    setActionError('')
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_member', ...payload }),
    })
    const data = await res.json()
    if (!res.ok) { setActionError(data.error || 'Could not add member.'); return false }
    setShowAddMember(false)
    fetchAll()
    return true
  }

  async function handleUpdateMember(id, updates) {
    setActionError('')
    const res = await fetch('/api/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    const data = await res.json()
    if (!res.ok) { setActionError(data.error || 'Could not update member.'); return }
    fetchAll()
  }

  async function openMemberDetail(memberId) {
    setMemberDetail({ loading: true })
    setMemberDetailLoading(true)
    try {
      const res = await fetch(`/api/team?action=member_activity&member_id=${memberId}`)
      const data = await res.json()
      if (!res.ok) { setActionError(data.error || 'Could not load member activity.'); setMemberDetail(null); return }
      setMemberDetail(data)
    } finally {
      setMemberDetailLoading(false)
    }
  }

  // ─── Auth-error UI ─────────────────────────────────────────────────
  if (authError) {
    return (
      <div className="min-h-screen page-bg">
        <Nav variant="team" />
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <h1 className="font-heading text-2xl font-bold mb-4">Admin Access Required</h1>
          <p className="text-text-secondary mb-8">You need admin privileges to access this page.</p>
          <Link href="/team" className="px-8 py-3.5 bg-purple hover:bg-purple-light text-white font-heading font-semibold rounded-lg transition-all inline-block">
            Back to Prayer Wall
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen page-bg flex">
      <TeamSidebar />

      <main className="flex-1 px-6 py-8 md:pl-8 md:pt-8 pt-20 max-w-6xl">
        <h1 className="font-heading text-3xl font-bold mb-8">Admin Panel</h1>

        {actionError && (
          <div className="mb-6 rounded-lg border border-danger/30 bg-danger/10 p-4 text-danger text-sm flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError('')} className="text-danger/70 hover:text-danger" aria-label="Dismiss">×</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'requests', label: 'Requests' },
            { key: 'members',  label: 'Members' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.key ? 'bg-purple text-white' : 'glass text-text-secondary hover:border-purple/40'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? <LoadingSpinner /> : (
          <>
            {tab === 'overview' && stats && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in">
                {[
                  { label: 'Total Requests',    value: stats.total_requests,         color: 'text-text-primary' },
                  { label: 'Pending Requests',  value: stats.pending_requests,       color: 'text-warning' },
                  { label: 'Active Requests',   value: stats.active_requests,        color: 'text-sage' },
                  { label: 'Total Pickups',     value: stats.total_pickups,          color: 'text-purple' },
                  { label: 'Prophetic Words',   value: stats.total_prophetic_words,  color: 'text-spiritual' },
                  { label: 'Active Members',    value: stats.active_members,         color: 'text-physical' },
                ].map((s) => (
                  <div key={s.label} className="glass rounded-lg p-5">
                    <div className={`text-3xl font-heading font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-text-muted text-sm mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'requests' && (
              <RequestsTable
                requests={allRequests}
                onSelect={setSelectedRequest}
              />
            )}

            {tab === 'members' && (
              <MembersTable
                members={allMembers}
                onAdd={() => setShowAddMember(true)}
                onOpenDetail={openMemberDetail}
                onUpdate={handleUpdateMember}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {selectedRequest && (
        <RequestDetailModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />
      )}
      {showAddMember && (
        <AddMemberModal
          onSubmit={handleAddMember}
          onClose={() => setShowAddMember(false)}
        />
      )}
      {memberDetail && (
        <MemberDetailModal
          detail={memberDetail}
          loading={memberDetailLoading}
          onClose={() => setMemberDetail(null)}
        />
      )}
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────
// Requests tab
// ─────────────────────────────────────────────────────────────────────
function RequestsTable({ requests, onSelect }) {
  const [filter, setFilter] = useState('all')

  const filtered = requests.filter(r =>
    filter === 'all' ? true : r.status === filter
  )

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {[
          { key: 'all',      label: `All (${requests.length})` },
          { key: 'pending',  label: `Pending (${requests.filter(r => r.status === 'pending').length})` },
          { key: 'active',   label: `Active (${requests.filter(r => r.status === 'active').length})` },
          { key: 'answered', label: `Answered (${requests.filter(r => r.status === 'answered').length})` },
          { key: 'archived', label: `Archived (${requests.filter(r => r.status === 'archived').length})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              filter === f.key ? 'bg-purple text-white' : 'glass text-text-secondary hover:border-purple/40'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="glass rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-black/15">
                <th className="text-left text-text-secondary text-xs font-medium px-4 py-3">Category</th>
                <th className="text-left text-text-secondary text-xs font-medium px-4 py-3">Title</th>
                <th className="text-left text-text-secondary text-xs font-medium px-4 py-3">Submitter</th>
                <th className="text-left text-text-secondary text-xs font-medium px-4 py-3">Status</th>
                <th className="text-left text-text-secondary text-xs font-medium px-4 py-3">Pickups</th>
                <th className="text-left text-text-secondary text-xs font-medium px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-text-muted">No requests in this view.</td></tr>
              )}
              {filtered.map(r => (
                <tr
                  key={r.id}
                  onClick={() => onSelect(r)}
                  className="border-b border-border/50 hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3"><Badge type="category" value={r.category} /></td>
                  <td className="px-4 py-3 text-text-primary truncate max-w-[280px]">{r.title}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {r.submitter_name ? (
                      <div>
                        <div className="text-text-primary">{r.submitter_name}</div>
                        <div className="text-xs text-text-muted">{r.submitter_email}</div>
                      </div>
                    ) : (
                      <span className="text-text-muted italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><Badge type="status" value={r.status} /></td>
                  <td className="px-4 py-3 text-text-secondary">{r.pickup_count}</td>
                  <td className="px-4 py-3 text-text-muted text-xs">{fmtDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function RequestDetailModal({ request, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <Badge type="category" value={request.category} />
            <h2 className="font-heading text-2xl font-bold mt-2">{request.title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center" aria-label="Close">×</button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
          <div>
            <div className="text-text-muted text-xs uppercase tracking-wider mb-1">Status</div>
            <Badge type="status" value={request.status} />
          </div>
          <div>
            <div className="text-text-muted text-xs uppercase tracking-wider mb-1">Submitted</div>
            <div className="text-text-secondary">{fmtDateTime(request.created_at)}</div>
          </div>
          <div className="col-span-2 rounded-md bg-white/3 border border-border p-3">
            <div className="text-text-muted text-xs uppercase tracking-wider mb-1">Submitter <span className="ml-1 text-warning normal-case tracking-normal">(admin-only)</span></div>
            {request.submitter_name ? (
              <>
                <div className="text-text-primary">{request.submitter_name}</div>
                <div className="text-xs text-text-secondary">{request.submitter_email}</div>
              </>
            ) : (
              <span className="text-text-muted italic">No submitter on record.</span>
            )}
          </div>
        </div>

        <div className="mb-5">
          <div className="text-text-muted text-xs uppercase tracking-wider mb-2">Description</div>
          <p className="text-text-primary whitespace-pre-wrap leading-relaxed">{request.description}</p>
        </div>

        {request.outcome_note && (
          <div className="mb-2 border-l-2 border-gold/60 bg-gold/5 pl-4 py-3">
            <div className="text-gold text-xs uppercase tracking-wider mb-1 font-semibold">Testimony</div>
            <p className="text-text-primary whitespace-pre-wrap">{request.outcome_note}</p>
            <div className="text-text-muted text-xs mt-2">Answered {fmtDate(request.outcome_at)}</div>
          </div>
        )}

        <div className="mt-6 text-text-muted text-sm">
          {request.pickup_count} {request.pickup_count === 1 ? 'team member has' : 'team members have'} prayed for this.
        </div>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────
// Members tab
// ─────────────────────────────────────────────────────────────────────
function MembersTable({ members, onAdd, onOpenDetail, onUpdate }) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="text-text-secondary text-sm">{members.length} {members.length === 1 ? 'member' : 'members'}</div>
        <button
          onClick={onAdd}
          className="px-4 py-2 rounded-lg bg-purple hover:bg-purple-light text-white text-sm font-medium transition-colors"
        >
          + Add Member
        </button>
      </div>

      <div className="glass rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-black/15">
                <th className="text-left text-text-secondary text-xs font-medium px-4 py-3">Name</th>
                <th className="text-left text-text-secondary text-xs font-medium px-4 py-3">Email</th>
                <th className="text-left text-text-secondary text-xs font-medium px-4 py-3">Role</th>
                <th className="text-left text-text-secondary text-xs font-medium px-4 py-3">Status</th>
                <th className="text-left text-text-secondary text-xs font-medium px-4 py-3">Source</th>
                <th className="text-right text-text-secondary text-xs font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-text-muted">No team members yet.</td></tr>
              )}
              {members.map(m => (
                <tr key={m.id} className="border-b border-border/50 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onOpenDetail(m.id)}
                      className="text-text-primary hover:text-purple-light font-medium underline-offset-4 hover:underline"
                    >
                      {m.display_name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{m.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      m.role === 'admin' ? 'bg-purple/20 text-purple' : 'bg-sage/20 text-sage'
                    }`}>{m.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      m.approved ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                    }`}>{m.approved ? 'Active' : 'Suspended'}</span>
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs">
                    {m.planning_center_id ? 'Planning Center' : (m.auth_user_id ? 'Magic link' : 'Email-added')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1.5">
                      <button
                        onClick={() => onUpdate(m.id, { role: m.role === 'admin' ? 'member' : 'admin' })}
                        className="text-xs px-2.5 py-1 rounded-md border border-border hover:border-purple text-text-secondary hover:text-text-primary"
                      >
                        {m.role === 'admin' ? 'Demote' : 'Promote'}
                      </button>
                      <button
                        onClick={() => onUpdate(m.id, { approved: !m.approved })}
                        className="text-xs px-2.5 py-1 rounded-md border border-border hover:border-warning text-text-secondary hover:text-text-primary"
                      >
                        {m.approved ? 'Suspend' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function AddMemberModal({ onSubmit, onClose }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('member')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    const ok = await onSubmit({ email, display_name: name, role })
    setSubmitting(false)
    if (ok) { setEmail(''); setName(''); setRole('member') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong rounded-lg max-w-md w-full p-6 sm:p-8 space-y-5"
      >
        <div className="flex items-start justify-between">
          <h2 className="font-heading text-xl font-bold">Add team member</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center" aria-label="Close">×</button>
        </div>
        <p className="text-text-secondary text-sm">
          They&apos;ll get team access as soon as they sign in via magic link with this email — no Planning Center required.
        </p>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Display Name</label>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="First Last" required autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Email</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="them@example.com" required autoComplete="off"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="member">Prayer Team Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-lg border border-border text-text-secondary hover:border-purple">Cancel</button>
          <button
            type="submit" disabled={submitting}
            className="flex-1 py-3 rounded-lg bg-purple hover:bg-purple-light text-white font-semibold disabled:opacity-50"
          >
            {submitting ? 'Adding…' : 'Add Member'}
          </button>
        </div>
      </form>
    </div>
  )
}

function MemberDetailModal({ detail, loading, onClose }) {
  if (loading || detail?.loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="glass-strong rounded-lg p-12"><LoadingSpinner /></div>
      </div>
    )
  }

  const { member, pickups = [], prophetic_words = [], stats = {} } = detail

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-heading text-2xl font-bold">{member.display_name}</h2>
            <div className="text-text-secondary text-sm mt-1">{member.email}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center" aria-label="Close">×</button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            member.role === 'admin' ? 'bg-purple/20 text-purple' : 'bg-sage/20 text-sage'
          }`}>{member.role}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            member.approved ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
          }`}>{member.approved ? 'Active' : 'Suspended'}</span>
          {member.planning_center_id && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-text-muted/15 text-text-secondary">PC linked</span>
          )}
          {!member.auth_user_id && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-text-muted/15 text-text-muted">Hasn&apos;t signed in yet</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-md bg-white/3 border border-border p-3 text-center">
            <div className="text-2xl font-heading font-bold text-purple">{stats.total_pickups ?? 0}</div>
            <div className="text-text-muted text-xs">Pickups</div>
          </div>
          <div className="rounded-md bg-white/3 border border-border p-3 text-center">
            <div className="text-2xl font-heading font-bold text-spiritual">{stats.total_prophetic_words ?? 0}</div>
            <div className="text-text-muted text-xs">Words posted</div>
          </div>
          <div className="rounded-md bg-white/3 border border-border p-3 text-center">
            <div className="text-sm font-semibold text-text-primary mt-1.5">{fmtDate(stats.last_active_at)}</div>
            <div className="text-text-muted text-xs mt-1">Last active</div>
          </div>
        </div>

        <Section title={`Pickups (${pickups.length})`}>
          {pickups.length === 0 ? <p className="text-text-muted text-sm">No pickups yet.</p> : (
            <ul className="space-y-2">
              {pickups.slice(0, 25).map(p => (
                <li key={p.id} className="rounded-md bg-white/3 border border-border px-3 py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-text-primary truncate">{p.request?.title || '—'}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {p.request?.category && <Badge type="category" value={p.request.category} />}
                      {p.request?.status && <Badge type="status" value={p.request.status} />}
                    </div>
                  </div>
                  <div className="text-text-muted text-xs whitespace-nowrap">{fmtDate(p.created_at)}</div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={`Prophetic words (${prophetic_words.length})`}>
          {prophetic_words.length === 0 ? <p className="text-text-muted text-sm">No prophetic words posted.</p> : (
            <ul className="space-y-3">
              {prophetic_words.slice(0, 15).map(w => (
                <li key={w.id} className="border-l-2 border-spiritual/60 bg-spiritual/5 pl-3 py-2">
                  <div className="text-sm text-text-primary whitespace-pre-wrap">{w.content}</div>
                  <div className="text-text-muted text-xs mt-1">
                    On <span className="text-text-secondary">{w.request?.title || '—'}</span> · {fmtDate(w.created_at)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <div className="text-text-muted text-xs uppercase tracking-wider mb-3 font-semibold">{title}</div>
      {children}
    </div>
  )
}
