import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface ContestCMInput {
  cmId: string
  stepId: string
  reason: string
  actorId: string
}

export function useContestCM() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ContestCMInput) => {
      const { data, error } = await supabase.rpc('contest_cm', {
        p_cm_id:    input.cmId,
        p_step_id:  input.stepId,
        p_reason:   input.reason,
        p_actor_id: input.actorId,
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
