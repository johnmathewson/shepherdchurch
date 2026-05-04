'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Badge from '@/components/Badge'
import LoadingSpinner from '@/components/LoadingSpinner'
import TeamSidebar from '@/components/TeamSidebar'
import PrayerWeekPanel from '@/components/PrayerWeekPanel'
import { useRealtimeSubscription } from '@/lib/realtime'

const TZ = 'America/Chicago'
function fmtDate(d) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d))
}
function fmtDateTime(d) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(d))
}

const TABS = [
  { key: 'overview',     label: 'Overview' },
  { key: 'requests',     label: 'Requests' },
  { key: 'members',      label: 'Team Members' },
  { key: 'prayer-week',  label: 'Prayer Initiative' },
]

export default function AdminPage() {
  const [tab, setTab] = useState('overview')
  const [authError, setAuthError] = useState(false)
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState(null)
  const [allMembers, setAllMembers] = useState([])
  const [allRequests, setAllRequests] = useState([])

  const [selectedRequest, setSelectedRequest] = useState(null)
  const [memberDetail, setMemberDetail] = useState(null)
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

  async function handleDeleteMember(member) {
    setActionError('')
    const ok = confirm(
      `Permanently delete ${member.display_name}?\n\n` +
      `This will also remove all of their pickups and prophetic words. ` +
      `If you want to keep their history but stop their access, use Suspend instead.`
    )
    if (!ok) return
    const res = await fetch('/api/team', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: member.id }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setActionError(data.error || 'Could not delete member.'); return }
    fetchAll()
  }

  async function handleArchiveRequest(req) {
    setActionError('')
    const ok = confirm(`Archive "${req.title}"?\n\nIt will move to the Archived filter and disappear from the active views.`)
    if (!ok) return
    const res = await fetch(`/api/requests/${req.id}/archive`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setActionError(data.error || 'Could not archive request.'); return }
    setSelectedRequest(null)
    fetchAll()
  }

  // ─── Auth-error UI ─────────────────────────────────────────────────
  if (authError) {
    return (
      <div className="min-h-screen page-bg">
        <Nav variant="team" />
        <div className="max-w-md mx-auto px-6 py-20">
          <div className="glass-elevated p-8 text-center">
            <h1 className="font-heading text-2xl font-bold mb-3">Admin Access Required</h1>
            <p className="text-text-secondary mb-7 text-sm">
              You need admin privileges to view this page. If you were just promoted, sign out and back in to refresh your session.
            </p>
            <Link
              href="/team"
              className="inline-block px-6 py-2.5 rounded-lg bg-gold hover:bg-gold-light text-white font-heading font-semibold text-sm transition-colors"
            >
              Back to Prayer Wall
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen page-bg flex">
      <TeamSidebar />

      <main className="flex-1 px-6 py-8 md:pl-8 md:pt-8 pt-20 max-w-6xl w-full mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <p className="text-gold uppercase tracking-[0.3em] text-[11px] font-semibold mb-2">Admin</p>
          <h1 className="font-heading text-3xl font-bold">Prayer Wall control panel</h1>
          <p className="text-text-secondary text-sm mt-1.5">
            Overview, requests, members, and the live Day/Night prayer initiative — all in one place.
          </p>
        </div>

        {actionError && (
          <div className="mb-6 rounded-lg border border-danger/30 bg-danger/10 p-4 text-danger text-sm flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError('')} className="text-danger/70 hover:text-danger pl-3" aria-label="Dismiss">×</button>
          </div>
        )}

        {/* Segmented tabs */}
        <div className="mb-7 overflow-x-auto pb-1">
          <div className="tab-track">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`tab-segment ${tab === t.key ? 'tab-segment-active' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? <LoadingSpinner /> : (
          <>
            {tab === 'overview' && stats && (
              <OverviewTab
                stats={stats}
                requests={allRequests}
                members={allMembers}
                onSelectRequest={setSelectedRequest}
              />
            )}

            {tab === 'requests' && (
              <RequestsTable
                requests={allRequests}
                onSelect={setSelectedRequest}
                onArchive={handleArchiveRequest}
              />
            )}

            {tab === 'members' && (
              <MembersTable
                members={allMembers}
                onAdd={() => setShowAddMember(true)}
                onOpenDetail={openMemberDetail}
                onUpdate={handleUpdateMember}
                onDelete={handleDeleteMember}
              />
            )}

            {tab === 'prayer-week' && (
              <PrayerWeekPanel mode="admin" />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onArchive={handleArchiveRequest}
          onMutated={fetchAll}
        />
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
// Overview tab — stat tiles in liquid glass
// ─────────────────────────────────────────────────────────────────────
function OverviewTab({ stats, requests, members, onSelectRequest }) {
  const tiles = [
    { label: 'Total Requests',   value: stats.total_requests,         accent: 'text-text-primary' },
    { label: 'Pending',          value: stats.pending_requests,       accent: 'text-warning' },
    { label: 'Active',           value: stats.active_requests,        accent: 'text-sage' },
    { label: 'Total Pickups',    value: stats.total_pickups,          accent: 'text-gold' },
    { label: 'Prophetic Words',  value: stats.total_prophetic_words,  accent: 'text-spiritual' },
    { label: 'Active Members',   value: stats.active_members,         accent: 'text-physical' },
  ]

  const recent = [...requests]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 6)

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {tiles.map(t => (
          <div key={t.label} className="glass-elevated p-5">
            <div className={`font-heading text-3xl font-bold ${t.accent}`}>{t.value}</div>
            <div className="text-text-muted text-[11px] uppercase tracking-[0.15em] mt-2">{t.label}</div>
          </div>
        ))}
      </div>

      {recent.length > 0 && (
        <div>
          <h3 className="font-heading text-sm uppercase tracking-[0.2em] text-text-muted mb-3">Latest Requests</h3>
          <div className="glass-elevated overflow-hidden">
            <ul className="divide-y divide-white/5">
              {recent.map(r => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onSelectRequest(r)}
                    className="w-full px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge type="category" value={r.category} />
                        <Badge type="status" value={r.status} />
                        {r.wants_followup && (
                          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30 font-semibold">Follow-up</span>
                        )}
                      </div>
                      <div className="text-text-primary text-sm truncate">{r.title}</div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {r.picked_up_by_me && (
                        <span className="text-sage text-[10px] uppercase tracking-wider font-semibold">✓ Praying</span>
                      )}
                      <div className="text-text-muted text-xs whitespace-nowrap">{fmtDate(r.created_at)}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="text-text-muted text-xs">
        {members.length} team {members.length === 1 ? 'member' : 'members'} on roster.
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────
// Requests tab
// ─────────────────────────────────────────────────────────────────────
function RequestsTable({ requests, onSelect, onArchive }) {
  const [filter, setFilter] = useState('all')

  const filtered = requests.filter(r => {
    if (filter === 'all') return true
    if (filter === 'followup') return r.wants_followup === true
    return r.status === filter
  })

  const filterChips = [
    { key: 'all',      label: `All (${requests.length})` },
    { key: 'followup', label: `Follow-up requested (${requests.filter(r => r.wants_followup).length})` },
    { key: 'pending',  label: `Pending (${requests.filter(r => r.status === 'pending').length})` },
    { key: 'active',   label: `Active (${requests.filter(r => r.status === 'active').length})` },
    { key: 'answered', label: `Answered (${requests.filter(r => r.status === 'answered').length})` },
    { key: 'archived', label: `Archived (${requests.filter(r => r.status === 'archived').length})` },
  ]

  function handleArchiveClick(e, req) {
    e.stopPropagation()
    onArchive(req)
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-5 overflow-x-auto pb-1">
        <div className="tab-track">
          {filterChips.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`tab-segment ${filter === f.key ? 'tab-segment-active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-black/15">
                <th className="text-left text-text-secondary text-[11px] font-medium uppercase tracking-[0.12em] px-4 py-3">Category</th>
                <th className="text-left text-text-secondary text-[11px] font-medium uppercase tracking-[0.12em] px-4 py-3">Title</th>
                <th className="text-left text-text-secondary text-[11px] font-medium uppercase tracking-[0.12em] px-4 py-3">Submitter</th>
                <th className="text-left text-text-secondary text-[11px] font-medium uppercase tracking-[0.12em] px-4 py-3">Status</th>
                <th className="text-left text-text-secondary text-[11px] font-medium uppercase tracking-[0.12em] px-4 py-3">Pickups</th>
                <th className="text-left text-text-secondary text-[11px] font-medium uppercase tracking-[0.12em] px-4 py-3">Submitted</th>
                <th className="text-right text-text-secondary text-[11px] font-medium uppercase tracking-[0.12em] px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-text-muted">No requests in this view.</td></tr>
              )}
              {filtered.map(r => (
                <tr
                  key={r.id}
                  onClick={() => onSelect(r)}
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3"><Badge type="category" value={r.category} /></td>
                  <td className="px-4 py-3 text-text-primary truncate max-w-[280px]">{r.title}</td>
                  <td className="px-4 py-3">
                    {r.wants_followup && r.submitter_name ? (
                      <div>
                        <div className="text-text-primary flex items-center gap-1.5">
                          {r.submitter_name}
                          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30 font-semibold whitespace-nowrap">Follow-up</span>
                        </div>
                        <div className="text-xs text-text-muted">{r.submitter_email}</div>
                      </div>
                    ) : (
                      <span className="text-text-muted text-xs italic">Anonymous</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><Badge type="status" value={r.status} /></td>
                  <td className="px-4 py-3 text-text-secondary">{r.pickup_count}</td>
                  <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">{fmtDate(r.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {r.status !== 'archived' && (
                      <button
                        onClick={(e) => handleArchiveClick(e, r)}
                        className="text-xs px-2.5 py-1 rounded-md border border-white/12 hover:border-warning text-text-secondary hover:text-warning transition-colors whitespace-nowrap"
                      >
                        Archive
                      </button>
                    )}
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

function RequestDetailModal({ request, onClose, onArchive, onMutated }) {
  const [pickedUp, setPickedUp] = useState(request.picked_up_by_me === true)
  const [pickingUp, setPickingUp] = useState(false)
  const [pickupCount, setPickupCount] = useState(request.pickup_count || 0)

  const [words, setWords] = useState([])
  const [wordsLoading, setWordsLoading] = useState(true)
  const [newWord, setNewWord] = useState('')
  const [postingWord, setPostingWord] = useState(false)
  const [actionError, setActionError] = useState('')

  const loadWords = useCallback(async () => {
    setWordsLoading(true)
    try {
      const res = await fetch(`/api/prophetic?request_id=${request.id}`)
      if (res.ok) {
        const data = await res.json()
        setWords(data.words || [])
      }
    } finally {
      setWordsLoading(false)
    }
  }, [request.id])

  useEffect(() => { loadWords() }, [loadWords])

  // Live updates if another team member posts a word while this modal is open.
  useRealtimeSubscription('prophetic_words', `prayer_request_id=eq.${request.id}`, () => {
    loadWords()
  })

  async function handlePickUp() {
    if (pickedUp || pickingUp) return
    setPickingUp(true)
    setActionError('')
    try {
      const res = await fetch('/api/pickups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: request.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setActionError(data.error || 'Could not pick up this request.')
        return
      }
      setPickedUp(true)
      setPickupCount((c) => c + 1)
      onMutated?.()
    } finally {
      setPickingUp(false)
    }
  }

  async function handlePostWord(e) {
    e.preventDefault()
    const content = newWord.trim()
    if (!content || postingWord) return
    setPostingWord(true)
    setActionError('')
    try {
      const res = await fetch('/api/prophetic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: request.id, content }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setActionError(data.error || 'Could not post prophetic word.')
        return
      }
      setNewWord('')
      loadWords()
      onMutated?.()
    } finally {
      setPostingWord(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div className="glass-elevated max-w-2xl w-full max-h-[88vh] overflow-y-auto p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <Badge type="category" value={request.category} />
            <h2 className="font-heading text-2xl font-bold mt-2">{request.title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center" aria-label="Close">×</button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
          <div>
            <div className="text-text-muted text-[10px] uppercase tracking-[0.18em] mb-1 font-semibold">Status</div>
            <Badge type="status" value={request.status} />
          </div>
          <div>
            <div className="text-text-muted text-[10px] uppercase tracking-[0.18em] mb-1 font-semibold">Submitted</div>
            <div className="text-text-secondary">{fmtDateTime(request.created_at)}</div>
          </div>
          <div className="col-span-2 rounded-md bg-white/3 border border-white/8 p-3">
            <div className="text-text-muted text-[10px] uppercase tracking-[0.18em] mb-1 font-semibold flex items-center gap-2">
              <span>Submitter</span>
              {request.wants_followup ? (
                <span className="text-[9px] tracking-wider px-1.5 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30 font-semibold normal-case">
                  Wants follow-up
                </span>
              ) : (
                <span className="text-[9px] tracking-wider px-1.5 py-0.5 rounded-full bg-white/8 text-text-muted border border-white/12 font-semibold normal-case">
                  Anonymous
                </span>
              )}
            </div>
            {request.wants_followup && request.submitter_name ? (
              <>
                <div className="text-text-primary">{request.submitter_name}</div>
                <div className="text-xs text-text-secondary">
                  <a href={`mailto:${request.submitter_email}`} className="hover:text-gold-light transition-colors">
                    {request.submitter_email}
                  </a>
                </div>
              </>
            ) : (
              <p className="text-text-muted italic text-sm">
                Submitter chose to remain anonymous. No name or email is shown — pray over the request as-is.
              </p>
            )}
          </div>
        </div>

        <div className="mb-5">
          <div className="text-text-muted text-[10px] uppercase tracking-[0.18em] mb-2 font-semibold">Description</div>
          <p className="text-text-primary whitespace-pre-wrap leading-relaxed">{request.description}</p>
        </div>

        {request.outcome_note && (
          <div className="mb-5 border-l-2 border-gold/60 bg-gold/5 pl-4 py-3">
            <div className="text-gold text-[10px] uppercase tracking-[0.18em] mb-1 font-semibold">Testimony</div>
            <p className="text-text-primary whitespace-pre-wrap">{request.outcome_note}</p>
            <div className="text-text-muted text-xs mt-2">Answered {fmtDate(request.outcome_at)}</div>
          </div>
        )}

        {actionError && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-danger text-sm">
            {actionError}
          </div>
        )}

        {/* Pick up — admins are also team members; let them pray over the request directly. */}
        {request.status !== 'archived' && (
          <div className="mt-6 pt-5 border-t border-white/8">
            <button
              onClick={handlePickUp}
              disabled={pickedUp || pickingUp}
              className={`w-full py-3 rounded-lg font-heading font-semibold text-sm transition-all ${
                pickedUp
                  ? 'bg-sage/20 text-sage border border-sage/40 cursor-default'
                  : 'bg-sage hover:bg-sage-dark text-white shadow-lg shadow-sage/20 disabled:opacity-50'
              }`}
            >
              {pickedUp ? '✓ You are praying for this' : pickingUp ? 'Picking up…' : 'Pick Up & Pray'}
            </button>
            <div className="text-text-muted text-xs mt-2 text-center">
              {pickupCount} {pickupCount === 1 ? 'team member has' : 'team members have'} prayed for this.
            </div>
          </div>
        )}

        {/* Prophetic words — visible & writable for any team member, admins included. */}
        <div className="mt-6 pt-5 border-t border-white/8">
          <div className="text-text-muted text-[10px] uppercase tracking-[0.18em] mb-3 font-semibold flex items-center gap-2">
            <span>Prophetic Words</span>
            <span className="text-text-muted/70 normal-case tracking-normal">({words.length})</span>
          </div>

          {wordsLoading ? (
            <div className="py-4"><LoadingSpinner /></div>
          ) : words.length === 0 ? (
            <p className="text-text-muted text-sm italic">No prophetic words yet. Be the first to share what the Lord is saying.</p>
          ) : (
            <ul className="space-y-3 mb-5">
              {words.map((w) => (
                <li key={w.id} className="border-l-2 border-spiritual/60 bg-spiritual/5 pl-3 py-2">
                  <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{w.content}</p>
                  <div className="text-text-muted text-[11px] mt-1">{fmtDateTime(w.created_at)}</div>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handlePostWord} className="space-y-2 mt-4">
            <textarea
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="Share a scripture, image, or prompting from the Lord…"
              rows={3}
              maxLength={1500}
              disabled={postingWord}
              className="resize-none text-sm"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!newWord.trim() || postingWord}
                className="px-4 py-2 rounded-lg bg-spiritual/80 hover:bg-spiritual text-white text-sm font-heading font-semibold transition-colors disabled:opacity-50"
              >
                {postingWord ? 'Posting…' : 'Post Prophetic Word'}
              </button>
            </div>
          </form>
        </div>

        {request.status !== 'archived' && (
          <div className="mt-6 pt-5 border-t border-white/8 flex justify-end">
            <button
              onClick={() => onArchive(request)}
              className="px-4 py-2 rounded-lg border border-warning/40 hover:bg-warning/10 text-warning text-sm font-medium transition-colors"
            >
              Archive request
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────
// Members tab
// ─────────────────────────────────────────────────────────────────────
function MembersTable({ members, onAdd, onOpenDetail, onUpdate, onDelete }) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="text-text-secondary text-sm">{members.length} {members.length === 1 ? 'member' : 'members'}</div>
        <button
          onClick={onAdd}
          className="px-4 py-2 rounded-lg bg-gold hover:bg-gold-light text-white text-sm font-medium transition-colors shadow-lg shadow-black/20"
        >
          + Add Member
        </button>
      </div>

      <div className="glass-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-black/15">
                <th className="text-left text-text-secondary text-[11px] font-medium uppercase tracking-[0.12em] px-4 py-3">Name</th>
                <th className="text-left text-text-secondary text-[11px] font-medium uppercase tracking-[0.12em] px-4 py-3">Email</th>
                <th className="text-left text-text-secondary text-[11px] font-medium uppercase tracking-[0.12em] px-4 py-3">Role</th>
                <th className="text-left text-text-secondary text-[11px] font-medium uppercase tracking-[0.12em] px-4 py-3">Status</th>
                <th className="text-left text-text-secondary text-[11px] font-medium uppercase tracking-[0.12em] px-4 py-3">Source</th>
                <th className="text-right text-text-secondary text-[11px] font-medium uppercase tracking-[0.12em] px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-text-muted">No team members yet.</td></tr>
              )}
              {members.map(m => (
                <tr key={m.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onOpenDetail(m.id)}
                      className="text-text-primary hover:text-gold-light font-medium underline-offset-4 hover:underline"
                    >
                      {m.display_name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{m.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      m.role === 'admin' ? 'bg-gold/20 text-gold' : 'bg-sage/20 text-sage'
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
                        className="text-xs px-2.5 py-1 rounded-md border border-white/12 hover:border-gold text-text-secondary hover:text-text-primary transition-colors"
                      >
                        {m.role === 'admin' ? 'Demote' : 'Promote'}
                      </button>
                      <button
                        onClick={() => onUpdate(m.id, { approved: !m.approved })}
                        className="text-xs px-2.5 py-1 rounded-md border border-white/12 hover:border-warning text-text-secondary hover:text-text-primary transition-colors"
                      >
                        {m.approved ? 'Suspend' : 'Activate'}
                      </button>
                      <button
                        onClick={() => onDelete(m)}
                        className="text-xs px-2.5 py-1 rounded-md border border-white/12 hover:border-danger text-text-secondary hover:text-danger transition-colors"
                      >
                        Delete
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="glass-elevated max-w-md w-full p-7 space-y-5"
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
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-white/12 text-text-secondary hover:border-white/30 text-sm">Cancel</button>
          <button
            type="submit" disabled={submitting}
            className="flex-1 py-2.5 rounded-lg bg-gold hover:bg-gold-light text-white text-sm font-semibold disabled:opacity-50"
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
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      >
        <div className="glass-elevated p-12"><LoadingSpinner /></div>
      </div>
    )
  }

  const { member, pickups = [], prophetic_words = [], stats = {} } = detail

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div className="glass-elevated max-w-2xl w-full max-h-[85vh] overflow-y-auto p-7" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-heading text-2xl font-bold">{member.display_name}</h2>
            <div className="text-text-secondary text-sm mt-1">{member.email}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center" aria-label="Close">×</button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            member.role === 'admin' ? 'bg-gold/20 text-gold' : 'bg-sage/20 text-sage'
          }`}>{member.role}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            member.approved ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
          }`}>{member.approved ? 'Active' : 'Suspended'}</span>
          {member.planning_center_id && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/8 text-text-secondary">PC linked</span>
          )}
          {!member.auth_user_id && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/8 text-text-muted">Hasn&apos;t signed in yet</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-md bg-white/3 border border-white/8 p-3 text-center">
            <div className="text-2xl font-heading font-bold text-gold">{stats.total_pickups ?? 0}</div>
            <div className="text-text-muted text-[10px] uppercase tracking-[0.15em] mt-1">Pickups</div>
          </div>
          <div className="rounded-md bg-white/3 border border-white/8 p-3 text-center">
            <div className="text-2xl font-heading font-bold text-spiritual">{stats.total_prophetic_words ?? 0}</div>
            <div className="text-text-muted text-[10px] uppercase tracking-[0.15em] mt-1">Words posted</div>
          </div>
          <div className="rounded-md bg-white/3 border border-white/8 p-3 text-center">
            <div className="text-sm font-semibold text-text-primary mt-1.5">{fmtDate(stats.last_active_at)}</div>
            <div className="text-text-muted text-[10px] uppercase tracking-[0.15em] mt-1">Last active</div>
          </div>
        </div>

        <Section title={`Pickups (${pickups.length})`}>
          {pickups.length === 0 ? <p className="text-text-muted text-sm">No pickups yet.</p> : (
            <ul className="space-y-2">
              {pickups.slice(0, 25).map(p => (
                <li key={p.id} className="rounded-md bg-white/3 border border-white/8 px-3 py-2 flex items-center justify-between gap-3">
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
      <div className="text-text-muted text-[10px] uppercase tracking-[0.18em] mb-3 font-semibold">{title}</div>
      {children}
    </div>
  )
}
