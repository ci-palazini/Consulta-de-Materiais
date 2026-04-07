import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useNotificationStore } from '@/store/notificationStore'
import type { Notification } from '@/types/domain'

export function useNotifications(userId: string | undefined) {
  const queryClient = useQueryClient()
  const { setUnreadCount } = useNotificationStore()

  const notificationsQuery = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!userId) return []

      const { data, error } = await supabase
        .from('notifications')
        .select('*, cm:cms!cm_id(number)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Update unread count in store
      const unreadCount = (data as Notification[]).filter((n) => !n.read).length
      setUnreadCount(unreadCount)

      return data as Notification[]
    },
    enabled: !!userId,
  })

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!userId) return

    const subscription = supabase
      .channel(`notifications:user_id=eq.${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Increment unread count and refetch
          useNotificationStore.getState().incrementUnreadCount()
          queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [userId, queryClient])

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) throw error
    },
    onSuccess: () => {
      useNotificationStore.getState().resetUnreadCount()
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
    },
  })

  return {
    notifications: notificationsQuery.data ?? [],
    isLoading: notificationsQuery.isLoading,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
  }
}
