import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface ApproveParallelBranchInput {
  cmId: string
  notes: string
  actorId: string
}

export function useApproveParallelBranch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ApproveParallelBranchInput) => {
      const { data, error } = await supabase.rpc('approve_parallel_branch', {
        p_cm_id:    input.cmId,
        p_notes:    input.notes,
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
