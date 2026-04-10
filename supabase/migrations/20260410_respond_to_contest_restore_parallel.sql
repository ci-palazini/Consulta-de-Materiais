-- ============================================================================
-- Fix respond_to_contest to properly handle parallel branch contestation
--
-- Before: always sent CM to vendas_finalize, regardless of origin
-- After:  when the contestation came from a parallel branch refusal AND
--         the response is 'ok', resets all refused branches to pending and
--         returns the CM to the correct parallel stage (new_item_parallel or
--         existing_parallel). Non-parallel contestations keep the old behavior.
-- ============================================================================

DROP FUNCTION IF EXISTS respond_to_contest(uuid, text, text, uuid);

CREATE OR REPLACE FUNCTION respond_to_contest(
  p_cm_id     uuid,
  p_response  text,
  p_notes     text,
  p_actor_id  uuid
)
RETURNS TABLE (
  id          uuid,
  cm_id       uuid,
  step_number integer,
  from_dept_id uuid,
  to_dept_id  uuid,
  action      text,
  actor_id    uuid,
  notes       text,
  created_at  timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cm              cms%ROWTYPE;
  v_step            cm_steps%ROWTYPE;
  v_actor_dept_id   uuid;
  v_vendas_id       uuid;
  v_branch_type     text;
BEGIN
  IF p_response NOT IN ('ok', 'refused') THEN
    RAISE EXCEPTION 'p_response must be ''ok'' or ''refused''';
  END IF;

  SELECT * INTO v_cm FROM cms c WHERE c.id = p_cm_id AND c.status = 'open';
  IF v_cm.id IS NULL THEN
    RAISE EXCEPTION 'CM not found or not open';
  END IF;

  IF v_cm.workflow_stage != 'contestation' THEN
    RAISE EXCEPTION 'respond_to_contest only valid at contestation stage';
  END IF;

  SELECT p.department_id INTO v_actor_dept_id FROM profiles p WHERE p.id = p_actor_id;
  SELECT d.id INTO v_vendas_id FROM departments d WHERE d.slug = 'vendas';

  -- Detect if the contestation originated from a parallel branch refusal
  -- (the contested_step_id on the CM matches a step_id on a parallel branch)
  SELECT b.branch_type INTO v_branch_type
  FROM cm_parallel_branches b
  WHERE b.step_id = v_cm.contested_step_id;

  INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
  VALUES (p_cm_id, v_actor_dept_id, v_vendas_id, 'contest_response', p_actor_id,
          COALESCE(p_notes, '') || ' [Resposta: ' || p_response || ']')
  RETURNING
    cm_steps.id, cm_steps.cm_id, cm_steps.step_number, cm_steps.from_dept_id,
    cm_steps.to_dept_id, cm_steps.action, cm_steps.actor_id, cm_steps.notes, cm_steps.created_at
  INTO v_step;

  IF p_response = 'ok' AND v_branch_type IS NOT NULL THEN
    -- Contest accepted from a parallel stage:
    -- Reset all refused branches (refuser + cancelled) back to pending
    -- and return the CM to the correct parallel stage

    UPDATE cm_parallel_branches
    SET status = 'pending', step_id = NULL, resolved_at = NULL
    WHERE cm_id = p_cm_id AND status = 'refused';

    UPDATE cms
    SET current_dept_id   = NULL,
        workflow_stage     = v_branch_type,
        contested_step_id  = NULL,
        contest_reason     = NULL
    WHERE cms.id = p_cm_id;

    -- Notify all pending parallel branches
    INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
    SELECT p.id, p_cm_id, v_step.id, 'cm_assigned',
           'Contestação aceita. A análise paralela da CM ' || v_cm.number || ' foi reaberta'
    FROM cm_parallel_branches b
    JOIN profiles p ON p.department_id = b.dept_id
    WHERE b.cm_id = p_cm_id AND b.status = 'pending';

    -- Notify Vendas
    INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
    SELECT p.id, p_cm_id, v_step.id, 'cm_contest_response',
           (SELECT d.name FROM departments d WHERE d.id = v_actor_dept_id) ||
           ' aceitou a contestação. A análise paralela da CM ' || v_cm.number || ' foi reaberta'
    FROM profiles p WHERE p.department_id = v_vendas_id;

  ELSE
    -- Normal flow (non-parallel, or parallel but response = 'refused')
    UPDATE cms
    SET current_dept_id   = v_vendas_id,
        workflow_stage     = 'vendas_finalize',
        contested_step_id  = NULL,
        contest_reason     = NULL
    WHERE cms.id = p_cm_id;

    INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
    SELECT p.id, p_cm_id, v_step.id, 'cm_contest_response',
           (SELECT d.name FROM departments d WHERE d.id = v_actor_dept_id) ||
           ' respondeu à contestação da CM ' || v_cm.number
    FROM profiles p WHERE p.department_id = v_vendas_id;
  END IF;

  RETURN QUERY SELECT
    v_step.id, v_step.cm_id, v_step.step_number, v_step.from_dept_id,
    v_step.to_dept_id, v_step.action, v_step.actor_id, v_step.notes, v_step.created_at;
END;
$$;
