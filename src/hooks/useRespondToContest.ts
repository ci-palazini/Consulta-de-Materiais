import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface RespondToContestInput {
  cmId: string
  response: 'ok' | 'refused'
  notes: string
  actorId: string
}

export function useRespondToContest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: RespondToContestInput) => {
      const { data, error } = await supabase.rpc('respond_to_contest', {
        p_cm_id:     input.cmId,
        p_response:  input.response,
        p_notes:     input.notes,
        p_actor_id:  input.actorId,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms'] })
      queryClient.invalidateQueries({ queryKey: ['cm'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
