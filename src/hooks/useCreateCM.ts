import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CM } from '@/types/domain'

interface CreateCMInput {
  title: string
  description: string
  createdBy: string
  isNewItem: boolean
  internalId?: string
  criticalAnalysisUrl?: string
}

export function useCreateCM() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateCMInput) => {
      const { data: rows, error } = await supabase.rpc('create_cm', {
        p_title:                 input.title,
        p_description:           input.description,
        p_actor_id:              input.createdBy,
        p_is_new_item:           input.isNewItem,
        p_internal_id:           input.internalId?.trim() ?? null,
        p_critical_analysis_url: input.criticalAnalysisUrl?.trim() ?? null,
      })

      if (error) throw error

      const row = Array.isArray(rows) ? rows[0] : rows
      if (!row?.id) throw new Error('Resposta inesperada da função create_cm')

      const { data: cm, error: fetchError } = await supabase
        .from('cms')
        .select('*')
        .eq('id', row.id)
        .single()

      if (fetchError) return row as CM
      return cm as CM
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms'] })
    },
  })
}
