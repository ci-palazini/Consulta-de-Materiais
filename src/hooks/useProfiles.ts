import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/domain'

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*')

      if (error) throw error

      return data as Profile[]
    },
  })
}

export function useProfilesByDepartment(departmentId: string | undefined) {
  return useQuery({
    queryKey: ['profiles', departmentId],
    queryFn: async () => {
      if (!departmentId) return []

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('department_id', departmentId)

      if (error) throw error

      return data as Profile[]
    },
    enabled: !!departmentId,
  })
}
