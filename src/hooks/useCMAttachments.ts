import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CMAttachment } from '@/types/domain'

export function useCMAttachments(cmId: string) {
  return useQuery({
    queryKey: ['cm_attachments', cmId],
    queryFn: async (): Promise<CMAttachment[]> => {
      const { data, error } = await supabase
        .from('cm_attachments')
        .select('*, uploader:profiles(id, full_name, avatar_initials)')
        .eq('cm_id', cmId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as CMAttachment[]
    },
    enabled: !!cmId,
  })
}

export async function getSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('cm-attachments')
    .createSignedUrl(storagePath, 3600)

  if (error || !data) return null
  return data.signedUrl
}
