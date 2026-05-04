'use client'

import TeamSidebar from '@/components/TeamSidebar'
import PrayerWeekPanel from '@/components/PrayerWeekPanel'

/**
 * Team-facing Prayer Week / Day-Night view.
 * Shows coverage stats and the slot grid so any team member can see
 * who's praying when. Admin-only actions (releasing a signup, viewing
 * email addresses) are reserved for /team/admin → Prayer Initiative tab.
 */
export default function TeamPrayerWeekPage() {
  return (
    <div className="min-h-screen page-bg flex">
      <TeamSidebar />

      <main className="flex-1 px-4 sm:px-6 py-8 md:pl-8 md:pt-8 pt-20 max-w-6xl w-full mx-auto">
        <div className="mb-6">
          <p className="text-gold uppercase tracking-[0.3em] text-[11px] font-semibold mb-2">Prayer Team</p>
          <h1 className="font-heading text-3xl font-bold">Day/Night coverage</h1>
          <p className="text-text-secondary text-sm mt-1.5 max-w-xl">
            Live view of who&apos;s on the watch. Admins can manage signups from the Admin panel.
          </p>
        </div>

        <PrayerWeekPanel mode="team" />
      </main>
    </div>
  )
}
