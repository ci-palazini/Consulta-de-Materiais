import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CMWorkflowStageType } from '@/types/enums'

interface JumpExistingStageInput {
  cmId: string
  targetStage: CMWorkflowStageType
  notes: string
  actorId: string
  parallelDeptIds?: string[]
}

export function useJumpExistingStage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: JumpExistingStageInput) => {
      const { data, error } = await supabase.rpc('jump_existing_stage', {
        p_cm_id: input.cmId,
        p_target_stage: input.targetStage,
        p_notes: input.notes,
        p_actor_id: input.actorId,
        p_parallel_dept_ids: input.parallelDeptIds?.length ? input.parallelDeptIds : null,
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
