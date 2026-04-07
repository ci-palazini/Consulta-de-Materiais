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
      const { error: storageError } = await supabase.storage
        .from('cm-attachments')
        .remove([storagePath])

      if (storageError) throw storageError

      const { error: dbError } = await supabase
        .from('cm_attachments')
        .delete()
        .eq('id', id)

      if (dbError) throw dbError
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cm_attachments', variables.cmId] })
    },
  })
}
