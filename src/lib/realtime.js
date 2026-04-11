'use client'

import { useEffect, useRef } from 'react'
import { createBrowserSupabaseClient } from './supabase'

export function useRealtimeSubscription(table, filter, onEvent) {
  const supabaseRef = useRef(null)

  useEffect(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createBrowserSupabaseClient()
    }

    const channelName = `realtime-${table}-${filter || 'all'}-${Date.now()}`
    let channelConfig = {
      event: '*',
      schema: 'public',
      table,
    }

    if (filter) {
      channelConfig.filter = filter
    }

    const channel = supabaseRef.current
      .channel(channelName)
      .on('postgres_changes', channelConfig, (payload) => {
        onEvent({
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
        })
      })
      .subscribe()

    return () => {
      supabaseRef.current?.removeChannel(channel)
    }
  }, [table, filter])
}
