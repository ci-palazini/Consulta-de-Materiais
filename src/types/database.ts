// This file contains Supabase generated types
// Run: supabase gen types typescript --project-id xxxx > src/types/database.ts
// Or manually define types based on schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      departments: {
        Row: {
          id: string
          name: string
          slug: string
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          display_order: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          display_order?: number
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          department_id: string
          role: 'member' | 'admin'
          avatar_initials: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          department_id: string
          role?: 'member' | 'admin'
          avatar_initials?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          department_id?: string
          role?: 'member' | 'admin'
          avatar_initials?: string
          created_at?: string
          updated_at?: string
        }
      }
      cms: {
        Row: {
          id: string
          number: string
          title: string
          description: string
          status: 'open' | 'closed_viable' | 'closed_not_viable'
          current_dept_id: string | null
          created_by: string
          viability: boolean | null
          ov_number: string | null
          internal_id: string | null
          critical_analysis_url: string | null
          finalization_notes: string | null
          finalized_at: string | null
          finalized_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          number?: string
          title: string
          description: string
          status?: 'open' | 'closed_viable' | 'closed_not_viable'
          current_dept_id?: string | null
          created_by: string
          viability?: boolean | null
          ov_number?: string | null
          internal_id?: string | null
          critical_analysis_url?: string | null
          finalization_notes?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          number?: string
          title?: string
          description?: string
          status?: 'open' | 'closed_viable' | 'closed_not_viable'
          current_dept_id?: string | null
          created_by?: string
          viability?: boolean | null
          ov_number?: string | null
          internal_id?: string | null
          critical_analysis_url?: string | null
          finalization_notes?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cm_steps: {
        Row: {
          id: string
          cm_id: string
          step_number: number
          from_dept_id: string | null
          to_dept_id: string
          action: 'created' | 'forwarded' | 'returned' | 'finalized'
          actor_id: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cm_id: string
          step_number?: number
          from_dept_id?: string | null
          to_dept_id: string
          action: 'created' | 'forwarded' | 'returned' | 'finalized'
          actor_id: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cm_id?: string
          step_number?: number
          from_dept_id?: string | null
          to_dept_id?: string
          action?: 'created' | 'forwarded' | 'returned' | 'finalized'
          actor_id?: string
          notes?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          cm_id: string
          cm_step_id: string | null
          type: 'cm_assigned' | 'cm_finalized' | 'cm_returned'
          message: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          cm_id: string
          cm_step_id?: string | null
          type: 'cm_assigned' | 'cm_finalized' | 'cm_returned'
          message: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          cm_id?: string
          cm_step_id?: string | null
          type?: 'cm_assigned' | 'cm_finalized' | 'cm_returned'
          message?: string
          read?: boolean
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {
      forward_cm: {
        Args: {
          cm_id: string
          to_dept_id: string
          notes: string
          actor_id: string
        }
        Returns: {
          id: string
          cm_id: string
          step_number: number
          from_dept_id: string | null
          to_dept_id: string
          action: 'created' | 'forwarded' | 'returned' | 'finalized'
          actor_id: string
          notes: string | null
          created_at: string
        }
      }
      finalize_cm: {
        Args: {
          cm_id: string
          viability: boolean
          ov_number: string | null
          notes: string
          actor_id: string
        }
        Returns: {
          id: string
          cm_id: string
          step_number: number
          from_dept_id: string | null
          to_dept_id: string
          action: 'created' | 'forwarded' | 'returned' | 'finalized'
          actor_id: string
          notes: string | null
          created_at: string
        }
      }
    }
  }
}
