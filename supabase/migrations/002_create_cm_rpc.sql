-- ============================================================================
-- RPC: create_cm
-- Handles CM creation atomically: inserts CM, initial step, and notifications
-- Uses SECURITY DEFINER to bypass RLS on cm_steps and notifications
-- (consistent with forward_cm and finalize_cm pattern)
-- ============================================================================
CREATE OR REPLACE FUNCTION create_cm(
  p_title text,
  p_description text,
  p_actor_id uuid
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
  v_eng_app_dept_id uuid;
BEGIN
  -- Get Engenharia de Aplicacao department
  SELECT id INTO v_eng_app_dept_id FROM departments WHERE slug = 'eng_aplicacao';
  IF v_eng_app_dept_id IS NULL THEN
    RAISE EXCEPTION 'Department eng_aplicacao not found';
  END IF;

  -- Insert the CM
  INSERT INTO cms (title, description, created_by, status, current_dept_id)
  VALUES (p_title, p_description, p_actor_id, 'open', v_eng_app_dept_id)
  RETURNING * INTO v_cm_row;

  -- Create initial step
  INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
  VALUES (v_cm_row.id, NULL, v_eng_app_dept_id, 'created', p_actor_id, 'Consulta de materiais criada')
  RETURNING * INTO v_step_record;

  -- Create notifications for Eng. Aplicacao members
  INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
  SELECT
    p.id,
    v_cm_row.id,
    v_step_record.id,
    'cm_assigned',
    'CM ' || v_cm_row.number || ' foi designada para seu departamento'
  FROM profiles p
  WHERE p.department_id = v_eng_app_dept_id;

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
