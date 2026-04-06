import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Department } from '@/types/domain'

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('display_order', { ascending: true })
      if (error) throw error
      return data as Department[]
    },
  })
}

export function useUpdateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name, display_order }: { id: string; name: string; display_order: number }) => {
      const { data, error } = await supabase
        .from('departments')
        .update({ name, display_order })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  })
}
