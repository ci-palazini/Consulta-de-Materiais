import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface UploadInput {
  cmId: string
  uploadedBy: string
  file: File
  onProgress?: (percent: number) => void
}

export function useUploadAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ cmId, uploadedBy, file, onProgress }: UploadInput) => {
      const uuid = crypto.randomUUID()
      const storagePath = `${cmId}/${uuid}-${file.name}`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('cm-attachments')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      onProgress?.(90)

      // Insert metadata row
      const { error: insertError } = await supabase
        .from('cm_attachments')
        .insert({
          cm_id: cmId,
          uploaded_by: uploadedBy,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
          storage_path: storagePath,
        })

      if (insertError) {
        // Rollback storage upload on DB error
        await supabase.storage.from('cm-attachments').remove([storagePath])
        throw insertError
      }

      onProgress?.(100)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cm_attachments', variables.cmId] })
    },
  })
}
