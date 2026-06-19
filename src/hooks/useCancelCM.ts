import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface CancelCMInput {
  cmId: string
  notes: string
  actorId: string
}

export function useCancelCM() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CancelCMInput) => {
      const { data, error } = await supabase.rpc('cancel_cm', {
        p_cm_id:    input.cmId,
        p_notes:    input.notes,
        p_actor_id: input.actorId,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms'] })
      queryClient.invalidateQueries({ queryKey: ['cms-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['cm'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
