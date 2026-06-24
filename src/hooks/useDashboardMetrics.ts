import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface MetricsMember {
  id: string
  full_name: string
  email: string
  role: 'member' | 'admin'
  avatar_initials: string
}

export interface MetricsDepartment {
  id: string
  name: string
  slug: string
  avg_hours: number | null
  median_hours: number | null
  holds: number
  open_now: number
  members: MetricsMember[]
}

export interface DashboardMetrics {
  generated_at: string
  totals: {
    total: number
    open_count: number
    closed_count: number
    cancelled_count: number
    viable_count: number
    not_viable_count: number
  }
  step_counts: {
    refused: number
    contested: number
    parallel_dispatches: number
    auto_finalized: number
  }
  lead_time: {
    avg_days: number | null
    median_days: number | null
    n: number
  }
  departments: MetricsDepartment[]
  monthly: { month: string; created: number; finalized: number }[]
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_metrics')
      if (error) throw error
      return data as unknown as DashboardMetrics
    },
    staleTime: 5 * 60 * 1000,
  })
}
