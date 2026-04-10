-- ============================================================================
-- Allow Vendas to contest a refused CM
--
-- Before: contest_cm only worked at vendas_finalize (status = 'open')
-- After:  contest_cm also works at 'refused' stage (status = 'closed_not_viable')
--         and re-opens the CM when doing so
-- ============================================================================

CREATE OR REPLACE FUNCTION contest_cm(
  p_cm_id    uuid,
  p_step_id  uuid,
  p_reason   text,
  p_actor_id uuid
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
  v_contested_step  cm_steps%ROWTYPE;
  v_vendas_dept_id  uuid;
  v_target_dept_id  uuid;
BEGIN
  -- Accept both open CMs (vendas_finalize) and closed-not-viable CMs (refused)
  SELECT * INTO v_cm FROM cms
  WHERE id = p_cm_id
    AND (
      (status = 'open'              AND workflow_stage = 'vendas_finalize') OR
      (status = 'closed_not_viable' AND workflow_stage = 'refused')
    );

  IF v_cm.id IS NULL THEN
    RAISE EXCEPTION 'CM not found or not in a contestable state';
  END IF;

  SELECT id INTO v_vendas_dept_id FROM departments WHERE slug = 'vendas';

  SELECT * INTO v_contested_step FROM cm_steps WHERE id = p_step_id AND cm_id = p_cm_id;
  IF v_contested_step.id IS NULL THEN
    RAISE EXCEPTION 'Contested step not found';
  END IF;

  v_target_dept_id := v_contested_step.from_dept_id;
  IF v_target_dept_id IS NULL THEN
    RAISE EXCEPTION 'Cannot contest a step without a source department';
  END IF;

  INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
  VALUES (p_cm_id, v_vendas_dept_id, v_target_dept_id, 'contested', p_actor_id, p_reason)
  RETURNING * INTO v_step;

  -- Reopen the CM and set to contestation stage
  UPDATE cms
  SET status             = 'open',
      current_dept_id    = v_target_dept_id,
      workflow_stage     = 'contestation',
      contested_step_id  = p_step_id,
      contest_reason     = p_reason,
      -- Clear finalization fields so the CM is truly reopened
      viability          = NULL,
      finalization_notes = NULL,
      finalized_at       = NULL,
      finalized_by       = NULL
  WHERE id = p_cm_id;

  INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
  SELECT p.id, p_cm_id, v_step.id, 'cm_contested',
         'Vendas contestou sua análise na CM ' || v_cm.number || '. Motivo: ' || p_reason
  FROM profiles p WHERE p.department_id = v_target_dept_id;

  RETURN QUERY SELECT
    v_step.id, v_step.cm_id, v_step.step_number, v_step.from_dept_id,
    v_step.to_dept_id, v_step.action, v_step.actor_id, v_step.notes, v_step.created_at;
END;
$$;
