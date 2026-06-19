-- ============================================================================
-- Cancelar CM (soft cancel)
--
-- O criador da CM (ou um admin) pode cancelar uma CM enquanto ela estiver
-- aberta (status = 'open'). A CM não é apagada: recebe status 'cancelled',
-- workflow_stage 'cancelled' e um passo de auditoria 'cancelled'. O histórico
-- e os anexos são preservados.
-- ============================================================================

-- 1. Ampliar os CHECK constraints para aceitar os novos valores -----------------

ALTER TABLE cms DROP CONSTRAINT IF EXISTS cms_status_check;
ALTER TABLE cms ADD CONSTRAINT cms_status_check
  CHECK (status = ANY (ARRAY['open', 'closed_viable', 'closed_not_viable', 'closed_by_system', 'cancelled']));

ALTER TABLE cms DROP CONSTRAINT IF EXISTS cms_workflow_stage_check;
ALTER TABLE cms ADD CONSTRAINT cms_workflow_stage_check
  CHECK (workflow_stage = ANY (ARRAY['open', 'parallel', 'vendas_finalize', 'contested', 'finalized', 'refused', 'cancelled']));

ALTER TABLE cm_steps DROP CONSTRAINT IF EXISTS cm_steps_action_check;
ALTER TABLE cm_steps ADD CONSTRAINT cm_steps_action_check
  CHECK (action = ANY (ARRAY['created', 'forwarded', 'returned', 'approved', 'refused', 'dispatched_parallel', 'contested', 'contest_response', 'jumped', 'finalized', 'auto_finalized', 'cancelled']));

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY['cm_assigned', 'cm_finalized', 'cm_returned', 'cm_refused', 'cm_contested', 'cm_contest_response', 'cm_cancelled']));

-- 2. RPC cancel_cm --------------------------------------------------------------

CREATE OR REPLACE FUNCTION cancel_cm(
  p_cm_id    uuid,
  p_notes    text,
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
  v_cm        cms%ROWTYPE;
  v_actor     profiles%ROWTYPE;
  v_step      cm_steps%ROWTYPE;
  v_dept_id   uuid;
BEGIN
  SELECT * INTO v_cm FROM cms WHERE cms.id = p_cm_id;
  IF v_cm.id IS NULL THEN
    RAISE EXCEPTION 'CM not found';
  END IF;

  IF v_cm.status <> 'open' THEN
    RAISE EXCEPTION 'Only open CMs can be cancelled';
  END IF;

  SELECT * INTO v_actor FROM profiles WHERE profiles.id = p_actor_id;
  IF v_actor.id IS NULL THEN
    RAISE EXCEPTION 'Actor not found';
  END IF;

  -- Apenas o criador da CM ou um admin podem cancelar
  IF v_cm.created_by <> p_actor_id AND v_actor.role <> 'admin' THEN
    RAISE EXCEPTION 'Only the creator or an admin can cancel this CM';
  END IF;

  -- to_dept_id é NOT NULL; usa o dept atual, ou o dept do criador como fallback
  v_dept_id := COALESCE(v_cm.current_dept_id, v_actor.department_id);

  INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
  VALUES (p_cm_id, v_cm.current_dept_id, v_dept_id, 'cancelled', p_actor_id, NULLIF(p_notes, ''))
  RETURNING * INTO v_step;

  UPDATE cms
  SET status         = 'cancelled',
      workflow_stage = 'cancelled'
  WHERE cms.id = p_cm_id;

  -- Notifica os membros do departamento que estava com a CM (exceto quem cancelou)
  IF v_cm.current_dept_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
    SELECT p.id, p_cm_id, v_step.id, 'cm_cancelled',
           'A CM ' || v_cm.number || ' foi cancelada por quem a abriu.'
    FROM profiles p
    WHERE p.department_id = v_cm.current_dept_id
      AND p.id <> p_actor_id;
  END IF;

  RETURN QUERY SELECT
    v_step.id, v_step.cm_id, v_step.step_number, v_step.from_dept_id,
    v_step.to_dept_id, v_step.action, v_step.actor_id, v_step.notes, v_step.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_cm(uuid, text, uuid) TO authenticated;
