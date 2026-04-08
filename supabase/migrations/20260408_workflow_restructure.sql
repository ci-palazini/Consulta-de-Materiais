-- ============================================================================
-- WORKFLOW RESTRUCTURE
--
-- Changes:
--   1. Replace eng_aplicacao + eng_produto with eng_projetos
--   2. Add workflow_stage, contested_step_id, contest_reason to cms
--   3. Create cm_parallel_branches table
--   4. Update cm_steps.action constraint
--   5. New RPCs: approve_cm, refuse_cm, approve_parallel_branch,
--               dispatch_parallel_existing, contest_cm, respond_to_contest
--   6. Update create_cm, finalize_cm
-- ============================================================================

-- ============================================================================
-- PART 1: DEPARTMENT CHANGES
-- ============================================================================

INSERT INTO departments (name, slug, display_order)
VALUES ('Engenharia de Projetos', 'eng_projetos', 2);

-- Migrate profiles from old depts to eng_projetos
UPDATE profiles
SET department_id = (SELECT id FROM departments WHERE slug = 'eng_projetos')
WHERE department_id IN (
  SELECT id FROM departments WHERE slug IN ('eng_aplicacao', 'eng_produto')
);

-- Migrate CMs currently at old depts
UPDATE cms
SET current_dept_id = (SELECT id FROM departments WHERE slug = 'eng_projetos')
WHERE current_dept_id IN (
  SELECT id FROM departments WHERE slug IN ('eng_aplicacao', 'eng_produto')
);

-- Migrate cm_steps references
UPDATE cm_steps
SET from_dept_id = (SELECT id FROM departments WHERE slug = 'eng_projetos')
WHERE from_dept_id IN (
  SELECT id FROM departments WHERE slug IN ('eng_aplicacao', 'eng_produto')
);

UPDATE cm_steps
SET to_dept_id = (SELECT id FROM departments WHERE slug = 'eng_projetos')
WHERE to_dept_id IN (
  SELECT id FROM departments WHERE slug IN ('eng_aplicacao', 'eng_produto')
);

-- Delete old departments
DELETE FROM departments WHERE slug IN ('eng_aplicacao', 'eng_produto');

-- Reorder display_order
UPDATE departments SET display_order = 1 WHERE slug = 'vendas';
UPDATE departments SET display_order = 2 WHERE slug = 'eng_projetos';
UPDATE departments SET display_order = 3 WHERE slug = 'qualidade';
UPDATE departments SET display_order = 4 WHERE slug = 'planejamento';
UPDATE departments SET display_order = 5 WHERE slug = 'suprimentos';
UPDATE departments SET display_order = 6 WHERE slug = 'eng_processos';
UPDATE departments SET display_order = 7 WHERE slug = 'custos';
UPDATE departments SET display_order = 8 WHERE slug = 'pricing';

-- ============================================================================
-- PART 2: NEW COLUMNS ON cms
-- ============================================================================

ALTER TABLE cms
  ADD COLUMN IF NOT EXISTS workflow_stage text NOT NULL DEFAULT 'new_item_projetos',
  ADD COLUMN IF NOT EXISTS contested_step_id uuid REFERENCES cm_steps(id),
  ADD COLUMN IF NOT EXISTS contest_reason text;

CREATE INDEX IF NOT EXISTS idx_cms_workflow_stage ON cms(workflow_stage);

-- Backfill: existing open CMs → vendas_finalize so they don't get stuck
UPDATE cms SET workflow_stage = 'vendas_finalize' WHERE status = 'open';
UPDATE cms SET workflow_stage = 'finalized' WHERE status IN ('closed_viable', 'closed_not_viable');

-- ============================================================================
-- PART 3: cm_parallel_branches TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cm_parallel_branches (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cm_id        uuid NOT NULL REFERENCES cms(id) ON DELETE CASCADE,
  dept_id      uuid NOT NULL REFERENCES departments(id),
  branch_type  text NOT NULL CHECK (branch_type IN ('new_item_parallel', 'existing_parallel')),
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'approved', 'refused')),
  step_id      uuid REFERENCES cm_steps(id),
  created_at   timestamptz DEFAULT now(),
  resolved_at  timestamptz,
  UNIQUE (cm_id, dept_id, branch_type)
);

