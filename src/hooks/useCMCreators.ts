import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface CMCreator {
  id: string
  full_name: string
}

export function useCMCreators() {
  return useQuery({
    queryKey: ['cm-creators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cms')
        .select('created_by, creator:profiles!created_by(id, full_name)')

      if (error) throw error

      const seen = new Set<string>()
      const creators: CMCreator[] = []

      for (const row of data ?? []) {
        const c = row.creator as unknown as CMCreator
        if (c && !seen.has(c.id)) {
          seen.add(c.id)
          creators.push(c)
        }
      }

      return creators.sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'))
    },
    staleTime: 5 * 60 * 1000,
  })
}
