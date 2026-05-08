-- Fix: cm_id is ambiguous in approve_parallel_branch.
-- RETURNS TABLE declares an OUT param named "cm_id", conflicting with the
-- unqualified column reference inside the two cm_parallel_branches queries.
-- PostgreSQL resolves cm_id as the OUT param (NULL) so the WHERE never matches.
-- Fix: add table alias and qualify every cm_parallel_branches column reference.

CREATE OR REPLACE FUNCTION approve_parallel_branch(
  p_cm_id    uuid,
  p_notes    text,
  p_actor_id uuid
)
RETURNS TABLE (
  id uuid, cm_id uuid, step_number int,
  from_dept_id uuid, to_dept_id uuid,
  action text, actor_id uuid, notes text, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cm            cms%ROWTYPE;
  v_step          cm_steps%ROWTYPE;
  v_actor_dept_id uuid;
  v_branch        cm_parallel_branches%ROWTYPE;
  v_pending_count integer;
  v_next_dept_id  uuid;
  v_next_slug     text;
BEGIN
  SELECT * INTO v_cm FROM cms c WHERE c.id = p_cm_id AND c.status = 'open';
  IF v_cm.id IS NULL THEN
    RAISE EXCEPTION 'CM not found or not open';
  END IF;

  IF v_cm.workflow_stage != 'parallel' THEN
    RAISE EXCEPTION 'CM is not in parallel stage';
  END IF;

  SELECT p.department_id INTO v_actor_dept_id FROM profiles p WHERE p.id = p_actor_id;

  -- Use alias cpb so cm_id is unambiguously the table column, not the OUT param
  SELECT * INTO v_branch FROM cm_parallel_branches cpb
  WHERE cpb.cm_id = p_cm_id AND cpb.dept_id = v_actor_dept_id AND cpb.status = 'pending';

  IF v_branch.id IS NULL THEN
    RAISE EXCEPTION 'No pending parallel branch for this department';
  END IF;

  INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
  VALUES (p_cm_id, v_actor_dept_id, v_actor_dept_id, 'approved', p_actor_id, p_notes)
  RETURNING * INTO v_step;

  UPDATE cm_parallel_branches
  SET status = 'approved', resolved_at = now(), step_id = v_step.id
  WHERE cm_parallel_branches.id = v_branch.id;

  -- Same fix here: alias cpb to avoid cm_id ambiguity
  SELECT COUNT(*) INTO v_pending_count
  FROM cm_parallel_branches cpb
  WHERE cpb.cm_id = p_cm_id AND cpb.status = 'pending' AND cpb.branch_type = 'parallel';

  IF v_pending_count = 0 THEN
    v_next_dept_id := v_cm.parallel_next_dept_id;

    SELECT d.slug INTO v_next_slug FROM departments d WHERE d.id = v_next_dept_id;

    UPDATE cms
    SET current_dept_id       = v_next_dept_id,
        workflow_stage        = CASE WHEN v_next_slug = 'vendas' THEN 'vendas_finalize' ELSE 'open' END,
        parallel_next_dept_id = NULL
    WHERE cms.id = p_cm_id;

    INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
    SELECT p.id, p_cm_id, v_step.id, 'cm_assigned',
           'Todas as análises paralelas foram aprovadas. CM ' || v_cm.number || ' segue para seu departamento'
    FROM profiles p WHERE p.department_id = v_next_dept_id;
  END IF;

  RETURN QUERY SELECT
    v_step.id, v_step.cm_id, v_step.step_number, v_step.from_dept_id,
    v_step.to_dept_id, v_step.action, v_step.actor_id, v_step.notes, v_step.created_at;
END;
$$;
