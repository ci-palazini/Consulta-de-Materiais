import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CM } from '@/types/domain'

interface UseCMsOptions {
  status?: string
  departmentId?: string
  createdBy?: string
}

export function useCMs(options?: UseCMsOptions) {
  return useQuery({
    queryKey: ['cms', options],
    queryFn: async () => {
      let query = supabase
        .from('cms')
        .select(`
          *,
          creator:profiles!created_by(id, full_name, email, department_id, role, avatar_initials),
          current_department:departments!current_dept_id(id, name, slug, display_order)
        `)

      if (options?.status) {
        query = query.eq('status', options.status)
      }

      if (options?.createdBy) {
        query = query.eq('created_by', options.createdBy)
      }

      if (options?.departmentId) {
        // Fetch sequential CMs at this dept
        const { data: sequential, error: seqError } = await query
          .eq('current_dept_id', options.departmentId)
          .order('created_at', { ascending: false })

        if (seqError) throw seqError

        // Also fetch CMs in parallel where this dept has a pending branch
        const { data: parallelBranches, error: branchError } = await supabase
          .from('cm_parallel_branches')
          .select('cm_id')
          .eq('dept_id', options.departmentId)
          .eq('status', 'pending')

        if (branchError) throw branchError

        if (parallelBranches && parallelBranches.length > 0) {
          const parallelCmIds = parallelBranches.map(b => b.cm_id)

          const { data: parallelCMs, error: parallelError } = await supabase
            .from('cms')
            .select(`
              *,
              creator:profiles!created_by(id, full_name, email, department_id, role, avatar_initials),
              current_department:departments!current_dept_id(id, name, slug, display_order)
            `)
            .in('id', parallelCmIds)
            .order('created_at', { ascending: false })

          if (parallelError) throw parallelError

          // Merge and deduplicate
          const merged = [...(sequential ?? []), ...(parallelCMs ?? [])]
          const seen = new Set<string>()
          return merged.filter(cm => {
            if (seen.has(cm.id)) return false
            seen.add(cm.id)
            return true
          }) as CM[]
        }

        return (sequential ?? []) as CM[]
      }

      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      return data as CM[]
    },
  })
}
