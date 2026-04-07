-- ============================================================================
-- Add is_new_item column to cms table
-- If true: routes to Eng. Aplicação (existing behavior)
-- If false: routes directly to Pricing
-- ============================================================================
ALTER TABLE cms ADD COLUMN IF NOT EXISTS is_new_item boolean NOT NULL DEFAULT true;

-- ============================================================================
-- RPC: create_cm (updated)
-- Now accepts p_is_new_item to determine initial routing
-- ============================================================================
CREATE OR REPLACE FUNCTION create_cm(
  p_title text,
  p_description text,
  p_actor_id uuid,
  p_is_new_item boolean DEFAULT true
)
RETURNS TABLE (
  id uuid,
  number text,
  title text,
  description text,
  status text,
  current_dept_id uuid,
  created_by uuid,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cm_row cms%ROWTYPE;
  v_step_record cm_steps%ROWTYPE;
  v_target_dept_id uuid;
  v_target_slug text;
BEGIN
  -- Determine target department based on is_new_item flag
  v_target_slug := CASE WHEN p_is_new_item THEN 'eng_aplicacao' ELSE 'pricing' END;

  SELECT id INTO v_target_dept_id FROM departments WHERE slug = v_target_slug;
  IF v_target_dept_id IS NULL THEN
    RAISE EXCEPTION 'Department % not found', v_target_slug;
  END IF;

  -- Insert the CM
  INSERT INTO cms (title, description, created_by, status, current_dept_id, is_new_item)
  VALUES (p_title, p_description, p_actor_id, 'open', v_target_dept_id, p_is_new_item)
  RETURNING * INTO v_cm_row;

  -- Create initial step
  INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
  VALUES (v_cm_row.id, NULL, v_target_dept_id, 'created', p_actor_id, 'Consulta de materiais criada')
  RETURNING * INTO v_step_record;

  -- Create notifications for target department members
  INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
  SELECT
    p.id,
    v_cm_row.id,
    v_step_record.id,
    'cm_assigned',
    'CM ' || v_cm_row.number || ' foi designada para seu departamento'
  FROM profiles p
  WHERE p.department_id = v_target_dept_id;

  RETURN QUERY SELECT
    v_cm_row.id,
    v_cm_row.number,
    v_cm_row.title,
    v_cm_row.description,
    v_cm_row.status,
    v_cm_row.current_dept_id,
    v_cm_row.created_by,
    v_cm_row.created_at;
END;
$$;
