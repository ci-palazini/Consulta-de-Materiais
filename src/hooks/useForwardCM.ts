import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface ForwardCMInput {
  cmId: string
  toDeptId: string
  notes: string
  actorId: string
}

export function useForwardCM() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ForwardCMInput) => {
      const { data, error } = await supabase.rpc('forward_cm', {
        p_cm_id: input.cmId,
        p_to_dept_id: input.toDeptId,
        p_notes: input.notes,
        p_actor_id: input.actorId,
      })

      if (error) throw error

      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cms'] })
      queryClient.invalidateQueries({ queryKey: ['cm'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
