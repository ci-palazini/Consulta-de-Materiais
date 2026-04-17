-- ============================================================================
-- Jump stage for existing-item flow
--
-- Allows Pricing (existing_pricing_1) and Custos (existing_custos) to jump
-- directly to any future stage in the existing-item workflow, with explicit
-- audit trail via cm_steps.action = 'jumped'.
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
    'jumped',
    'finalized'
  ));

DROP FUNCTION IF EXISTS jump_existing_stage(uuid, text, text, uuid, uuid[]);

CREATE OR REPLACE FUNCTION jump_existing_stage(
  p_cm_id              uuid,
  p_target_stage       text,
  p_notes              text,
  p_actor_id           uuid,
  p_parallel_dept_ids  uuid[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  cm_id uuid,
  step_number integer,
  from_dept_id uuid,
  to_dept_id uuid,
  action text,
  actor_id uuid,
  notes text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cm                      cms%ROWTYPE;
  v_step                    cm_steps%ROWTYPE;
  v_actor_dept_id           uuid;
  v_pricing_dept_id         uuid;
  v_custos_dept_id          uuid;
  v_vendas_dept_id          uuid;
  v_target_dept_id          uuid;
  v_from_index              integer;
  v_target_index            integer;
  v_clean_notes             text;
  v_parallel_dept_id        uuid;
  v_distinct_parallel_count integer;
  v_stage_order             text[] := ARRAY[
    'existing_pricing_1',
    'existing_custos',
    'existing_parallel',
    'existing_custos_2',
    'existing_pricing_2',
    'vendas_finalize'
  ];
BEGIN
  SELECT * INTO v_cm
  FROM cms c
  WHERE c.id = p_cm_id
    AND c.status = 'open';

  IF v_cm.id IS NULL THEN
    RAISE EXCEPTION 'CM not found or not open';
  END IF;

  IF v_cm.workflow_stage NOT IN ('existing_pricing_1', 'existing_custos') THEN
    RAISE EXCEPTION 'jump_existing_stage only valid at existing_pricing_1 or existing_custos';
  END IF;

  SELECT p.department_id INTO v_actor_dept_id
  FROM profiles p
  WHERE p.id = p_actor_id;

  IF v_actor_dept_id IS NULL THEN
    RAISE EXCEPTION 'Actor profile not found';
  END IF;

  SELECT id INTO v_pricing_dept_id FROM departments WHERE slug = 'pricing';
  SELECT id INTO v_custos_dept_id  FROM departments WHERE slug = 'custos';
  SELECT id INTO v_vendas_dept_id  FROM departments WHERE slug = 'vendas';

  IF v_cm.workflow_stage = 'existing_pricing_1' AND v_actor_dept_id <> v_pricing_dept_id THEN
    RAISE EXCEPTION 'Only Pricing can jump from existing_pricing_1';
  END IF;

  IF v_cm.workflow_stage = 'existing_custos' AND v_actor_dept_id <> v_custos_dept_id THEN
    RAISE EXCEPTION 'Only Custos can jump from existing_custos';
  END IF;

  v_from_index   := array_position(v_stage_order, v_cm.workflow_stage);
  v_target_index := array_position(v_stage_order, p_target_stage);

  IF v_target_index IS NULL THEN
    RAISE EXCEPTION 'Invalid target stage: %', p_target_stage;
  END IF;

  IF v_target_index <= v_from_index THEN
    RAISE EXCEPTION 'Can only jump to future stages';
  END IF;

  v_clean_notes := NULLIF(BTRIM(COALESCE(p_notes, '')), '');

  IF p_target_stage = 'existing_parallel' THEN
    IF p_parallel_dept_ids IS NULL OR COALESCE(array_length(p_parallel_dept_ids, 1), 0) = 0 THEN
      RAISE EXCEPTION 'Must provide at least one department for existing_parallel';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM unnest(p_parallel_dept_ids) selected_id
      LEFT JOIN departments d ON d.id = selected_id
      WHERE d.id IS NULL
    ) THEN
      RAISE EXCEPTION 'Invalid department in parallel selection';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM departments d
      WHERE d.id = ANY(p_parallel_dept_ids)
        AND d.slug IN ('vendas', 'custos', 'pricing')
    ) THEN
      RAISE EXCEPTION 'Parallel jump cannot include Vendas, Custos or Pricing';
    END IF;

    SELECT COUNT(*) INTO v_distinct_parallel_count
    FROM (SELECT DISTINCT unnest(p_parallel_dept_ids) AS id) x;

    IF v_distinct_parallel_count = 0 THEN
      RAISE EXCEPTION 'Must provide at least one unique department for parallel jump';
    END IF;

    INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
    VALUES (
      p_cm_id,
      v_actor_dept_id,
      v_actor_dept_id,
      'jumped',
      p_actor_id,
      'Pulo de etapa: ' || v_cm.workflow_stage || ' -> existing_parallel' ||
      COALESCE('. Motivo: ' || v_clean_notes, '')
    )
    RETURNING * INTO v_step;

    UPDATE cms
    SET current_dept_id = NULL,
        workflow_stage  = 'existing_parallel'
    WHERE cms.id = p_cm_id;

    FOR v_parallel_dept_id IN
      SELECT DISTINCT unnest(p_parallel_dept_ids)
    LOOP
      INSERT INTO cm_parallel_branches (cm_id, dept_id, branch_type)
      VALUES (p_cm_id, v_parallel_dept_id, 'existing_parallel')
      ON CONFLICT (cm_id, dept_id, branch_type)
      DO UPDATE SET
        status = 'pending',
        step_id = NULL,
        resolved_at = NULL;

      INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
      SELECT p.id, p_cm_id, v_step.id, 'cm_assigned',
             'CM ' || v_cm.number || ' recebeu pulo de etapa e aguarda sua análise em paralelo'
      FROM profiles p
      WHERE p.department_id = v_parallel_dept_id;
    END LOOP;
  ELSE
    CASE p_target_stage
      WHEN 'existing_custos' THEN
        v_target_dept_id := v_custos_dept_id;
      WHEN 'existing_custos_2' THEN
        v_target_dept_id := v_custos_dept_id;
      WHEN 'existing_pricing_2' THEN
        v_target_dept_id := v_pricing_dept_id;
      WHEN 'vendas_finalize' THEN
        v_target_dept_id := v_vendas_dept_id;
      ELSE
        RAISE EXCEPTION 'Invalid target stage for jump: %', p_target_stage;
    END CASE;

    INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
    VALUES (
      p_cm_id,
      v_actor_dept_id,
      v_target_dept_id,
      'jumped',
      p_actor_id,
      'Pulo de etapa: ' || v_cm.workflow_stage || ' -> ' || p_target_stage ||
      COALESCE('. Motivo: ' || v_clean_notes, '')
    )
    RETURNING * INTO v_step;

    UPDATE cms
    SET current_dept_id = v_target_dept_id,
        workflow_stage  = p_target_stage
    WHERE cms.id = p_cm_id;

    INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
    SELECT p.id, p_cm_id, v_step.id, 'cm_assigned',
           'CM ' || v_cm.number || ' recebeu pulo de etapa e foi encaminhada para seu departamento'
    FROM profiles p
    WHERE p.department_id = v_target_dept_id;
  END IF;

  RETURN QUERY
  SELECT v_step.id, v_step.cm_id, v_step.step_number, v_step.from_dept_id,
         v_step.to_dept_id, v_step.action, v_step.actor_id, v_step.notes, v_step.created_at;
END;
$$;
