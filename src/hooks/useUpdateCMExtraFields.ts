import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface UpdateCMExtraFieldsInput {
  cmId: string
  cmNumber: string
  internalId: string | null
  criticalAnalysisUrl: string | null
}

export function useUpdateCMExtraFields() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ cmId, internalId, criticalAnalysisUrl }: UpdateCMExtraFieldsInput) => {
      const { error } = await supabase.rpc('update_cm_extra_fields', {
        p_cm_id:                 cmId,
        p_internal_id:           internalId?.trim() ?? null,
        p_critical_analysis_url: criticalAnalysisUrl?.trim() ?? null,
      })

      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cm', variables.cmNumber] })
    },
  })
}
