-- ============================================================================
-- FREE FLOW
--
-- Changes:
--   1.  Add parallel_next_dept_id to cms
--   2.  Simplify workflow_stage values (migrate + new constraint)
--   3.  Migrate pre_refusal_stage values
--   4.  Update cm_parallel_branches.branch_type constraint
--   5.  Rewrite approve_cm — accepts p_to_dept_id, any dept routing
--   6.  New dispatch_parallel — any dept, replaces dispatch_parallel_existing
--   7.  Update approve_parallel_branch — uses parallel_next_dept_id
--   8.  Update create_cm — accepts p_first_dept_id chosen by creator
--   9.  Update contest_cm — use 'contested' stage name
--  10.  Update respond_to_contest — check 'contested' stage
-- ============================================================================

-- ============================================================================
-- 1. New column on cms
-- ============================================================================

ALTER TABLE cms ADD COLUMN IF NOT EXISTS parallel_next_dept_id uuid REFERENCES departments(id);

-- ============================================================================
-- 2. Migrate workflow_stage values (open CMs)
-- ============================================================================

UPDATE cms SET workflow_stage = 'open'
WHERE workflow_stage IN (
  'new_item_projetos', 'new_item_suprimentos', 'new_item_custos',
  'new_item_pricing', 'existing_pricing_1', 'existing_custos',
  'existing_custos_2', 'existing_pricing_2'
);

UPDATE cms SET workflow_stage = 'parallel'
WHERE workflow_stage IN ('new_item_parallel', 'existing_parallel');

UPDATE cms SET workflow_stage = 'contested'
WHERE workflow_stage = 'contestation';

ALTER TABLE cms DROP CONSTRAINT IF EXISTS cms_workflow_stage_check;
ALTER TABLE cms ADD CONSTRAINT cms_workflow_stage_check
  CHECK (workflow_stage IN ('open', 'parallel', 'vendas_finalize', 'contested', 'finalized', 'refused'));

-- ============================================================================
-- 3. Migrate pre_refusal_stage values (refused CMs)
-- ============================================================================

UPDATE cms SET pre_refusal_stage = 'open'
WHERE pre_refusal_stage IN (
  'new_item_projetos', 'new_item_suprimentos', 'new_item_custos',
  'new_item_pricing', 'existing_pricing_1', 'existing_custos',
  'existing_custos_2', 'existing_pricing_2'
);

UPDATE cms SET pre_refusal_stage = 'parallel'
WHERE pre_refusal_stage IN ('new_item_parallel', 'existing_parallel');

UPDATE cms SET pre_refusal_stage = 'contested'
WHERE pre_refusal_stage = 'contestation';

-- ============================================================================
-- 4. Update cm_parallel_branches.branch_type
-- ============================================================================

ALTER TABLE cm_parallel_branches DROP CONSTRAINT IF EXISTS cm_parallel_branches_branch_type_check;

UPDATE cm_parallel_branches SET branch_type = 'parallel'
WHERE branch_type IN ('new_item_parallel', 'existing_parallel');

ALTER TABLE cm_parallel_branches ADD CONSTRAINT cm_parallel_branches_branch_type_check
  CHECK (branch_type = 'parallel');

-- ============================================================================
-- 5. Rewrite approve_cm
--    New signature: (p_cm_id, p_to_dept_id, p_notes, p_actor_id)
--    Any department that currently holds the CM can approve and choose the next.
-- ============================================================================

DROP FUNCTION IF EXISTS approve_cm(uuid, text, uuid);

