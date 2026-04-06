-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- ============================================================================
-- DEPARTMENTS TABLE
-- ============================================================================
CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  display_order integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for slug lookups
CREATE INDEX idx_departments_slug ON departments(slug);

-- Insert the 9 departments
INSERT INTO departments (name, slug, display_order) VALUES
  ('Vendas', 'vendas', 1),
  ('Engenharia de Aplicação', 'eng_aplicacao', 2),
  ('Engenharia de Produto', 'eng_produto', 3),
  ('Qualidade', 'qualidade', 4),
  ('Planejamento', 'planejamento', 5),
  ('Suprimentos', 'suprimentos', 6),
  ('Engenharia de Processos', 'eng_processos', 7),
  ('Custos', 'custos', 8),
  ('Pricing', 'pricing', 9);

-- ============================================================================
-- PROFILES TABLE (extends auth.users)
-- ============================================================================
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  department_id uuid NOT NULL REFERENCES departments(id),
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  avatar_initials text GENERATED ALWAYS AS (
    upper(
      left(split_part(full_name, ' ', 1), 1) ||
      coalesce(left(split_part(full_name, ' ', -1), 1), '')
    )
  ) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indices
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_department_id ON profiles(department_id);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CMS TABLE (Consultas de Materiais)
-- ============================================================================
CREATE TABLE cms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed_viable', 'closed_not_viable')),
  current_dept_id uuid REFERENCES departments(id),
  created_by uuid NOT NULL REFERENCES profiles(id),
  viability boolean,
  ov_number text,
  finalization_notes text,
  finalized_at timestamptz,
  finalized_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indices
CREATE INDEX idx_cms_status ON cms(status);
CREATE INDEX idx_cms_current_dept_id ON cms(current_dept_id);
CREATE INDEX idx_cms_created_by ON cms(created_by);
CREATE INDEX idx_cms_created_at ON cms(created_at DESC);

-- Enable RLS on cms
ALTER TABLE cms ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CM_STEPS TABLE (Immutable audit trail)
-- ============================================================================
CREATE TABLE cm_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cm_id uuid NOT NULL REFERENCES cms(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  from_dept_id uuid REFERENCES departments(id),
  to_dept_id uuid NOT NULL REFERENCES departments(id),
  action text NOT NULL CHECK (action IN ('created', 'forwarded', 'returned', 'finalized')),
  actor_id uuid NOT NULL REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(cm_id, step_number)
);

-- Create indices
CREATE INDEX idx_cm_steps_cm_id ON cm_steps(cm_id);
CREATE INDEX idx_cm_steps_actor_id ON cm_steps(actor_id);
CREATE INDEX idx_cm_steps_created_at ON cm_steps(created_at DESC);

-- Enable RLS on cm_steps
ALTER TABLE cm_steps ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cm_id uuid NOT NULL REFERENCES cms(id) ON DELETE CASCADE,
  cm_step_id uuid REFERENCES cm_steps(id),
  type text NOT NULL CHECK (type IN ('cm_assigned', 'cm_finalized', 'cm_returned')),
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indices
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TRIGGER: Auto-increment step_number per CM
-- ============================================================================
CREATE OR REPLACE FUNCTION set_step_number()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(MAX(step_number), 0) + 1
  INTO NEW.step_number
  FROM cm_steps
  WHERE cm_id = NEW.cm_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_step_number
BEFORE INSERT ON cm_steps
FOR EACH ROW
EXECUTE FUNCTION set_step_number();

-- ============================================================================
-- TRIGGER: Auto-generate CM number
-- ============================================================================
CREATE SEQUENCE cm_number_seq START 1 INCREMENT 1;

CREATE OR REPLACE FUNCTION generate_cm_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.number := 'CM-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('cm_number_seq')::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_cm_number
BEFORE INSERT ON cms
FOR EACH ROW
EXECUTE FUNCTION generate_cm_number();

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_update_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER cms_update_updated_at
BEFORE UPDATE ON cms
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Profiles: all authenticated users can read, users can update their own
CREATE POLICY "profiles_read_all" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- CMS: all authenticated users can read all CMs
CREATE POLICY "cms_read_all" ON cms
  FOR SELECT USING (auth.role() = 'authenticated');

-- CMS: only the creator can insert new CMs
CREATE POLICY "cms_insert" ON cms
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- CM_STEPS: all authenticated users can read
CREATE POLICY "cm_steps_read_all" ON cm_steps
  FOR SELECT USING (auth.role() = 'authenticated');

