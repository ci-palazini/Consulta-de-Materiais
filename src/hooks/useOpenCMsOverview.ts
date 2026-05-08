import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface OpenCMRow {
  id: string
  number: string
  title: string
  description: string
  internal_id: string | null
  workflow_stage: string
  current_dept_id: string | null
  created_at: string
  updated_at: string
  creator?: { full_name: string } | { full_name: string }[] | null
  current_department?: { name: string } | { name: string }[] | null
}

interface CMStepRow {
  cm_id: string
  to_dept_id: string | null
  action: string
  created_at: string
}

interface ParallelBranchRow {
  cm_id: string
  created_at: string
  department?: { name: string } | { name: string }[] | null
}

const STAGE_ENTRY_ACTIONS = new Set([
  'created',
  'approved',
  'forwarded',
  'returned',
  'jumped',
  'contest_response',
  'contested',
])

export interface OpenCMOverviewItem {
  id: string
  number: string
  title: string
  description: string
  internalId: string | null
  workflowStage: string
  requestedBy: string
  currentQueue: string
  stageSince: string
  openedAt: string
}

function getParallelQueue(branches: ParallelBranchRow[]) {
  if (branches.length === 0) {
    return 'Análise paralela'
  }

  const names = branches
    .map((branch) => {
      if (!branch.department) return null
      return Array.isArray(branch.department)
        ? branch.department[0]?.name
        : branch.department.name
    })
    .filter((name): name is string => !!name)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))

  if (names.length === 0) {
    return 'Análise paralela'
  }

  return `Paralelo: ${names.join(', ')}`
}

function getOldestDate(dates: string[], fallback: string) {
  if (dates.length === 0) return fallback

  let oldest = dates[0]
  for (let i = 1; i < dates.length; i += 1) {
    if (new Date(dates[i]).getTime() < new Date(oldest).getTime()) {
      oldest = dates[i]
    }
  }

  return oldest
}

export function useOpenCMsOverview() {
  return useQuery({
    queryKey: ['cms', 'open-overview'],
    queryFn: async () => {
      const { data: openCMs, error: cmError } = await supabase
        .from('cms')
        .select(`
          id,
          number,
          title,
          description,
          internal_id,
          workflow_stage,
          current_dept_id,
          created_at,
          updated_at,
          creator:profiles!created_by(full_name),
          current_department:departments!current_dept_id(name)
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: true })

      if (cmError) throw cmError

      const cms = (openCMs ?? []) as OpenCMRow[]
      if (cms.length === 0) return [] as OpenCMOverviewItem[]

      const cmIds = cms.map((cm) => cm.id)

      const [{ data: stepsData, error: stepsError }, { data: branchesData, error: branchesError }] = await Promise.all([
        supabase
          .from('cm_steps')
          .select('cm_id, to_dept_id, action, created_at')
          .in('cm_id', cmIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('cm_parallel_branches')
          .select('cm_id, created_at, department:departments!dept_id(name)')
          .in('cm_id', cmIds)
          .eq('status', 'pending'),
      ])

      if (stepsError) throw stepsError
      if (branchesError) throw branchesError

      const allSteps = (stepsData ?? []) as CMStepRow[]
      const allBranches = (branchesData ?? []) as ParallelBranchRow[]

      const stepsByCM = new Map<string, CMStepRow[]>()
      for (const step of allSteps) {
        const existing = stepsByCM.get(step.cm_id)
        if (existing) existing.push(step)
        else stepsByCM.set(step.cm_id, [step])
      }

      const branchesByCM = new Map<string, ParallelBranchRow[]>()
      for (const branch of allBranches) {
        const existing = branchesByCM.get(branch.cm_id)
        if (existing) existing.push(branch)
        else branchesByCM.set(branch.cm_id, [branch])
      }

      const overview = cms.map((cm) => {
        const cmSteps = stepsByCM.get(cm.id) ?? []
        const pendingBranches = branchesByCM.get(cm.id) ?? []
        const isParallel = cm.workflow_stage === 'parallel'
        const creator = Array.isArray(cm.creator) ? cm.creator[0] : cm.creator
        const currentDepartment = Array.isArray(cm.current_department)
          ? cm.current_department[0]
          : cm.current_department

        let currentQueue = currentDepartment?.name || 'Sem departamento definido'
        let stageSince = cm.updated_at

        if (isParallel) {
          currentQueue = getParallelQueue(pendingBranches)
          stageSince = getOldestDate(
            pendingBranches.map((branch) => branch.created_at),
            cm.updated_at,
          )
        } else if (cm.current_dept_id) {
          const stepForCurrentDept = cmSteps.find(
            (step) => step.to_dept_id === cm.current_dept_id && STAGE_ENTRY_ACTIONS.has(step.action),
          )
          stageSince = stepForCurrentDept?.created_at ?? cm.updated_at
        }

        return {
          id: cm.id,
          number: cm.number,
          title: cm.title,
          description: cm.description,
          internalId: cm.internal_id,
          workflowStage: cm.workflow_stage,
          requestedBy: creator?.full_name || 'Sem solicitante',
          currentQueue,
          stageSince,
          openedAt: cm.created_at,
        } satisfies OpenCMOverviewItem
      })

      return overview.sort(
        (a, b) => new Date(a.stageSince).getTime() - new Date(b.stageSince).getTime(),
      )
    },
  })
}