CREATE INDEX IF NOT EXISTS idx_parallel_branches_cm ON cm_parallel_branches(cm_id);
CREATE INDEX IF NOT EXISTS idx_parallel_branches_pending ON cm_parallel_branches(cm_id, status) WHERE status = 'pending';

ALTER TABLE cm_parallel_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parallel_branches_read_all" ON cm_parallel_branches
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- PART 4: UPDATE cm_steps.action CONSTRAINT
-- ============================================================================

ALTER TABLE cm_steps DROP CONSTRAINT IF EXISTS cm_steps_action_check;

ALTER TABLE cm_steps ADD CONSTRAINT cm_steps_action_check
  CHECK (action IN (
    'created',
    'forwarded',           -- legacy
    'returned',            -- legacy
    'approved',
    'refused',
    'dispatched_parallel',
    'contested',
    'contest_response',
    'finalized'
  ));

-- ============================================================================
-- PART 5: UPDATE notification type constraint
-- ============================================================================

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'cm_assigned',
    'cm_finalized',
    'cm_returned',
    'cm_refused',
    'cm_contested',
    'cm_contest_response'
  ));

-- ============================================================================
-- PART 6: RPC — create_cm (updated)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_cm(
  p_title       text,
  p_description text,
  p_actor_id    uuid,
  p_is_new_item boolean DEFAULT true
)
RETURNS TABLE (
  id             uuid,
  number         text,
  title          text,
  description    text,
  status         text,
  current_dept_id uuid,
  created_by     uuid,
  created_at     timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cm_row       cms%ROWTYPE;
  v_step_record  cm_steps%ROWTYPE;
  v_target_id    uuid;
  v_target_slug  text;
  v_stage        text;
BEGIN
  IF p_is_new_item THEN
    v_target_slug := 'eng_projetos';
    v_stage       := 'new_item_projetos';
  ELSE
    v_target_slug := 'pricing';
    v_stage       := 'existing_pricing_1';
  END IF;

  SELECT id INTO v_target_id FROM departments WHERE slug = v_target_slug;
  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Department % not found', v_target_slug;
  END IF;

  INSERT INTO cms (title, description, created_by, status, current_dept_id, is_new_item, workflow_stage)
  VALUES (p_title, p_description, p_actor_id, 'open', v_target_id, p_is_new_item, v_stage)
  RETURNING * INTO v_cm_row;

  INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
  VALUES (v_cm_row.id, NULL, v_target_id, 'created', p_actor_id, 'Consulta de materiais criada')
  RETURNING * INTO v_step_record;

  INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
  SELECT p.id, v_cm_row.id, v_step_record.id, 'cm_assigned',
         'CM ' || v_cm_row.number || ' foi designada para seu departamento'
  FROM profiles p
  WHERE p.department_id = v_target_id;

  RETURN QUERY SELECT
    v_cm_row.id, v_cm_row.number, v_cm_row.title, v_cm_row.description,
    v_cm_row.status, v_cm_row.current_dept_id, v_cm_row.created_by, v_cm_row.created_at;
END;
$$;

-- ============================================================================
-- PART 7: RPC — approve_cm (new)
-- ============================================================================

CREATE OR REPLACE FUNCTION approve_cm(
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
  v_cm            cms%ROWTYPE;
  v_step          cm_steps%ROWTYPE;
  v_actor_dept_id uuid;
  v_next_dept_id  uuid;
  v_next_stage    text;
  v_parallel_depts uuid[];
  v_dept_id       uuid;
BEGIN
  SELECT * INTO v_cm FROM cms WHERE id = p_cm_id AND status = 'open';
  IF v_cm.id IS NULL THEN
    RAISE EXCEPTION 'CM not found or not open';
  END IF;

  SELECT department_id INTO v_actor_dept_id FROM profiles WHERE id = p_actor_id;

  -- Determine next step based on workflow_stage
  CASE v_cm.workflow_stage

    WHEN 'new_item_projetos' THEN
      SELECT id INTO v_next_dept_id FROM departments WHERE slug = 'suprimentos';
      v_next_stage := 'new_item_suprimentos';

      INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
      VALUES (p_cm_id, v_actor_dept_id, v_next_dept_id, 'approved', p_actor_id, p_notes)
      RETURNING * INTO v_step;

      UPDATE cms SET current_dept_id = v_next_dept_id, workflow_stage = v_next_stage WHERE id = p_cm_id;

      INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
      SELECT p.id, p_cm_id, v_step.id, 'cm_assigned',
             'CM ' || v_cm.number || ' foi aprovada e encaminhada para seu departamento'
      FROM profiles p WHERE p.department_id = v_next_dept_id;

    WHEN 'new_item_suprimentos' THEN
      -- Approve + automatically dispatch to 3 parallel depts
      INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
      VALUES (p_cm_id, v_actor_dept_id, v_actor_dept_id, 'approved', p_actor_id, p_notes)
      RETURNING * INTO v_step;

      -- Dispatch parallel step (separate step for audit)
      INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
      VALUES (p_cm_id, v_actor_dept_id, v_actor_dept_id, 'dispatched_parallel', p_actor_id,
              'Análise encaminhada para Eng. de Processos, Planejamento e Qualidade');

      UPDATE cms SET current_dept_id = NULL, workflow_stage = 'new_item_parallel' WHERE id = p_cm_id;

      -- Create parallel branches for the 3 depts
      FOR v_dept_id IN
        SELECT id FROM departments WHERE slug IN ('eng_processos', 'planejamento', 'qualidade')
      LOOP
        INSERT INTO cm_parallel_branches (cm_id, dept_id, branch_type)
        VALUES (p_cm_id, v_dept_id, 'new_item_parallel');

        INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
        SELECT p.id, p_cm_id, v_step.id, 'cm_assigned',
               'CM ' || v_cm.number || ' aguarda sua análise em paralelo'
        FROM profiles p WHERE p.department_id = v_dept_id;
      END LOOP;

    WHEN 'new_item_custos' THEN
      SELECT id INTO v_next_dept_id FROM departments WHERE slug = 'pricing';
      v_next_stage := 'new_item_pricing';

      INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
      VALUES (p_cm_id, v_actor_dept_id, v_next_dept_id, 'approved', p_actor_id, p_notes)
      RETURNING * INTO v_step;

      UPDATE cms SET current_dept_id = v_next_dept_id, workflow_stage = v_next_stage WHERE id = p_cm_id;

      INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
      SELECT p.id, p_cm_id, v_step.id, 'cm_assigned',
             'CM ' || v_cm.number || ' foi aprovada e encaminhada para seu departamento'
      FROM profiles p WHERE p.department_id = v_next_dept_id;

    WHEN 'new_item_pricing' THEN
      SELECT id INTO v_next_dept_id FROM departments WHERE slug = 'vendas';
      v_next_stage := 'vendas_finalize';

      INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
      VALUES (p_cm_id, v_actor_dept_id, v_next_dept_id, 'approved', p_actor_id, p_notes)
      RETURNING * INTO v_step;

      UPDATE cms SET current_dept_id = v_next_dept_id, workflow_stage = v_next_stage WHERE id = p_cm_id;

      INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
      SELECT p.id, p_cm_id, v_step.id, 'cm_assigned',
             'CM ' || v_cm.number || ' chegou para finalização'
      FROM profiles p WHERE p.department_id = v_next_dept_id;

    WHEN 'existing_pricing_1' THEN
      SELECT id INTO v_next_dept_id FROM departments WHERE slug = 'custos';
      v_next_stage := 'existing_custos';

      INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
      VALUES (p_cm_id, v_actor_dept_id, v_next_dept_id, 'approved', p_actor_id, p_notes)
      RETURNING * INTO v_step;

      UPDATE cms SET current_dept_id = v_next_dept_id, workflow_stage = v_next_stage WHERE id = p_cm_id;

      INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
      SELECT p.id, p_cm_id, v_step.id, 'cm_assigned',
             'CM ' || v_cm.number || ' foi aprovada e encaminhada para seu departamento'
      FROM profiles p WHERE p.department_id = v_next_dept_id;

    WHEN 'existing_custos_2' THEN
      SELECT id INTO v_next_dept_id FROM departments WHERE slug = 'pricing';
      v_next_stage := 'existing_pricing_2';

      INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
      VALUES (p_cm_id, v_actor_dept_id, v_next_dept_id, 'approved', p_actor_id, p_notes)
      RETURNING * INTO v_step;

      UPDATE cms SET current_dept_id = v_next_dept_id, workflow_stage = v_next_stage WHERE id = p_cm_id;

      INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
      SELECT p.id, p_cm_id, v_step.id, 'cm_assigned',
             'CM ' || v_cm.number || ' foi aprovada e encaminhada para seu departamento'
      FROM profiles p WHERE p.department_id = v_next_dept_id;

    WHEN 'existing_pricing_2' THEN
      SELECT id INTO v_next_dept_id FROM departments WHERE slug = 'vendas';
      v_next_stage := 'vendas_finalize';

      INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
      VALUES (p_cm_id, v_actor_dept_id, v_next_dept_id, 'approved', p_actor_id, p_notes)
      RETURNING * INTO v_step;

      UPDATE cms SET current_dept_id = v_next_dept_id, workflow_stage = v_next_stage WHERE id = p_cm_id;

      INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
      SELECT p.id, p_cm_id, v_step.id, 'cm_assigned',
             'CM ' || v_cm.number || ' chegou para finalização'
      FROM profiles p WHERE p.department_id = v_next_dept_id;

    WHEN 'contestation' THEN
      SELECT id INTO v_next_dept_id FROM departments WHERE slug = 'vendas';
      v_next_stage := 'vendas_finalize';

      INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
      VALUES (p_cm_id, v_actor_dept_id, v_next_dept_id, 'contest_response', p_actor_id,
              COALESCE(p_notes, '') || ' [Resposta: OK]')
      RETURNING * INTO v_step;

      UPDATE cms
      SET current_dept_id = v_next_dept_id,
          workflow_stage   = v_next_stage,
          contested_step_id = NULL,
          contest_reason    = NULL
      WHERE id = p_cm_id;

      INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
      SELECT p.id, p_cm_id, v_step.id, 'cm_contest_response',
             'Departamento respondeu à contestação da CM ' || v_cm.number
      FROM profiles p WHERE p.department_id = v_next_dept_id;

    ELSE
      RAISE EXCEPTION 'approve_cm not valid for stage: %', v_cm.workflow_stage;
  END CASE;

  RETURN QUERY SELECT
    v_step.id, v_step.cm_id, v_step.step_number, v_step.from_dept_id,
    v_step.to_dept_id, v_step.action, v_step.actor_id, v_step.notes, v_step.created_at;
END;
$$;

-- ============================================================================
-- PART 8: RPC — refuse_cm (new)
-- ============================================================================

CREATE OR REPLACE FUNCTION refuse_cm(
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
  v_cm           cms%ROWTYPE;
  v_step         cm_steps%ROWTYPE;
  v_actor_dept_id uuid;
BEGIN
  SELECT * INTO v_cm FROM cms WHERE id = p_cm_id AND status = 'open';
  IF v_cm.id IS NULL THEN
    RAISE EXCEPTION 'CM not found or not open';
  END IF;

  SELECT department_id INTO v_actor_dept_id FROM profiles WHERE id = p_actor_id;

  INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
  VALUES (p_cm_id, v_actor_dept_id, v_actor_dept_id, 'refused', p_actor_id, p_notes)
  RETURNING * INTO v_step;

  -- Cancel all pending parallel branches (if any)
  UPDATE cm_parallel_branches
  SET status = 'refused', resolved_at = now()
  WHERE cm_id = p_cm_id AND status = 'pending';

  -- Close the CM as not viable
  UPDATE cms
  SET status            = 'closed_not_viable',
      current_dept_id   = v_actor_dept_id,
      workflow_stage    = 'refused',
      viability         = false,
      finalization_notes = p_notes,
      finalized_at      = now(),
      finalized_by      = p_actor_id
  WHERE id = p_cm_id;

  -- Notify creator
  INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
  VALUES (
    v_cm.created_by, p_cm_id, v_step.id, 'cm_refused',
    'CM ' || v_cm.number || ' foi recusada por ' ||
    (SELECT name FROM departments WHERE id = v_actor_dept_id)
  );

  -- Notify vendas (if they are not the one refusing)
  INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
  SELECT p.id, p_cm_id, v_step.id, 'cm_refused',
         'CM ' || v_cm.number || ' foi recusada'
  FROM profiles p
  JOIN departments d ON d.id = p.department_id
  WHERE d.slug = 'vendas'
    AND p.id != v_cm.created_by;

  RETURN QUERY SELECT
    v_step.id, v_step.cm_id, v_step.step_number, v_step.from_dept_id,
    v_step.to_dept_id, v_step.action, v_step.actor_id, v_step.notes, v_step.created_at;
END;
$$;

-- ============================================================================
-- PART 9: RPC — approve_parallel_branch (new)
-- ============================================================================

CREATE OR REPLACE FUNCTION approve_parallel_branch(
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
  v_cm            cms%ROWTYPE;
  v_step          cm_steps%ROWTYPE;
  v_actor_dept_id uuid;
  v_branch        cm_parallel_branches%ROWTYPE;
  v_pending_count integer;
  v_next_dept_id  uuid;
  v_next_stage    text;
BEGIN
  SELECT * INTO v_cm FROM cms WHERE id = p_cm_id AND status = 'open';
  IF v_cm.id IS NULL THEN
    RAISE EXCEPTION 'CM not found or not open';
  END IF;

  IF v_cm.workflow_stage NOT IN ('new_item_parallel', 'existing_parallel') THEN
    RAISE EXCEPTION 'CM is not in a parallel stage';
  END IF;

  SELECT department_id INTO v_actor_dept_id FROM profiles WHERE id = p_actor_id;

  SELECT * INTO v_branch
  FROM cm_parallel_branches
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

  -- Check if all branches are now approved
  SELECT COUNT(*) INTO v_pending_count
  FROM cm_parallel_branches
  WHERE cm_id = p_cm_id AND status = 'pending' AND branch_type = v_cm.workflow_stage;

  IF v_pending_count = 0 THEN
    -- All approved → advance to next stage
    IF v_cm.workflow_stage = 'new_item_parallel' THEN
      SELECT id INTO v_next_dept_id FROM departments WHERE slug = 'custos';
      v_next_stage := 'new_item_custos';
    ELSE
      SELECT id INTO v_next_dept_id FROM departments WHERE slug = 'custos';
      v_next_stage := 'existing_custos_2';
    END IF;

    UPDATE cms
    SET current_dept_id = v_next_dept_id, workflow_stage = v_next_stage
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
-- PART 10: RPC — refuse_parallel_branch (new)
-- Refuses the branch + cancels remaining + closes CM
-- ============================================================================

CREATE OR REPLACE FUNCTION refuse_parallel_branch(
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
  v_cm            cms%ROWTYPE;
  v_step          cm_steps%ROWTYPE;
  v_actor_dept_id uuid;
  v_branch        cm_parallel_branches%ROWTYPE;
BEGIN
  SELECT * INTO v_cm FROM cms WHERE id = p_cm_id AND status = 'open';
  IF v_cm.id IS NULL THEN
    RAISE EXCEPTION 'CM not found or not open';
  END IF;

  SELECT department_id INTO v_actor_dept_id FROM profiles WHERE id = p_actor_id;

  SELECT * INTO v_branch
  FROM cm_parallel_branches
  WHERE cm_id = p_cm_id AND dept_id = v_actor_dept_id AND status = 'pending';

  IF v_branch.id IS NULL THEN
    RAISE EXCEPTION 'No pending parallel branch for this department';
  END IF;

  INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
  VALUES (p_cm_id, v_actor_dept_id, v_actor_dept_id, 'refused', p_actor_id, p_notes)
  RETURNING * INTO v_step;

  -- Mark this branch refused
  UPDATE cm_parallel_branches
  SET status = 'refused', resolved_at = now(), step_id = v_step.id
  WHERE id = v_branch.id;

  -- Cancel all remaining pending branches
  UPDATE cm_parallel_branches
  SET status = 'refused', resolved_at = now()
  WHERE cm_id = p_cm_id AND status = 'pending';

  -- Close the CM
  UPDATE cms
  SET status             = 'closed_not_viable',
      current_dept_id    = v_actor_dept_id,
      workflow_stage     = 'refused',
      viability          = false,
      finalization_notes = p_notes,
      finalized_at       = now(),
      finalized_by       = p_actor_id
  WHERE id = p_cm_id;

  -- Notify creator
  INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
  VALUES (
    v_cm.created_by, p_cm_id, v_step.id, 'cm_refused',
    'CM ' || v_cm.number || ' foi recusada por ' ||
    (SELECT name FROM departments WHERE id = v_actor_dept_id)
  );

  -- Notify vendas
  INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
  SELECT p.id, p_cm_id, v_step.id, 'cm_refused',
         'CM ' || v_cm.number || ' foi recusada'
  FROM profiles p
  JOIN departments d ON d.id = p.department_id
  WHERE d.slug = 'vendas'
    AND p.id != v_cm.created_by;

  RETURN QUERY SELECT
    v_step.id, v_step.cm_id, v_step.step_number, v_step.from_dept_id,
    v_step.to_dept_id, v_step.action, v_step.actor_id, v_step.notes, v_step.created_at;
END;
$$;

-- ============================================================================
-- PART 11: RPC — dispatch_parallel_existing (new, Custos only)
-- ============================================================================

CREATE OR REPLACE FUNCTION dispatch_parallel_existing(
  p_cm_id     uuid,
  p_dept_ids  uuid[],
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

  IF v_cm.workflow_stage != 'existing_custos' THEN
    RAISE EXCEPTION 'dispatch_parallel_existing only valid at existing_custos stage';
  END IF;

  IF array_length(p_dept_ids, 1) IS NULL OR array_length(p_dept_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Must provide at least one department';
  END IF;

  SELECT department_id INTO v_actor_dept_id FROM profiles WHERE id = p_actor_id;

  -- Build dept names for notes
  SELECT string_agg(name, ', ') INTO v_dept_names
  FROM departments WHERE id = ANY(p_dept_ids);

  INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
  VALUES (p_cm_id, v_actor_dept_id, v_actor_dept_id, 'dispatched_parallel', p_actor_id,
          COALESCE(p_notes || ' — ', '') || 'Encaminhada para: ' || v_dept_names)
  RETURNING * INTO v_step;

  UPDATE cms
  SET current_dept_id = NULL, workflow_stage = 'existing_parallel'
  WHERE id = p_cm_id;

  FOR v_dept_id IN SELECT unnest(p_dept_ids)
  LOOP
    INSERT INTO cm_parallel_branches (cm_id, dept_id, branch_type)
    VALUES (p_cm_id, v_dept_id, 'existing_parallel');

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
-- PART 12: RPC — contest_cm (new, Vendas only)
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

-- ============================================================================
-- PART 13: RPC — respond_to_contest (new)
-- The dept that was contested responds. CM always returns to Vendas.
-- p_response: 'ok' or 'refused'
-- ============================================================================

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
  v_cm            cms%ROWTYPE;
  v_step          cm_steps%ROWTYPE;
  v_actor_dept_id uuid;
  v_vendas_id     uuid;
BEGIN
  IF p_response NOT IN ('ok', 'refused') THEN
    RAISE EXCEPTION 'p_response must be ''ok'' or ''refused''';
  END IF;

  SELECT * INTO v_cm FROM cms WHERE id = p_cm_id AND status = 'open';
  IF v_cm.id IS NULL THEN
    RAISE EXCEPTION 'CM not found or not open';
  END IF;

  IF v_cm.workflow_stage != 'contestation' THEN
    RAISE EXCEPTION 'respond_to_contest only valid at contestation stage';
  END IF;

  SELECT department_id INTO v_actor_dept_id FROM profiles WHERE id = p_actor_id;
  SELECT id INTO v_vendas_id FROM departments WHERE slug = 'vendas';

  INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
  VALUES (p_cm_id, v_actor_dept_id, v_vendas_id, 'contest_response', p_actor_id,
          COALESCE(p_notes, '') || ' [Resposta: ' || p_response || ']')
  RETURNING * INTO v_step;

  UPDATE cms
  SET current_dept_id   = v_vendas_id,
      workflow_stage     = 'vendas_finalize',
      contested_step_id  = NULL,
      contest_reason     = NULL
  WHERE id = p_cm_id;

  INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
  SELECT p.id, p_cm_id, v_step.id, 'cm_contest_response',
         (SELECT name FROM departments WHERE id = v_actor_dept_id) ||
         ' respondeu à contestação da CM ' || v_cm.number
  FROM profiles p WHERE p.department_id = v_vendas_id;

  RETURN QUERY SELECT
    v_step.id, v_step.cm_id, v_step.step_number, v_step.from_dept_id,
    v_step.to_dept_id, v_step.action, v_step.actor_id, v_step.notes, v_step.created_at;
END;
$$;

-- ============================================================================
-- PART 14: RPC — finalize_cm (updated)
-- ============================================================================

CREATE OR REPLACE FUNCTION finalize_cm(
  p_cm_id      uuid,
  p_viability  boolean,
  p_ov_number  text,
  p_notes      text,
  p_actor_id   uuid
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
  v_cm          cms%ROWTYPE;
  v_step        cm_steps%ROWTYPE;
  v_vendas_id   uuid;
BEGIN
  SELECT * INTO v_cm FROM cms WHERE id = p_cm_id AND status = 'open';
  IF v_cm.id IS NULL THEN
    RAISE EXCEPTION 'CM not found or not open';
  END IF;

  IF v_cm.workflow_stage != 'vendas_finalize' THEN
    RAISE EXCEPTION 'finalize_cm only valid at vendas_finalize stage';
  END IF;

  SELECT id INTO v_vendas_id FROM departments WHERE slug = 'vendas';

  INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
  VALUES (p_cm_id, v_vendas_id, v_vendas_id, 'finalized', p_actor_id, p_notes)
  RETURNING * INTO v_step;

  UPDATE cms
  SET status             = CASE WHEN p_viability THEN 'closed_viable' ELSE 'closed_not_viable' END,
      current_dept_id    = v_vendas_id,
      workflow_stage     = 'finalized',
      viability          = p_viability,
      ov_number          = p_ov_number,
      finalization_notes = p_notes,
      finalized_at       = now(),
      finalized_by       = p_actor_id
  WHERE id = p_cm_id;

  -- Notify creator
  INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
  VALUES (
    v_cm.created_by, p_cm_id, v_step.id, 'cm_finalized',
    'CM ' || v_cm.number || ' foi finalizada' ||
    CASE WHEN p_viability THEN ' (viável)' ELSE ' (não viável)' END
  );

  -- Notify all departments that participated (distinct from steps)
  INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
  SELECT DISTINCT p.id, p_cm_id, v_step.id, 'cm_finalized',
         'CM ' || v_cm.number || ' foi finalizada'
  FROM cm_steps s
  JOIN profiles p ON p.department_id = s.from_dept_id
  WHERE s.cm_id = p_cm_id
    AND s.from_dept_id IS NOT NULL
    AND p.id != v_cm.created_by;

  RETURN QUERY SELECT
    v_step.id, v_step.cm_id, v_step.step_number, v_step.from_dept_id,
    v_step.to_dept_id, v_step.action, v_step.actor_id, v_step.notes, v_step.created_at;
END;
$$;