-- Notifications: users can only read their own
CREATE POLICY "notifications_read_own" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- Forward CM to another department
CREATE OR REPLACE FUNCTION forward_cm(
  p_cm_id uuid,
  p_to_dept_id uuid,
  p_notes text,
  p_actor_id uuid
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
  v_cm_row cms%ROWTYPE;
  v_step_record cm_steps%ROWTYPE;
  v_dept_member profiles%ROWTYPE;
BEGIN
  -- Get the CM to verify it exists
  SELECT * INTO v_cm_row FROM cms WHERE id = p_cm_id;
  IF v_cm_row.id IS NULL THEN
    RAISE EXCEPTION 'CM not found';
  END IF;

  -- Create the step
  INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
  VALUES (p_cm_id, v_cm_row.current_dept_id, p_to_dept_id, 'forwarded', p_actor_id, p_notes)
  RETURNING * INTO v_step_record;

  -- Update CM current_dept_id
  UPDATE cms SET current_dept_id = p_to_dept_id WHERE id = p_cm_id;

  -- Create notifications for all members of the target department
  INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
  SELECT
    p.id,
    p_cm_id,
    v_step_record.id,
    'cm_assigned',
    'CM ' || v_cm_row.number || ' foi designada para seu departamento'
  FROM profiles p
  WHERE p.department_id = p_to_dept_id;

  RETURN QUERY SELECT
    v_step_record.id,
    v_step_record.cm_id,
    v_step_record.step_number,
    v_step_record.from_dept_id,
    v_step_record.to_dept_id,
    v_step_record.action,
    v_step_record.actor_id,
    v_step_record.notes,
    v_step_record.created_at;
END;
$$;

-- Finalize CM
CREATE OR REPLACE FUNCTION finalize_cm(
  p_cm_id uuid,
  p_viability boolean,
  p_ov_number text,
  p_notes text,
  p_actor_id uuid
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
  v_cm_row cms%ROWTYPE;
  v_step_record cm_steps%ROWTYPE;
  v_vendas_dept_id uuid;
  v_eng_app_dept_id uuid;
BEGIN
  -- Get the CM
  SELECT * INTO v_cm_row FROM cms WHERE id = p_cm_id;
  IF v_cm_row.id IS NULL THEN
    RAISE EXCEPTION 'CM not found';
  END IF;

  -- Get department IDs
  SELECT id INTO v_vendas_dept_id FROM departments WHERE slug = 'vendas';
  SELECT id INTO v_eng_app_dept_id FROM departments WHERE slug = 'eng_aplicacao';

  -- Create the finalized step
  INSERT INTO cm_steps (cm_id, from_dept_id, to_dept_id, action, actor_id, notes)
  VALUES (
    p_cm_id,
    v_cm_row.current_dept_id,
    v_vendas_dept_id,
    'finalized',
    p_actor_id,
    p_notes
  )
  RETURNING * INTO v_step_record;

  -- Determine final status
  UPDATE cms
  SET
    current_dept_id = v_vendas_dept_id,
    status = CASE WHEN p_viability THEN 'closed_viable' ELSE 'closed_not_viable' END,
    viability = p_viability,
    ov_number = p_ov_number,
    finalization_notes = p_notes,
    finalized_at = now(),
    finalized_by = p_actor_id
  WHERE id = p_cm_id;

  -- Create notifications for the original creator
  INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
  VALUES (
    v_cm_row.created_by,
    p_cm_id,
    v_step_record.id,
    'cm_finalized',
    'CM ' || v_cm_row.number || ' foi finalizada' ||
    CASE WHEN p_viability THEN ' (viável)' ELSE ' (não viável)' END
  );

  -- Create notifications for Eng. Aplicacao
  INSERT INTO notifications (user_id, cm_id, cm_step_id, type, message)
  SELECT
    p.id,
    p_cm_id,
    v_step_record.id,
    'cm_finalized',
    'CM ' || v_cm_row.number || ' foi finalizada'
  FROM profiles p
  WHERE p.department_id = v_eng_app_dept_id;

  RETURN QUERY SELECT
    v_step_record.id,
    v_step_record.cm_id,
    v_step_record.step_number,
    v_step_record.from_dept_id,
    v_step_record.to_dept_id,
    v_step_record.action,
    v_step_record.actor_id,
    v_step_record.notes,
    v_step_record.created_at;
END;
$$;

-- Get CM with all its steps
CREATE OR REPLACE FUNCTION get_cm_with_steps(p_cm_id uuid)
RETURNS TABLE (
  cm_id uuid,
  cm_number text,
  cm_title text,
  cm_description text,
  cm_status text,
  cm_current_dept_id uuid,
  cm_created_by uuid,
  cm_viability boolean,
  cm_ov_number text,
  cm_created_at timestamptz,
  step_id uuid,
  step_number integer,
  step_action text,
  step_actor_id uuid,
  step_notes text,
  step_from_dept_id uuid,
  step_to_dept_id uuid,
  step_created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.number,
    c.title,
    c.description,
    c.status,
    c.current_dept_id,
    c.created_by,
    c.viability,
    c.ov_number,
    c.created_at,
    s.id,
    s.step_number,
    s.action,
    s.actor_id,
    s.notes,
    s.from_dept_id,
    s.to_dept_id,
    s.created_at
  FROM cms c
  LEFT JOIN cm_steps s ON c.id = s.cm_id
  WHERE c.id = p_cm_id
  ORDER BY s.step_number ASC;
$$;
