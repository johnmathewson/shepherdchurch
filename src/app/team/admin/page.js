'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function AdminPage() {
  const [allMembers, setAllMembers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(false)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [membersRes, statsRes] = await Promise.all([
        fetch('/api/team?action=all_members'),
        fetch('/api/team?action=stats'),
      ])

      if (membersRes.status === 401 || membersRes.status === 403) {
        setAuthError(true)
        return
      }

      const membersData = await membersRes.json()
      const statsData = await statsRes.json()

      setAllMembers(membersData.members || [])
      setStats(statsData.stats || null)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (authError) {
    return (
      <div className="min-h-screen page-bg">
        <Nav variant="team" />
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <h1 className="font-heading text-2xl font-bold mb-4">Admin Access Required</h1>
          <p className="text-text-secondary mb-8">You need admin privileges to access this page.</p>
          <Link href="/team/login" className="px-8 py-3.5 bg-purple hover:bg-purple-light text-white font-heading font-semibold rounded-lg transition-all inline-block">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen page-bg">
      <Nav variant="team">
        <Link href="/team" className="text-text-secondary hover:text-text-primary text-sm">Team Dashboard</Link>
      </Nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="font-heading text-3xl font-bold mb-8">Admin Panel</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'members', label: 'All Members' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key ? 'bg-purple text-white' : 'glass text-text-secondary hover:border-purple/40'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Overview */}
            {tab === 'overview' && stats && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in">
                {[
                  { label: 'Total Requests', value: stats.total_requests, color: 'text-text-primary' },
                  { label: 'Pending Requests', value: stats.pending_requests, color: 'text-warning' },
                  { label: 'Active Requests', value: stats.active_requests, color: 'text-sage' },
                  { label: 'Total Pickups', value: stats.total_pickups, color: 'text-purple' },
                  { label: 'Prophetic Words', value: stats.total_prophetic_words, color: 'text-spiritual' },
                  { label: 'Active Members', value: stats.active_members, color: 'text-physical' },
                ].map((stat) => (
                  <div key={stat.label} className="glass rounded-lg p-5">
                    <div className={`text-3xl font-heading font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-text-muted text-sm mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* All members */}
            {tab === 'members' && (
              <div className="animate-fade-in">
                <div className="glass rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-text-secondary text-xs font-medium px-5 py-3">Name</th>
                        <th className="text-left text-text-secondary text-xs font-medium px-5 py-3">Email</th>
                        <th className="text-left text-text-secondary text-xs font-medium px-5 py-3">Role</th>
                        <th className="text-left text-text-secondary text-xs font-medium px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allMembers.map((member) => (
                        <tr key={member.id} className="border-b border-border/50">
                          <td className="px-5 py-3 text-sm">{member.display_name}</td>
                          <td className="px-5 py-3 text-sm text-text-secondary">{member.email}</td>
                          <td className="px-5 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              member.role === 'admin' ? 'bg-purple/20 text-purple' : 'bg-sage/20 text-sage'
                            }`}>
                              {member.role}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              member.approved ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                            }`}>
                              {member.approved ? 'Active' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
