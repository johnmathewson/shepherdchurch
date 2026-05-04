'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Persistent sidebar for the prayer team. Apple Mail / Reminders style.
 *
 * Props:
 *  - filter: current filter key (e.g. 'all', 'pending', ...)
 *  - onFilter: callback when a filter item is clicked
 *  - counts: { all, pending, active, my_pickups, answered, archived }
 *
 * On desktop the sidebar is always visible. On mobile a hamburger button
 * toggles a slide-in sheet.
 */
export default function TeamSidebar({ filter, onFilter, counts = {}, open: controlledOpen, onOpenChange }) {
  const pathname = usePathname()
  const [internalOpen, setInternalOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  // Controlled mode: parent owns open state and provides its own trigger.
  // Uncontrolled mode (default): sidebar manages itself with its built-in pill button.
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (v) => onOpenChange?.(v) : setInternalOpen

  // Close mobile sheet on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Detect admin status so the Admin link only renders for admins. A non-admin
  // who clicked it would just hit a 403 — better to hide it entirely.
  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/check')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (!cancelled && data?.is_admin) setIsAdmin(true) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const filters = [
    { key: 'all',         label: 'All Requests',     count: counts.all },
    { key: 'pending',     label: 'Awaiting Prayer',  count: counts.pending,     accent: 'danger' },
    { key: 'active',      label: 'Being Prayed For', count: counts.active },
    { key: 'my_pickups',  label: 'My Pickups',       count: counts.my_pickups,  accent: 'sage' },
    { key: 'answered',    label: 'Answered',         count: counts.answered,    accent: 'gold' },
    { key: 'archived',    label: 'Archived',         count: counts.archived },
  ]

  const navLinks = [
    { href: '/team',             label: 'Prayer Wall' },
    { href: '/team/prayer-week', label: 'Day/Night' },
    ...(isAdmin ? [{ href: '/team/admin', label: 'Admin' }] : []),
  ]

  const onPrayerWall = pathname === '/team' || pathname?.startsWith('/team/request')

  return (
    <>
      {/* Mobile toggle button — only rendered in uncontrolled mode.
          When parent controls the sidebar (e.g. has its own topbar trigger),
          we skip rendering this so we don't double up. */}
      {!isControlled && !open && (
        <button
          onClick={() => setOpen(true)}
          className="md:hidden fixed top-4 left-4 z-40 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gold text-white shadow-lg shadow-black/40 font-medium text-sm"
          aria-label="Open menu"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Menu
        </button>
      )}

      {/* Mobile-only soft backdrop. pointer-events: none so taps on the cards
          underneath still register; tapping the X in the sidebar header (or
          navigating away) closes it. */}
      {open && (
        <div
          aria-hidden="true"
          className="md:hidden fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.35)', pointerEvents: 'none' }}
        />
      )}

      {/* Sidebar — inline styles for the critical positioning so this can't
          be defeated by a stale Tailwind build cache. We've been bitten by
          that before (the auth.js cache miss), and `position: fixed` is
          load-bearing for the overlay behavior to work at all. */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '16rem',
          height: '100vh',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 300ms ease',
        }}
        className="glass-nav border-r border-border md:!translate-x-0">
        {/* Header */}
        <div className="px-5 py-5 border-b border-border-glass flex items-center justify-between">
          <Link href="/team" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="font-heading text-sm font-semibold">Prayer Team</span>
          </Link>
          {/* Close button — mobile only */}
          <button
            onClick={() => setOpen(false)}
            className="md:hidden w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/5"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter list — only show on the prayer wall page */}
        {onPrayerWall && onFilter && (
          <div className="flex-1 overflow-y-auto p-2">
            <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-[0.15em] text-text-muted font-semibold">
              Requests
            </div>
            <nav className="space-y-0.5">
              {filters.map(f => {
                const active = filter === f.key
                const accentClass =
                  f.accent === 'danger' && (f.count ?? 0) > 0 ? 'text-danger' :
                  f.accent === 'gold' && (f.count ?? 0) > 0 ? 'text-gold' :
                  f.accent === 'sage' && (f.count ?? 0) > 0 ? 'text-sage' :
                  'text-text-muted'
                return (
                  <button
                    key={f.key}
                    onClick={() => { onFilter(f.key); setOpen(false) }}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors
                      ${active
                        ? 'bg-gold/15 text-gold font-medium'
                        : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'}
                    `}
                  >
                    <span>{f.label}</span>
                    {typeof f.count === 'number' && (
                      <span className={`text-xs ${active ? 'text-gold' : accentClass}`}>{f.count}</span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>
        )}

        {/* Section nav (always visible) */}
        <div className={`p-2 ${onPrayerWall ? 'border-t border-border-glass' : 'flex-1'}`}>
          <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-[0.15em] text-text-muted font-semibold">
            Sections
          </div>
          <nav className="space-y-0.5">
            {navLinks.map(l => {
              const active =
                l.href === '/team' ? onPrayerWall :
                pathname === l.href || pathname?.startsWith(l.href + '/')
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`
                    block px-3 py-2 rounded-md text-sm transition-colors
                    ${active
                      ? 'bg-white/8 text-text-primary font-medium'
                      : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'}
                  `}
                >
                  {l.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-border-glass">
          <button
            onClick={async () => {
              await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'logout' }),
              })
              window.location.href = '/'
            }}
            className="w-full text-left px-3 py-2 text-text-muted hover:text-danger text-sm rounded-md hover:bg-white/5 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