CREATE OR REPLACE FUNCTION approve_cm(
  p_cm_id      uuid,
  p_to_dept_id uuid,
  p_notes      text,
  p_actor_id   uuid
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
  v_cm            cms%ROWTYPE;
  v_step          cm_steps%ROWTYPE;
  v_actor_dept_id uuid;
  v_to_dept_slug  text;
  v_next_stage    text;
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

-- ============================================================================
-- 6. New dispatch_parallel — any dept holding the CM can dispatch
--    New signature: (p_cm_id, p_dept_ids, p_next_dept_id, p_notes, p_actor_id)
-- ============================================================================

CREATE OR REPLACE FUNCTION dispatch_parallel(
  p_cm_id        uuid,
  p_dept_ids     uuid[],
  p_next_dept_id uuid,
  p_notes        text,
  p_actor_id     uuid
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
  v_cm            cms%ROWTYPE;
  v_step          cm_steps%ROWTYPE;
  v_actor_dept_id uuid;
  v_dept_id       uuid;
  v_dept_names    text;
BEGIN
  SELECT * INTO v_cm FROM cms WHERE id = p_cm_id AND status = 'open';
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

  SELECT department_id INTO v_actor_dept_id FROM profiles WHERE id = p_actor_id;

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
  WHERE id = p_cm_id;

  FOR v_dept_id IN SELECT unnest(p_dept_ids)
  LOOP
    INSERT INTO cm_parallel_branches (cm_id, dept_id, branch_type)
    VALUES (p_cm_id, v_dept_id, 'parallel')
    ON CONFLICT (cm_id, dept_id, branch_type) DO UPDATE
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
$$;

-- ============================================================================
-- 7. Update approve_parallel_branch — use cms.parallel_next_dept_id
-- ============================================================================

DROP FUNCTION IF EXISTS approve_parallel_branch(uuid, text, uuid);

CREATE OR REPLACE FUNCTION approve_parallel_branch(
  p_cm_id    uuid,
  p_notes    text,
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
  v_cm            cms%ROWTYPE;
  v_step          cm_steps%ROWTYPE;
  v_actor_dept_id uuid;
  v_branch        cm_parallel_branches%ROWTYPE;
  v_pending_count integer;
  v_next_dept_id  uuid;
  v_next_slug     text;
BEGIN
  SELECT * INTO v_cm FROM cms WHERE id = p_cm_id AND status = 'open';
  IF v_cm.id IS NULL THEN
    RAISE EXCEPTION 'CM not found or not open';
  END IF;

  IF v_cm.workflow_stage != 'parallel' THEN
    RAISE EXCEPTION 'CM is not in parallel stage';
  END IF;

  SELECT department_id INTO v_actor_dept_id FROM profiles WHERE id = p_actor_id;

  SELECT * INTO v_branch FROM cm_parallel_branches
  WHERE cm_id = p_cm_id AND dept_id = v_actor_dept_id AND status = 'pending';

  IF v_branch.id IS NULL THEN
    RAISE EXCEPTION 'No pending parallel branch for this department';
  END IF;

  INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
  VALUES (p_cm_id, v_actor_dept_id, v_actor_dept_id, 'approved', p_actor_id, p_notes)
  RETURNING * INTO v_step;

  UPDATE cm_parallel_branches
  SET status = 'approved', resolved_at = now(), step_id = v_step.id
  WHERE id = v_branch.id;

  SELECT COUNT(*) INTO v_pending_count
  FROM cm_parallel_branches
  WHERE cm_id = p_cm_id AND status = 'pending' AND branch_type = 'parallel';

  IF v_pending_count = 0 THEN
    v_next_dept_id := v_cm.parallel_next_dept_id;

    SELECT slug INTO v_next_slug FROM departments WHERE id = v_next_dept_id;

    UPDATE cms
    SET current_dept_id       = v_next_dept_id,
        workflow_stage        = CASE WHEN v_next_slug = 'vendas' THEN 'vendas_finalize' ELSE 'open' END,
        parallel_next_dept_id = NULL
    WHERE id = p_cm_id;

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

-- ============================================================================
-- 8. Update create_cm — accepts p_first_dept_id chosen by creator
--    Keeps p_internal_id and p_critical_analysis_url (already live in DB).
--    workflow_stage is always 'open' on creation.
-- ============================================================================

DROP FUNCTION IF EXISTS create_cm(text, text, uuid, boolean);
DROP FUNCTION IF EXISTS create_cm(text, text, uuid, boolean, text, text);
DROP FUNCTION IF EXISTS create_cm(text, text, uuid, boolean, uuid, text, text);

CREATE OR REPLACE FUNCTION create_cm(
  p_title                 text,
  p_description           text,
  p_actor_id              uuid,
  p_is_new_item           boolean DEFAULT true,
  p_first_dept_id         uuid    DEFAULT NULL,
  p_internal_id           text    DEFAULT NULL,
  p_critical_analysis_url text    DEFAULT NULL
)
RETURNS TABLE (
  id              uuid,
  number          text,
  title           text,
  description     text,
  status          text,
  current_dept_id uuid,
  created_by      uuid,
  created_at      timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_cm_row      cms%ROWTYPE;
  v_step_record cm_steps%ROWTYPE;
  v_target_id   uuid;
BEGIN
  IF p_first_dept_id IS NOT NULL THEN
    SELECT id INTO v_target_id FROM departments WHERE id = p_first_dept_id;
    IF v_target_id IS NULL THEN
      RAISE EXCEPTION 'Department not found';
    END IF;
  ELSIF p_is_new_item THEN
    SELECT id INTO v_target_id FROM departments WHERE slug = 'eng_projetos';
  ELSE
    SELECT id INTO v_target_id FROM departments WHERE slug = 'pricing';
  END IF;

  INSERT INTO cms (
    title, description, created_by, status, current_dept_id, is_new_item,
    workflow_stage, internal_id, critical_analysis_url
  )
  VALUES (
    p_title, p_description, p_actor_id, 'open', v_target_id, p_is_new_item,
    'open', p_internal_id, p_critical_analysis_url
  )
  RETURNING * INTO v_cm_row;

  INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
  VALUES (v_cm_row.id, NULL, v_target_id, 'created', p_actor_id, 'Consulta de materiais criada')
  RETURNING * INTO v_step_record;

  INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
  SELECT p.id, v_cm_row.id, v_step_record.id, 'cm_assigned',
         'CM ' || v_cm_row.number || ' foi designada para seu departamento'
  FROM profiles p WHERE p.department_id = v_target_id;

  RETURN QUERY SELECT
    v_cm_row.id, v_cm_row.number, v_cm_row.title, v_cm_row.description,
    v_cm_row.status, v_cm_row.current_dept_id, v_cm_row.created_by, v_cm_row.created_at;
END;
$$;

-- ============================================================================
-- 9. Update contest_cm — use 'contested' stage name
-- ============================================================================

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
  SELECT * INTO v_cm FROM cms WHERE id = p_cm_id AND status = 'open';
  IF v_cm.id IS NULL THEN
    RAISE EXCEPTION 'CM not found or not open';
  END IF;

  IF v_cm.workflow_stage != 'vendas_finalize' THEN
    RAISE EXCEPTION 'contest_cm only valid at vendas_finalize stage';
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
  SET current_dept_id  = v_target_dept_id,
      workflow_stage    = 'contested',
      contested_step_id = p_step_id,
      contest_reason    = p_reason
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

-- ============================================================================
-- 10. Update respond_to_contest — check 'contested' stage
--     When restoring parallel, workflow_stage = 'parallel' (branch_type is now always 'parallel')
-- ============================================================================

DROP FUNCTION IF EXISTS respond_to_contest(uuid, text, text, uuid);

CREATE OR REPLACE FUNCTION respond_to_contest(
  p_cm_id    uuid,
  p_response text,
  p_notes    text,
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

  -- Check if the contested step was a parallel branch step
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
    UPDATE cm_parallel_branches SET status = 'pending', step_id = NULL, resolved_at = NULL
    WHERE cm_id = p_cm_id AND status = 'refused';

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
    UPDATE cms
    SET current_dept_id   = v_actor_dept_id,
        workflow_stage    = COALESCE(v_cm.pre_refusal_stage, 'open'),
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
