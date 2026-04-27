-- Fix ambiguous "id" references inside contest_cm.
-- The RETURNS TABLE column "id" shadows unqualified column references.
-- Also restores support for contesting refused CMs (status = closed_not_viable)
-- which was removed by 20260424_free_flow.sql.

CREATE OR REPLACE FUNCTION contest_cm(
  p_cm_id    uuid,
  p_step_id  uuid,
  p_reason   text,
  p_actor_id uuid
)
RETURNS TABLE (
  id           uuid,
  cm_id        uuid,
  step_number  integer,
  from_dept_id uuid,
  to_dept_id   uuid,
  action       text,
  actor_id     uuid,
  notes        text,
  created_at   timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_cm              cms%ROWTYPE;
  v_step            cm_steps%ROWTYPE;
  v_contested_step  cm_steps%ROWTYPE;
  v_vendas_dept_id  uuid;
  v_target_dept_id  uuid;
BEGIN
  SELECT * INTO v_cm FROM cms c
  WHERE c.id = p_cm_id
    AND (
      (c.status = 'open'              AND c.workflow_stage = 'vendas_finalize') OR
      (c.status = 'closed_not_viable' AND c.workflow_stage = 'refused')
    );
  IF v_cm.id IS NULL THEN
    RAISE EXCEPTION 'CM not found or not in a contestable state';
  END IF;

  SELECT d.id INTO v_vendas_dept_id FROM departments d WHERE d.slug = 'vendas';

  SELECT * INTO v_contested_step FROM cm_steps s WHERE s.id = p_step_id AND s.cm_id = p_cm_id;
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
  SET status             = 'open',
      current_dept_id    = v_target_dept_id,
      workflow_stage     = 'contested',
      contested_step_id  = p_step_id,
      contest_reason     = p_reason,
      viability          = NULL,
      finalization_notes = NULL,
      finalized_at       = NULL,
      finalized_by       = NULL
  WHERE cms.id = p_cm_id;

  INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
  SELECT p.id, p_cm_id, v_step.id, 'cm_contested',
         'Vendas contestou sua análise na CM ' || v_cm.number || '. Motivo: ' || p_reason
  FROM profiles p WHERE p.department_id = v_target_dept_id;

  RETURN QUERY SELECT
    v_step.id, v_step.cm_id, v_step.step_number, v_step.from_dept_id,
    v_step.to_dept_id, v_step.action, v_step.actor_id, v_step.notes, v_step.created_at;
END;
$$;
