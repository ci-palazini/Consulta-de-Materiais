import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/domain'

export function useAllProfiles() {
  return useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, department:departments(*)')
        .order('full_name', { ascending: true })
      if (error) throw error
      return data as Profile[]
    },
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      email,
      password,
      fullName,
      departmentId,
      role,
    }: {
      email: string
      password: string
      fullName: string
      departmentId: string
      role: 'member' | 'admin'
    }) => {
      // Create auth user (trigger will auto-create profile)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, department_id: departmentId } },
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('Usuário não criado')

      // Update the auto-created profile with dept and role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName, department_id: departmentId, role })
        .eq('id', authData.user.id)
      if (profileError) throw profileError

      return authData.user
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-profiles'] }),
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      fullName,
      departmentId,
      role,
    }: {
      id: string
      fullName: string
      departmentId: string
      role: 'member' | 'admin'
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, department_id: departmentId, role })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-profiles'] })
      qc.invalidateQueries({ queryKey: ['profiles'] })
    },
  })
}

export function useDeleteProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('profiles').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-profiles'] }),
  })
}
