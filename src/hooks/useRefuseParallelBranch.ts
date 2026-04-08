import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface RefuseParallelBranchInput {
  cmId: string
  notes: string
  actorId: string
}

export function useRefuseParallelBranch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: RefuseParallelBranchInput) => {
      const { data, error } = await supabase.rpc('refuse_parallel_branch', {
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
