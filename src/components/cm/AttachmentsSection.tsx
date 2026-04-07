import { useRef, useState, useCallback } from 'react'
import { UploadCloud, Download, Trash2, FileText, FileImage, File, FileSpreadsheet, Paperclip, X } from 'lucide-react'
import { useCMAttachments, getSignedUrl } from '@/hooks/useCMAttachments'
import { useUploadAttachment } from '@/hooks/useUploadAttachment'
import { useDeleteAttachment } from '@/hooks/useDeleteAttachment'
import type { Profile } from '@/types/domain'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const SPREADSHEET_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.oasis.opendocument.spreadsheet',
  'text/csv',
]

function FileTypeIcon({ mimeType }: { mimeType: string }) {
  const style = { flexShrink: 0 }
  if (mimeType.startsWith('image/')) return <FileImage size={16} style={{ ...style, color: '#7c3aed' }} />
  if (mimeType === 'application/pdf') return <FileText size={16} style={{ ...style, color: '#dc2626' }} />
  if (SPREADSHEET_MIMES.includes(mimeType)) return <FileSpreadsheet size={16} style={{ ...style, color: '#15803d' }} />
  return <File size={16} style={{ ...style, color: '#64748b' }} />
}

interface UploadingFile {
  name: string
  progress: number
  error?: string
}

interface Props {
  cmId: string
  profile: Profile
}

export function AttachmentsSection({ cmId, profile }: Props) {
  const { data: attachments = [], isLoading } = useCMAttachments(cmId)
  const uploadMutation = useUploadAttachment()
  const deleteMutation = useDeleteAttachment()

  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState<UploadingFile[]>([])
  const [sizeError, setSizeError] = useState<string | null>(null)

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setSizeError(null)

    const toUpload = Array.from(files)
    const oversized = toUpload.find(f => f.size > MAX_FILE_SIZE)
    if (oversized) {
      setSizeError(`"${oversized.name}" excede o limite de 20 MB.`)
      return
    }

    for (const file of toUpload) {
      const entry: UploadingFile = { name: file.name, progress: 0 }
      setUploading(prev => [...prev, entry])

      try {
        await uploadMutation.mutateAsync({
          cmId,
          uploadedBy: profile.id,
          file,
          onProgress: (p) => {
            setUploading(prev => prev.map(u => u.name === file.name ? { ...u, progress: p } : u))
          },
        })
        setUploading(prev => prev.filter(u => u.name !== file.name))
      } catch {
        setUploading(prev => prev.map(u => u.name === file.name ? { ...u, error: 'Falha no upload' } : u))
        setTimeout(() => setUploading(prev => prev.filter(u => u.name !== file.name)), 3000)
      }
    }
  }, [cmId, profile.id, uploadMutation])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleDownload = async (storagePath: string, fileName: string) => {
    const url = await getSignedUrl(storagePath)
    if (!url) return
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = fileName
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank')
    }
  }

  const handleDelete = (id: string, storagePath: string) => {
    deleteMutation.mutate({ id, cmId, storagePath })
  }

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: 12,
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      padding: '1.5rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.125rem' }}>
        <Paperclip size={14} style={{ color: '#94a3b8' }} />
        <h2 style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
          Anexos
        </h2>
        {attachments.length > 0 && (
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '1px 7px',
            borderRadius: 999,
            backgroundColor: '#f1f5f9',
            color: '#64748b',
          }}>
            {attachments.length}
          </span>
        )}
      </div>

      {/* Dropzone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `1.5px dashed ${dragging ? '#2563eb' : '#cbd5e1'}`,
          borderRadius: 10,
          padding: '1.25rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          backgroundColor: dragging ? '#eff6ff' : '#fafafa',
          transition: 'all 0.15s',
          marginBottom: '1rem',
        }}
      >
        <UploadCloud size={22} style={{ color: dragging ? '#2563eb' : '#94a3b8', transition: 'color 0.15s' }} />
        <p style={{ fontSize: 12.5, color: dragging ? '#2563eb' : '#64748b', fontWeight: 500, textAlign: 'center' }}>
          Arraste arquivos aqui ou <span style={{ color: '#2563eb', textDecoration: 'underline' }}>clique para selecionar</span>
        </p>
        <p style={{ fontSize: 11, color: '#94a3b8' }}>Qualquer tipo de arquivo · máx. 20 MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Size error */}
      {sizeError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0.5rem 0.75rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          marginBottom: '0.75rem',
        }}>
          <p style={{ fontSize: 12.5, color: '#dc2626', flex: 1 }}>{sizeError}</p>
          <button onClick={() => setSizeError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex', padding: 0 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Uploading progress items */}
      {uploading.map((u) => (
        <div key={u.name} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0.625rem 0.75rem',
          backgroundColor: u.error ? '#fef2f2' : '#f8fafc',
          border: `1px solid ${u.error ? '#fecaca' : '#e2e8f0'}`,
          borderRadius: 8,
          marginBottom: '0.5rem',
        }}>
          <File size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12.5, color: '#0f172a', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>
            {u.error ? (
              <p style={{ fontSize: 11, color: '#dc2626' }}>{u.error}</p>
            ) : (
              <div style={{ marginTop: 4, height: 3, borderRadius: 999, backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${u.progress}%`, backgroundColor: '#2563eb', borderRadius: 999, transition: 'width 0.2s' }} />
              </div>
            )}
          </div>
          {!u.error && <p style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>{u.progress}%</p>}
        </div>
      ))}

      {/* Attachment list */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #e2e8f0', borderTopColor: '#2563eb', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : attachments.length === 0 && uploading.length === 0 ? (
        <p style={{ fontSize: 12.5, color: '#94a3b8', textAlign: 'center', padding: '0.5rem 0' }}>
          Nenhum anexo adicionado
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {attachments.map((att) => {
            const isOwner = att.uploaded_by === profile.id
            const isDeleting = deleteMutation.isPending && (deleteMutation.variables as { id: string })?.id === att.id

            return (
              <div
                key={att.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '0.625rem 0.75rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  opacity: isDeleting ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                <FileTypeIcon mimeType={att.mime_type} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#0f172a',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {att.file_name}
                  </p>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                    {formatSize(att.file_size)}
                    {' · '}
                    por <span style={{ color: '#64748b', fontWeight: 500 }}>{(att.uploader as { full_name?: string })?.full_name ?? 'Desconhecido'}</span>
                    {' · '}
                    {new Date(att.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => handleDownload(att.storage_path, att.file_name)}
                    title="Download"
                    style={{
                      padding: '0.3rem',
                      borderRadius: 6,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: '#64748b',
                      display: 'flex',
                      transition: 'background-color 0.15s, color 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.color = '#2563eb' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b' }}
                  >
                    <Download size={14} />
                  </button>
                  {isOwner && (
                    <button
                      onClick={() => handleDelete(att.id, att.storage_path)}
                      disabled={isDeleting}
                      title="Excluir"
                      style={{
                        padding: '0.3rem',
                        borderRadius: 6,
                        border: 'none',
                        background: 'transparent',
                        cursor: isDeleting ? 'not-allowed' : 'pointer',
                        color: '#94a3b8',
                        display: 'flex',
                        transition: 'background-color 0.15s, color 0.15s',
                      }}
                      onMouseEnter={(e) => { if (!isDeleting) { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.color = '#dc2626' } }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94a3b8' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
