export const CMStatus = {
  Open: 'open',
  ClosedViable: 'closed_viable',
  ClosedNotViable: 'closed_not_viable',
} as const

export const CMAction = {
  Created: 'created',
  Forwarded: 'forwarded',          // legacy
  Returned: 'returned',            // legacy
  Approved: 'approved',
  Refused: 'refused',
  DispatchedParallel: 'dispatched_parallel',
  Jumped: 'jumped',
  Contested: 'contested',
  ContestResponse: 'contest_response',
  Finalized: 'finalized',
} as const

export const CMWorkflowStage = {
  // Item Novo
  NewItemProjetos:    'new_item_projetos',
  NewItemSuprimentos: 'new_item_suprimentos',
  NewItemParallel:    'new_item_parallel',
  NewItemCustos:      'new_item_custos',
  NewItemPricing:     'new_item_pricing',
  // Item Existente
  ExistingPricing1:   'existing_pricing_1',
  ExistingCustos:     'existing_custos',
  ExistingParallel:   'existing_parallel',
  ExistingCustos2:    'existing_custos_2',
  ExistingPricing2:   'existing_pricing_2',
  // Final stages (both flows)
  VendasFinalize:     'vendas_finalize',
  Contestation:       'contestation',
  Finalized:          'finalized',
  Refused:            'refused',
} as const

export const DepartmentSlug = {
  Vendas:        'vendas',
  EngProjetos:   'eng_projetos',
  Qualidade:     'qualidade',
  Planejamento:  'planejamento',
  Suprimentos:   'suprimentos',
  EngProcessos:  'eng_processos',
  Custos:        'custos',
  Pricing:       'pricing',
} as const

export const UserRole = {
  Member: 'member',
  Admin: 'admin',
} as const

export type CMStatusType         = typeof CMStatus[keyof typeof CMStatus]
export type CMActionType         = typeof CMAction[keyof typeof CMAction]
export type CMWorkflowStageType  = typeof CMWorkflowStage[keyof typeof CMWorkflowStage]
export type DepartmentSlugType   = typeof DepartmentSlug[keyof typeof DepartmentSlug]
export type UserRoleType         = typeof UserRole[keyof typeof UserRole]
