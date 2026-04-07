import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CMWithSteps } from '@/types/domain'

export function useCM(cmNumber: string) {
  return useQuery({
    queryKey: ['cm', cmNumber],
    queryFn: async () => {
      const { data: cmData, error: cmError } = await supabase
        .from('cms')
        .select(`
          *,
          creator:profiles!created_by(id, full_name, email, department_id, role, avatar_initials),
          current_department:departments!current_dept_id(id, name, slug, display_order)
        `)
        .eq('number', cmNumber)
        .single()

      if (cmError) throw cmError

      const { data: stepsData, error: stepsError } = await supabase
        .from('cm_steps')
        .select(`
          *,
          actor:profiles!actor_id(id, full_name, email, department_id, role, avatar_initials),
          from_department:departments!from_dept_id(id, name, slug, display_order),
          to_department:departments!to_dept_id(id, name, slug, display_order)
        `)
        .eq('cm_id', cmData.id)
        .order('step_number', { ascending: true })

      if (stepsError) throw stepsError

      return {
        ...cmData,
        steps: stepsData,
      } as CMWithSteps
    },
    enabled: !!cmNumber,
  })
}
