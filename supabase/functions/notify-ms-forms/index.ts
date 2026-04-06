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

async function getEmailsByDept(deptId: string): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('department_id', deptId)

  if (error) throw new Error(`Erro ao buscar emails: ${error.message}`)
  return (data ?? []).map((p: { email: string }) => p.email).join(';')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const { to_dept_id, subject, body_html } = await req.json()

    if (!to_dept_id || !subject || !body_html) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: to_dept_id, subject, body_html' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const to = await getEmailsByDept(to_dept_id)
    if (!to) {
      return new Response(
        JSON.stringify({ error: 'Nenhum usuário no departamento de destino' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const now = new Date().toISOString()
    const answers = JSON.stringify([
      { questionId: FIELD_TO,      answer1: to },
      { questionId: FIELD_SUBJECT, answer1: subject },
      { questionId: FIELD_BODY,    answer1: body_html },
    ])

    const res = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: now, submitDate: now, answers }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`MS Forms retornou ${res.status}: ${err}`)
    }

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
