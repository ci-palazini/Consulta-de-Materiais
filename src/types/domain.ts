import type { CMStatusType, CMActionType, UserRoleType } from './enums'

export interface Department {
  id: string
  name: string
  slug: string
  display_order: number
  created_at: string
}

export interface Profile {
  id: string
  full_name: string
  email: string
  department_id: string
  role: UserRoleType
  avatar_initials: string
  created_at: string
  updated_at: string
  // Denormalized for convenience
  department?: Department
}

export interface CM {
  id: string
  number: string
  title: string
  description: string
  status: CMStatusType
  current_dept_id: string | null
  created_by: string
  viability: boolean | null
  ov_number: string | null
  finalization_notes: string | null
  finalized_at: string | null
  finalized_by: string | null
  created_at: string
  updated_at: string
  // Denormalized for convenience
  creator?: Profile
  current_department?: Department
}

export interface CMStep {
  id: string
  cm_id: string
  step_number: number
  from_dept_id: string | null
  to_dept_id: string
  action: CMActionType
  actor_id: string
  notes: string | null
  created_at: string
  // Denormalized for convenience
  from_department?: Department
  to_department?: Department
  actor?: Profile
}

export interface Notification {
  id: string
  user_id: string
  cm_id: string
  cm_step_id: string | null
  type: 'cm_assigned' | 'cm_finalized' | 'cm_returned'
  message: string
  read: boolean
  created_at: string
}

export interface CMAttachment {
  id: string
  cm_id: string
  uploaded_by: string
  file_name: string
  file_size: number
  mime_type: string
  storage_path: string
  created_at: string
  // Denormalized
  uploader?: Profile
}

export interface CMWithSteps extends CM {
  steps: CMStep[]
  attachments?: CMAttachment[]
}
