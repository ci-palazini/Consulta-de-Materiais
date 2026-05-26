import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CM } from '@/types/domain'

export const PAGE_SIZE = 20

export interface CMFilters {
  search?: string
  status?: 'all' | 'open' | 'closed'
  createdBy?: string
}

export function useCMsPaginated(page: number, filters: CMFilters) {
  return useQuery({
    queryKey: ['cms-paginated', page, filters],
    queryFn: async () => {
      let query = supabase
        .from('cms')
        .select(
          `*,
          creator:profiles!created_by(id, full_name, email, department_id, role, avatar_initials),
          current_department:departments!current_dept_id(id, name, slug, display_order)`,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (filters.search) {
        const q = filters.search.replace(/%/g, '\\%').replace(/_/g, '\\_')
        query = query.or(
          `number.ilike.%${q}%,title.ilike.%${q}%,description.ilike.%${q}%,internal_id.ilike.%${q}%`
        )
      }

      if (filters.status === 'open') {
        query = query.eq('status', 'open')
      } else if (filters.status === 'closed') {
        query = query.neq('status', 'open')
      }

      if (filters.createdBy && filters.createdBy !== 'all') {
        query = query.eq('created_by', filters.createdBy)
      }

      const { data, error, count } = await query
      if (error) throw error
      return { cms: (data ?? []) as CM[], total: count ?? 0 }
    },
    placeholderData: (prev) => prev,
  })
}
