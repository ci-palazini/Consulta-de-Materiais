import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface DeleteInput {
  id: string
  cmId: string
  storagePath: string
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, storagePath }: DeleteInput) => {
      // Delete DB record first — RLS enforces ownership here
      const { error: dbError } = await supabase
        .from('cm_attachments')
        .delete()
        .eq('id', id)

      if (dbError) throw dbError

      // Remove from storage (best-effort — DB record is already gone)
      await supabase.storage.from('cm-attachments').remove([storagePath])
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cm_attachments', variables.cmId] })
    },
  })
}
