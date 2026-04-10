-- ============================================================================
-- Track pre_refusal_stage so respond_to_contest can restore the correct stage
--
-- Problem: when a dept accepts a contestation (responds 'ok'), the CM was
-- always going to vendas_finalize — but it should return to the refusing dept
-- at the correct workflow stage so they can re-evaluate normally.
--
-- Solution:
--   1. Add pre_refusal_stage column to cms
--   2. refuse_cm / refuse_parallel_branch save the current stage before closing
--   3. respond_to_contest uses it to restore the CM correctly:
--        ok + parallel  → reset branches, back to parallel stage
--        ok + sequential → back to refusing dept at pre_refusal_stage
--        refused         → vendas_finalize (dept maintains refusal)
-- ============================================================================

ALTER TABLE cms ADD COLUMN IF NOT EXISTS pre_refusal_stage text;

DROP FUNCTION IF EXISTS refuse_cm(uuid, text, uuid);
DROP FUNCTION IF EXISTS refuse_parallel_branch(uuid, text, uuid);
DROP FUNCTION IF EXISTS respond_to_contest(uuid, text, text, uuid);

CREATE OR REPLACE FUNCTION refuse_cm(
  p_cm_id    uuid,
  p_notes    text,
  p_actor_id uuid
)
RETURNS TABLE (
  id uuid, cm_id uuid, step_number integer, from_dept_id uuid,
  to_dept_id uuid, action text, actor_id uuid, notes text, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_cm            cms%ROWTYPE;
  v_step          cm_steps%ROWTYPE;
  v_actor_dept_id uuid;
BEGIN
  SELECT * INTO v_cm FROM cms c WHERE c.id = p_cm_id AND c.status = 'open';
  IF v_cm.id IS NULL THEN RAISE EXCEPTION 'CM not found or not open'; END IF;

  SELECT p.department_id INTO v_actor_dept_id FROM profiles p WHERE p.id = p_actor_id;

  INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
  VALUES (p_cm_id, v_actor_dept_id, v_actor_dept_id, 'refused', p_actor_id, p_notes)
  RETURNING cm_steps.id, cm_steps.cm_id, cm_steps.step_number, cm_steps.from_dept_id,
            cm_steps.to_dept_id, cm_steps.action, cm_steps.actor_id, cm_steps.notes, cm_steps.created_at
  INTO v_step;

  UPDATE cm_parallel_branches SET status = 'refused', resolved_at = now()
  WHERE cm_id = p_cm_id AND status = 'pending';

  UPDATE cms
  SET status = 'closed_not_viable', current_dept_id = v_actor_dept_id,
      pre_refusal_stage = v_cm.workflow_stage, workflow_stage = 'refused',
      viability = false, finalization_notes = p_notes,
      finalized_at = now(), finalized_by = p_actor_id
  WHERE cms.id = p_cm_id;

  INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
  SELECT p.id, p_cm_id, v_step.id, 'cm_refused',
         'CM ' || v_cm.number || ' foi recusada. Motivo: ' || p_notes
  FROM profiles p WHERE p.department_id = (SELECT d.id FROM departments d WHERE d.slug = 'vendas');

  RETURN QUERY SELECT v_step.id, v_step.cm_id, v_step.step_number, v_step.from_dept_id,
    v_step.to_dept_id, v_step.action, v_step.actor_id, v_step.notes, v_step.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION refuse_parallel_branch(
  p_cm_id    uuid,
  p_notes    text,
  p_actor_id uuid
)
RETURNS TABLE (
  id uuid, cm_id uuid, step_number integer, from_dept_id uuid,
  to_dept_id uuid, action text, actor_id uuid, notes text, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_cm            cms%ROWTYPE;
  v_step          cm_steps%ROWTYPE;
  v_actor_dept_id uuid;
  v_branch        cm_parallel_branches%ROWTYPE;
BEGIN
  SELECT * INTO v_cm FROM cms c WHERE c.id = p_cm_id AND c.status = 'open';
  IF v_cm.id IS NULL THEN RAISE EXCEPTION 'CM not found or not open'; END IF;

  SELECT p.department_id INTO v_actor_dept_id FROM profiles p WHERE p.id = p_actor_id;

  SELECT * INTO v_branch FROM cm_parallel_branches b
  WHERE b.cm_id = p_cm_id AND b.dept_id = v_actor_dept_id AND b.status = 'pending';
  IF v_branch.id IS NULL THEN RAISE EXCEPTION 'No pending parallel branch for this department'; END IF;

  INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
  VALUES (p_cm_id, v_actor_dept_id, v_actor_dept_id, 'refused', p_actor_id, p_notes)
  RETURNING cm_steps.id, cm_steps.cm_id, cm_steps.step_number, cm_steps.from_dept_id,
            cm_steps.to_dept_id, cm_steps.action, cm_steps.actor_id, cm_steps.notes, cm_steps.created_at
  INTO v_step;

  UPDATE cm_parallel_branches SET status = 'refused', resolved_at = now(), step_id = v_step.id
  WHERE cm_parallel_branches.id = v_branch.id;

  UPDATE cm_parallel_branches SET status = 'refused', resolved_at = now()
  WHERE cm_id = p_cm_id AND status = 'pending';

  UPDATE cms
  SET status = 'closed_not_viable', current_dept_id = v_actor_dept_id,
      pre_refusal_stage = v_cm.workflow_stage, workflow_stage = 'refused',
      viability = false, finalization_notes = p_notes,
      finalized_at = now(), finalized_by = p_actor_id
  WHERE cms.id = p_cm_id;

  INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
  SELECT p.id, p_cm_id, v_step.id, 'cm_refused',
         'CM ' || v_cm.number || ' foi recusada na análise paralela. Motivo: ' || p_notes
  FROM profiles p WHERE p.department_id = (SELECT d.id FROM departments d WHERE d.slug = 'vendas');

  RETURN QUERY SELECT v_step.id, v_step.cm_id, v_step.step_number, v_step.from_dept_id,
    v_step.to_dept_id, v_step.action, v_step.actor_id, v_step.notes, v_step.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION respond_to_contest(
  p_cm_id    uuid,
  p_response text,
  p_notes    text,
  p_actor_id uuid
)
RETURNS TABLE (
  id uuid, cm_id uuid, step_number integer, from_dept_id uuid,
  to_dept_id uuid, action text, actor_id uuid, notes text, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_cm            cms%ROWTYPE;
  v_step          cm_steps%ROWTYPE;
  v_actor_dept_id uuid;
  v_vendas_id     uuid;
  v_branch_type   text;
BEGIN
  IF p_response NOT IN ('ok', 'refused') THEN
    RAISE EXCEPTION 'p_response must be ''ok'' or ''refused''';
  END IF;

  SELECT * INTO v_cm FROM cms c WHERE c.id = p_cm_id AND c.status = 'open';
  IF v_cm.id IS NULL THEN RAISE EXCEPTION 'CM not found or not open'; END IF;
  IF v_cm.workflow_stage != 'contestation' THEN
    RAISE EXCEPTION 'respond_to_contest only valid at contestation stage';
  END IF;

  SELECT p.department_id INTO v_actor_dept_id FROM profiles p WHERE p.id = p_actor_id;
  SELECT d.id INTO v_vendas_id FROM departments d WHERE d.slug = 'vendas';

  SELECT b.branch_type INTO v_branch_type FROM cm_parallel_branches b
  WHERE b.step_id = v_cm.contested_step_id;

  INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
  VALUES (p_cm_id, v_actor_dept_id, v_vendas_id, 'contest_response', p_actor_id,
          COALESCE(p_notes, '') || ' [Resposta: ' || p_response || ']')
  RETURNING cm_steps.id, cm_steps.cm_id, cm_steps.step_number, cm_steps.from_dept_id,
            cm_steps.to_dept_id, cm_steps.action, cm_steps.actor_id, cm_steps.notes, cm_steps.created_at
  INTO v_step;

  IF p_response = 'ok' AND v_branch_type IS NOT NULL THEN
    UPDATE cm_parallel_branches SET status = 'pending', step_id = NULL, resolved_at = NULL
    WHERE cm_id = p_cm_id AND status = 'refused';

    UPDATE cms SET current_dept_id = NULL, workflow_stage = v_branch_type,
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
    UPDATE cms
    SET current_dept_id = v_actor_dept_id,
        workflow_stage  = COALESCE(v_cm.pre_refusal_stage, 'vendas_finalize'),
        pre_refusal_stage = NULL, status = 'open',
        viability = NULL, finalization_notes = NULL, finalized_at = NULL, finalized_by = NULL,
        contested_step_id = NULL, contest_reason = NULL
    WHERE cms.id = p_cm_id;

    INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
    SELECT p.id, p_cm_id, v_step.id, 'cm_assigned',
           'Contestação aceita. CM ' || v_cm.number || ' retornou para reavaliação'
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
           ' respondeu à contestação da CM ' || v_cm.number
    FROM profiles p WHERE p.department_id = v_vendas_id;
  END IF;

  RETURN QUERY SELECT v_step.id, v_step.cm_id, v_step.step_number, v_step.from_dept_id,
    v_step.to_dept_id, v_step.action, v_step.actor_id, v_step.notes, v_step.created_at;
END;
$$;
