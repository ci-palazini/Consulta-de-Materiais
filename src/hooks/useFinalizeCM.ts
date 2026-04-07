import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface FinalizeCMInput {
  cmId: string
  viability: boolean
  ovNumber?: string | null
  notes: string
  actorId: string
}

export function useFinalizeCM() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: FinalizeCMInput) => {
      const { data, error } = await supabase.rpc('finalize_cm', {
        p_cm_id: input.cmId,
        p_viability: input.viability,
        p_ov_number: input.ovNumber || null,
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
