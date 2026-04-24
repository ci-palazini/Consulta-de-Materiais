-- Rewrite approve_cm to block Vendas from forwarding.
-- Vendas can only finalize or contest — never approve/redirect.

CREATE OR REPLACE FUNCTION approve_cm(
  p_cm_id      uuid,
  p_to_dept_id uuid,
  p_notes      text,
  p_actor_id   uuid
)
RETURNS TABLE (
  id uuid, cm_id uuid, step_number int,
  from_dept_id uuid, to_dept_id uuid,
  action text, actor_id uuid, notes text, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cm             cms%ROWTYPE;
  v_step           cm_steps%ROWTYPE;
  v_actor_dept_id  uuid;
  v_actor_slug     text;
  v_to_dept_slug   text;
  v_next_stage     text;
BEGIN
  SELECT * INTO v_cm FROM cms WHERE id = p_cm_id AND status = 'open';
  IF v_cm.id IS NULL THEN
    RAISE EXCEPTION 'CM not found or not open';
  END IF;

  IF v_cm.workflow_stage NOT IN ('open', 'vendas_finalize') THEN
    RAISE EXCEPTION 'approve_cm not valid for stage: %', v_cm.workflow_stage;
  END IF;

  SELECT department_id INTO v_actor_dept_id FROM profiles WHERE id = p_actor_id;

  IF v_cm.current_dept_id IS NULL OR v_cm.current_dept_id != v_actor_dept_id THEN
    RAISE EXCEPTION 'Your department does not currently hold this CM';
  END IF;

  SELECT slug INTO v_actor_slug FROM departments WHERE id = v_actor_dept_id;
  IF v_actor_slug = 'vendas' THEN
    RAISE EXCEPTION 'Vendas can only finalize or contest, not forward';
  END IF;

  SELECT slug INTO v_to_dept_slug FROM departments WHERE id = p_to_dept_id;
  IF v_to_dept_slug IS NULL THEN
    RAISE EXCEPTION 'Target department not found';
  END IF;

  v_next_stage := CASE WHEN v_to_dept_slug = 'vendas' THEN 'vendas_finalize' ELSE 'open' END;

  INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
  VALUES (p_cm_id, v_actor_dept_id, p_to_dept_id, 'approved', p_actor_id, p_notes)
  RETURNING * INTO v_step;

  UPDATE cms
  SET current_dept_id = p_to_dept_id,
      workflow_stage   = v_next_stage
  WHERE id = p_cm_id;

  INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
  SELECT p.id, p_cm_id, v_step.id, 'cm_assigned',
         CASE WHEN v_to_dept_slug = 'vendas'
              THEN 'CM ' || v_cm.number || ' chegou para finalização'
              ELSE 'CM ' || v_cm.number || ' foi aprovada e encaminhada para seu departamento'
         END
  FROM profiles p WHERE p.department_id = p_to_dept_id;

  RETURN QUERY SELECT
    v_step.id, v_step.cm_id, v_step.step_number, v_step.from_dept_id,
    v_step.to_dept_id, v_step.action, v_step.actor_id, v_step.notes, v_step.created_at;
END;
$$;
