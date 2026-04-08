import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface DispatchParallelExistingInput {
  cmId: string
  deptIds: string[]
  notes: string
  actorId: string
}

export function useDispatchParallelExisting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: DispatchParallelExistingInput) => {
      const { data, error } = await supabase.rpc('dispatch_parallel_existing', {
        p_cm_id:    input.cmId,
        p_dept_ids: input.deptIds,
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
