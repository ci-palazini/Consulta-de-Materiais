import { supabase } from '@/lib/supabase'
import type { CM, Department } from '@/types/domain'

export interface NotifyCMPayload {
  cm: CM
  toDept: Department
  fromDeptName: string
  actorName: string
  notes?: string
  eventType: 'created' | 'forwarded' | 'approved' | 'refused' | 'dispatched_parallel' | 'contested' | 'contest_response'
}

function buildBodyHtml(payload: NotifyCMPayload): string {
  const { cm, toDept, fromDeptName, actorName, notes, eventType } = payload

  const colorMap: Record<string, { accent: string; bg: string; color: string; label: string }> = {
    created:           { accent: '#16a34a', bg: '#dcfce7', color: '#15803d', label: 'Nova CM' },
    approved:          { accent: '#2563eb', bg: '#dbeafe', color: '#1d4ed8', label: 'CM Aprovada' },
    forwarded:         { accent: '#2563eb', bg: '#dbeafe', color: '#1d4ed8', label: 'CM Encaminhada' },
    refused:           { accent: '#dc2626', bg: '#fee2e2', color: '#b91c1c', label: 'CM Recusada' },
    dispatched_parallel: { accent: '#7c3aed', bg: '#ede9fe', color: '#6d28d9', label: 'Análise Paralela' },
    contested:         { accent: '#ea580c', bg: '#ffedd5', color: '#c2410c', label: 'Etapa Contestada' },
    contest_response:  { accent: '#0891b2', bg: '#cffafe', color: '#0e7490', label: 'Resposta à Contestação' },
  }
  const c = colorMap[eventType] ?? colorMap.forwarded
  const accentColor = c.accent
  const tagBg       = c.bg
  const tagColor    = c.color
  const tagLabel    = c.label

  const notesBlock = notes?.trim()
    ? `<div style="margin-top:20px;padding:14px 16px;background:#fafafa;border-left:3px solid #e2e8f0;border-radius:0 6px 6px 0;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;">Observações</p>
        <p style="margin:0;font-size:13.5px;color:#374151;line-height:1.5;">${notes}</p>
       </div>`
    : ''

  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:580px;margin:0 auto;background:#f8fafc;padding:24px 16px;">

  <!-- Card principal -->
  <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:${accentColor};padding:24px 28px;">
      <span style="display:inline-block;background:rgba(255,255,255,0.2);color:#fff;font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;padding:3px 10px;border-radius:20px;margin-bottom:10px;">${tagLabel}</span>
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;line-height:1.3;">${cm.title}</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">${cm.number} &nbsp;·&nbsp; ${new Date().toLocaleString('pt-BR')}</p>
    </div>

    <!-- Body -->
    <div style="padding:24px 28px;">

      <!-- Fluxo de departamentos -->
      <div style="display:flex;align-items:center;gap:0;margin-bottom:24px;">
        <div style="flex:1;background:#f1f5f9;border-radius:8px;padding:10px 14px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">De</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#475569;">${fromDeptName}</p>
        </div>
        <div style="padding:0 10px;font-size:20px;color:#94a3b8;">&#8594;</div>
        <div style="flex:1;background:${tagBg};border-radius:8px;padding:10px 14px;text-align:center;">
          <p style="margin:0;font-size:11px;color:${tagColor};font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Para</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:${tagColor};">${toDept.name}</p>
        </div>
      </div>

      <!-- Divisor -->
      <hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 20px;">

      <!-- Descrição -->
      <div style="margin-bottom:20px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;">Descrição</p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${cm.description}</p>
      </div>

      <!-- Observações (se houver) -->
      ${notesBlock}

      <!-- Botão de acesso direto -->
      <div style="margin-top:24px;text-align:center;">
        <a href="https://ci-hiter-cms.vercel.app/cms/${cm.number}"
           style="display:inline-block;background:${accentColor};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:11px 28px;border-radius:8px;">
          Abrir ${cm.number}
        </a>
      </div>

    </div>

    <!-- Footer do card -->
    <div style="padding:14px 28px;background:#f8fafc;border-top:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:30px;height:30px;border-radius:50%;background:${accentColor};display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;">${actorName.charAt(0).toUpperCase()}</div>
        <div>
          <p style="margin:0;font-size:12px;font-weight:600;color:#374151;">${actorName}</p>
          <p style="margin:0;font-size:11px;color:#94a3b8;">${fromDeptName}</p>
        </div>
      </div>
      <span style="background:${tagBg};color:${tagColor};font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;">${cm.number}</span>
    </div>

  </div>

  <!-- Rodapé -->
  <p style="text-align:center;margin:16px 0 0;font-size:11px;color:#94a3b8;">Enviado automaticamente pelo sistema de Consultas de Materiais.</p>

</div>`.trim()
}

/**
 * Dispara notificação por email via MS Forms → Power Automate.
 * Fire-and-forget: erros são logados mas não bloqueiam o fluxo da aplicação.
 */
export async function notifyCM(payload: NotifyCMPayload): Promise<void> {
  try {
    const prefixMap: Record<string, string> = {
      created:            'Nova CM',
      approved:           'CM Aprovada',
      forwarded:          'CM Encaminhada',
      refused:            'CM Recusada',
      dispatched_parallel:'Análise Paralela',
      contested:          'Etapa Contestada',
      contest_response:   'Resposta à Contestação',
    }
    const prefix = prefixMap[payload.eventType] ?? 'CM'
    const eventLabel = `[${prefix}] ${payload.cm.number}: ${payload.cm.title} → ${payload.toDept.name}`

    const body = buildBodyHtml(payload)

    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'

    const { error } = await supabase.functions.invoke('notify-ms-forms', {
      body: {
        to_dept_id: payload.toDept.id,
        subject:    eventLabel,
        body_html:  body,
        ...(isLocalhost && { dev_mode: true }),
      },
    })

    if (error) console.error('[notifyCM] Edge Function error:', error)
  } catch (err) {
    console.error('[notifyCM] Unexpected error:', err)
  }
}
