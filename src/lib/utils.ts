import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Department color map by slug
export const DEPT_COLORS: Record<string, string> = {
  vendas: 'bg-blue-500 text-white',
  eng_aplicacao: 'bg-purple-500 text-white',
  eng_produto: 'bg-indigo-500 text-white',
  qualidade: 'bg-green-500 text-white',
  planejamento: 'bg-cyan-500 text-white',
  suprimentos: 'bg-orange-500 text-white',
  eng_processos: 'bg-pink-500 text-white',
  custos: 'bg-amber-500 text-white',
  pricing: 'bg-rose-500 text-white',
}

export const DEPT_COLORS_LIGHT: Record<string, string> = {
  vendas: 'bg-blue-50 text-blue-700',
  eng_aplicacao: 'bg-purple-50 text-purple-700',
  eng_produto: 'bg-indigo-50 text-indigo-700',
  qualidade: 'bg-green-50 text-green-700',
  planejamento: 'bg-cyan-50 text-cyan-700',
  suprimentos: 'bg-orange-50 text-orange-700',
  eng_processos: 'bg-pink-50 text-pink-700',
  custos: 'bg-amber-50 text-amber-700',
  pricing: 'bg-rose-50 text-rose-700',
}

export const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  closed_viable: 'bg-green-100 text-green-800',
  closed_not_viable: 'bg-red-100 text-red-800',
}
