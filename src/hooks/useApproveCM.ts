import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface ApproveCMInput {
  cmId: string
  toDeptId: string
  notes: string
  actorId: string
}

export function useApproveCM() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ApproveCMInput) => {
      const { data, error } = await supabase.rpc('approve_cm', {
        p_cm_id:      input.cmId,
        p_to_dept_id: input.toDeptId,
        p_notes:      input.notes,
        p_actor_id:   input.actorId,
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
