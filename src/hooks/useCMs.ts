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
      let query = supabase.from('cms').select('*')

      if (options?.status) {
        query = query.eq('status', options.status)
      }

      if (options?.departmentId) {
        query = query.eq('current_dept_id', options.departmentId)
      }

      if (options?.createdBy) {
        query = query.eq('created_by', options.createdBy)
      }

      const { data, error } = await query.order('created_at', {
        ascending: false,
      })

      if (error) throw error

      return data as CM[]
    },
  })
}
