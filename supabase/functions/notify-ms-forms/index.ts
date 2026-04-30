import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUBMIT_URL    = Deno.env.get('MS_FORMS_SUBMIT_URL')!
const FIELD_TO      = Deno.env.get('MS_FORMS_FIELD_ID_TO')!
const FIELD_SUBJECT = Deno.env.get('MS_FORMS_FIELD_ID_SUBJECT')!
const FIELD_BODY    = Deno.env.get('MS_FORMS_FIELD_ID_BODY')!

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])
const RETRY_DELAYS_MS = [800, 1800]
const REQUEST_TIMEOUT_MS = 15000

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function toRecipientList(rows: { email: string }[]): string {
  const validEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const seen = new Set<string>()
  const valid: string[] = []

  rows.forEach(({ email }) => {
    const normalized = email?.trim().toLowerCase()
    if (!normalized || !validEmailRegex.test(normalized) || seen.has(normalized)) return
    seen.add(normalized)
    valid.push(normalized)
  })

  return valid.join(';')
}

async function getEmailsByDept(deptId: string): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('department_id', deptId)

  if (error) throw new Error(`Erro ao buscar emails: ${error.message}`)
  return toRecipientList(data ?? [])
}

async function getEmailByUserId(userId: string): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single()

  if (error) throw new Error(`Erro ao buscar email do usuário: ${error.message}`)
  return toRecipientList(data ? [data] : [])
}

async function getAdminEmails(): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('role', 'admin')

  if (error) throw new Error(`Erro ao buscar admins: ${error.message}`)
  return toRecipientList(data ?? [])
}

async function submitToMsForms(payload: unknown): Promise<void> {
  for (let attempt = 1; attempt <= RETRY_DELAYS_MS.length + 1; attempt++) {
    const retryDelay = RETRY_DELAYS_MS[attempt - 1] ?? 0

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      let res: Response
      try {
        res = await fetch(SUBMIT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeout)
      }

      if (res.ok) return

      const errText = await res.text()
      const isRetryable = RETRYABLE_STATUS.has(res.status)

      if (!isRetryable || attempt > RETRY_DELAYS_MS.length) {
        throw new Error(`MS Forms retornou ${res.status}: ${errText}`)
      }

      console.warn(`[notify-ms-forms] tentativa ${attempt} falhou com ${res.status}; tentando novamente em ${retryDelay}ms`)
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === 'AbortError'
      const canRetry = isAbort || err instanceof TypeError
      if (!canRetry || attempt > RETRY_DELAYS_MS.length) throw err
      console.warn(`[notify-ms-forms] tentativa ${attempt} falhou por rede/timeout; tentando novamente em ${retryDelay}ms`)
    }

    await delay(retryDelay)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const { to_dept_id, to_user_id, subject, body_html, dev_mode, extra_emails } = await req.json()

    if ((!to_dept_id && !to_user_id) || !subject || !body_html) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: to_dept_id ou to_user_id, subject, body_html' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    let to: string
    if (dev_mode) {
      to = await getAdminEmails()
    } else if (to_user_id) {
      to = await getEmailByUserId(to_user_id)
    } else {
      to = await getEmailsByDept(to_dept_id)
    }

    if (Array.isArray(extra_emails) && extra_emails.length > 0) {
      const existing = to ? to.split(';').filter(Boolean) : []
      to = toRecipientList([...existing, ...extra_emails].map(email => ({ email })))
    }

    if (!to) {
      return new Response(
        JSON.stringify({ error: dev_mode ? 'Nenhum admin encontrado' : 'Nenhum destinatário encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const now = new Date().toISOString()
    const answers = JSON.stringify([
      { questionId: FIELD_TO,      answer1: to },
      { questionId: FIELD_SUBJECT, answer1: dev_mode ? `[DEV] ${subject}` : subject },
      { questionId: FIELD_BODY,    answer1: body_html },
    ])

    await submitToMsForms({ startDate: now, submitDate: now, answers })

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[notify-ms-forms]', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
