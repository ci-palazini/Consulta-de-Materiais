export const CMStatus = {
  Open: 'open',
  ClosedViable: 'closed_viable',
  ClosedNotViable: 'closed_not_viable',
} as const

export const CMAction = {
  Created: 'created',
  Forwarded: 'forwarded',
  Returned: 'returned',
  Finalized: 'finalized',
} as const

export const DepartmentSlug = {
  Vendas: 'vendas',
  EngAplicacao: 'eng_aplicacao',
  EngProduto: 'eng_produto',
  Qualidade: 'qualidade',
  Planejamento: 'planejamento',
  Suprimentos: 'suprimentos',
  EngProcessos: 'eng_processos',
  Custos: 'custos',
  Pricing: 'pricing',
} as const

export const UserRole = {
  Member: 'member',
  Admin: 'admin',
} as const

export type CMStatusType = typeof CMStatus[keyof typeof CMStatus]
export type CMActionType = typeof CMAction[keyof typeof CMAction]
export type DepartmentSlugType = typeof DepartmentSlug[keyof typeof DepartmentSlug]
export type UserRoleType = typeof UserRole[keyof typeof UserRole]
