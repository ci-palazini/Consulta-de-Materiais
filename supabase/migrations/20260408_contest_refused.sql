-- Allow Vendas to contest a refused CM.
-- Previously contest_cm only accepted workflow_stage = 'vendas_finalize'.
-- Now it also accepts 'refused', sending the CM back to the refusing dept.

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
  SELECT * INTO v_cm FROM cms WHERE id = p_cm_id AND status = 'open';
  IF v_cm.id IS NULL THEN
    RAISE EXCEPTION 'CM not found or not open';
  END IF;

  IF v_cm.workflow_stage NOT IN ('vendas_finalize', 'refused') THEN
    RAISE EXCEPTION 'contest_cm only valid at vendas_finalize or refused stage';
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

  UPDATE cms
  SET current_dept_id   = v_target_dept_id,
      workflow_stage     = 'contestation',
      contested_step_id  = p_step_id,
      contest_reason     = p_reason
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
