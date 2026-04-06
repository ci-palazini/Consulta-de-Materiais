import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * Assina as tabelas `cms` e `cm_steps` via Supabase Realtime e invalida
 * o cache do React Query automaticamente quando qualquer usuário faz
 * uma alteração, sem precisar de F5.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cms' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['cms'] })
          // Invalida a CM específica se tiver o id
          const id = (payload.new as { id?: string })?.id ?? (payload.old as { id?: string })?.id
          if (id) queryClient.invalidateQueries({ queryKey: ['cm', id] })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cm_steps' },
        (payload) => {
          const cmId = (payload.new as { cm_id?: string })?.cm_id ?? (payload.old as { cm_id?: string })?.cm_id
          if (cmId) queryClient.invalidateQueries({ queryKey: ['cm', cmId] })
          queryClient.invalidateQueries({ queryKey: ['cms'] })
        },
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [queryClient])
}
