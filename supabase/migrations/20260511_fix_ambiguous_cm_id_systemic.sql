-- Systemic fix for recurring PL/pgSQL ambiguity in RPCs that return TABLE.
-- OUT params like "id/cm_id" become variables; unqualified references can fail
-- with "column reference ... is ambiguous" at runtime.
--
-- Strategy:
-- 1) Force column-preferred resolution inside function bodies.
-- 2) Remove ambiguous conflict-target column references in upserts.
-- 3) Keep explicit qualification in WHERE clauses touching cm_parallel_branches.

CREATE OR REPLACE FUNCTION public.dispatch_parallel(
  p_cm_id uuid,
  p_dept_ids uuid[],
  p_next_dept_id uuid,
  p_notes text,
  p_actor_id uuid
)
RETURNS TABLE(id uuid, cm_id uuid, step_number integer, from_dept_id uuid, to_dept_id uuid, action text, actor_id uuid, notes text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_cm            cms%ROWTYPE;
  v_step          cm_steps%ROWTYPE;
  v_actor_dept_id uuid;
  v_dept_id       uuid;
  v_dept_names    text;
BEGIN
  SELECT * INTO v_cm FROM cms c WHERE c.id = p_cm_id AND c.status = 'open';
  IF v_cm.id IS NULL THEN
    RAISE EXCEPTION 'CM not found or not open';
  END IF;

  IF v_cm.workflow_stage != 'open' THEN
    RAISE EXCEPTION 'dispatch_parallel only valid at open stage';
  END IF;

  IF array_length(p_dept_ids, 1) IS NULL OR array_length(p_dept_ids, 1) < 1 THEN
    RAISE EXCEPTION 'Must provide at least one department for parallel analysis';
  END IF;

  IF p_next_dept_id IS NULL THEN
    RAISE EXCEPTION 'Must specify consolidation department (p_next_dept_id)';
  END IF;

  SELECT p.department_id INTO v_actor_dept_id FROM profiles p WHERE p.id = p_actor_id;

  IF v_cm.current_dept_id IS NULL OR v_cm.current_dept_id != v_actor_dept_id THEN
    RAISE EXCEPTION 'Your department does not currently hold this CM';
  END IF;

  SELECT string_agg(d.name, ', ' ORDER BY d.name) INTO v_dept_names
  FROM departments d WHERE d.id = ANY(p_dept_ids);

  INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
  VALUES (p_cm_id, v_actor_dept_id, v_actor_dept_id, 'dispatched_parallel', p_actor_id,
          COALESCE(p_notes || ' — ', '') || 'Encaminhada para: ' || v_dept_names)
  RETURNING * INTO v_step;

  UPDATE cms
  SET current_dept_id       = NULL,
      workflow_stage        = 'parallel',
      parallel_next_dept_id = p_next_dept_id
  WHERE cms.id = p_cm_id;

  FOR v_dept_id IN SELECT unnest(p_dept_ids)
  LOOP
    INSERT INTO cm_parallel_branches (cm_id, dept_id, branch_type)
    VALUES (p_cm_id, v_dept_id, 'parallel')
    ON CONFLICT ON CONSTRAINT cm_parallel_branches_cm_id_dept_id_branch_type_key DO UPDATE
      SET status = 'pending', resolved_at = NULL, step_id = NULL;

    INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
    SELECT p.id, p_cm_id, v_step.id, 'cm_assigned',
           'CM ' || v_cm.number || ' aguarda sua análise em paralelo'
    FROM profiles p WHERE p.department_id = v_dept_id;
  END LOOP;

  RETURN QUERY SELECT
    v_step.id, v_step.cm_id, v_step.step_number, v_step.from_dept_id,
    v_step.to_dept_id, v_step.action, v_step.actor_id, v_step.notes, v_step.created_at;
END;
$function$;


CREATE OR REPLACE FUNCTION public.respond_to_contest(
  p_cm_id uuid,
  p_response text,
  p_notes text,
  p_actor_id uuid
)
RETURNS TABLE(id uuid, cm_id uuid, step_number integer, from_dept_id uuid, to_dept_id uuid, action text, actor_id uuid, notes text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_cm            cms%ROWTYPE;
  v_step          cm_steps%ROWTYPE;
  v_actor_dept_id uuid;
  v_vendas_id     uuid;
  v_is_parallel   boolean;
BEGIN
  IF p_response NOT IN ('ok', 'refused') THEN
    RAISE EXCEPTION 'p_response must be ''ok'' or ''refused''';
  END IF;

  SELECT * INTO v_cm FROM cms c WHERE c.id = p_cm_id AND c.status = 'open';
  IF v_cm.id IS NULL THEN RAISE EXCEPTION 'CM not found or not open'; END IF;
  IF v_cm.workflow_stage != 'contested' THEN
    RAISE EXCEPTION 'respond_to_contest only valid at contested stage';
  END IF;

  SELECT p.department_id INTO v_actor_dept_id FROM profiles p WHERE p.id = p_actor_id;
  SELECT d.id INTO v_vendas_id FROM departments d WHERE d.slug = 'vendas';

  SELECT EXISTS (
    SELECT 1 FROM cm_parallel_branches b WHERE b.step_id = v_cm.contested_step_id
  ) INTO v_is_parallel;

  INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
  VALUES (p_cm_id, v_actor_dept_id, v_vendas_id, 'contest_response', p_actor_id,
          COALESCE(p_notes, '') || ' [Resposta: ' || p_response || ']')
  RETURNING cm_steps.id, cm_steps.cm_id, cm_steps.step_number, cm_steps.from_dept_id,
            cm_steps.to_dept_id, cm_steps.action, cm_steps.actor_id, cm_steps.notes, cm_steps.created_at
  INTO v_step;

  IF p_response = 'ok' AND v_is_parallel THEN
    UPDATE cm_parallel_branches cpb
    SET status = 'pending', step_id = NULL, resolved_at = NULL
    WHERE cpb.cm_id = p_cm_id AND cpb.status = 'refused';

    UPDATE cms SET current_dept_id = NULL, workflow_stage = 'parallel',
      pre_refusal_stage = NULL, contested_step_id = NULL, contest_reason = NULL
    WHERE cms.id = p_cm_id;

    INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
    SELECT p.id, p_cm_id, v_step.id, 'cm_assigned',
           'Contestação aceita. Análise paralela da CM ' || v_cm.number || ' reaberta'
    FROM cm_parallel_branches b JOIN profiles p ON p.department_id = b.dept_id
    WHERE b.cm_id = p_cm_id AND b.status = 'pending';

    INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
    SELECT p.id, p_cm_id, v_step.id, 'cm_contest_response',
           (SELECT d.name FROM departments d WHERE d.id = v_actor_dept_id) ||
           ' aceitou a contestação. Análise paralela da CM ' || v_cm.number || ' reaberta'
    FROM profiles p WHERE p.department_id = v_vendas_id;

  ELSIF p_response = 'ok' THEN
    -- Always restore to 'open' so the department can route freely (to any dept or Vendas)
    UPDATE cms
    SET current_dept_id   = v_actor_dept_id,
        workflow_stage    = 'open',
        pre_refusal_stage = NULL,
        status            = 'open',
        viability         = NULL,
        finalization_notes = NULL,
        finalized_at      = NULL,
        finalized_by      = NULL,
        contested_step_id = NULL,
        contest_reason    = NULL
    WHERE cms.id = p_cm_id;

    INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
    SELECT p.id, p_cm_id, v_step.id, 'cm_assigned',
           'Contestação aceita. CM ' || v_cm.number || ' retornou para reavaliação — encaminhe para o próximo destino'
    FROM profiles p WHERE p.department_id = v_actor_dept_id;

    INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
    SELECT p.id, p_cm_id, v_step.id, 'cm_contest_response',
           (SELECT d.name FROM departments d WHERE d.id = v_actor_dept_id) ||
           ' aceitou a contestação da CM ' || v_cm.number || ' e irá reavaliar'
    FROM profiles p WHERE p.department_id = v_vendas_id;

  ELSE
    UPDATE cms SET current_dept_id = v_vendas_id, workflow_stage = 'vendas_finalize',
      pre_refusal_stage = NULL, contested_step_id = NULL, contest_reason = NULL
    WHERE cms.id = p_cm_id;

    INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
    SELECT p.id, p_cm_id, v_step.id, 'cm_contest_response',
           (SELECT d.name FROM departments d WHERE d.id = v_actor_dept_id) ||
           ' manteve sua análise na CM ' || v_cm.number
    FROM profiles p WHERE p.department_id = v_vendas_id;
  END IF;

  RETURN QUERY SELECT v_step.id, v_step.cm_id, v_step.step_number, v_step.from_dept_id,
    v_step.to_dept_id, v_step.action, v_step.actor_id, v_step.notes, v_step.created_at;
END;
$function$;
