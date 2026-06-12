export type Database = {
  public: {
    Tables: {
      participant_opinions: {
        Row: {
          id: string
          policy_id: string
          anonymous_id: string
          nickname: string | null
          agree_content: string | null
          concern: string | null
          improvement: string | null
          first_action: string | null
          key_sentence: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['participant_opinions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['participant_opinions']['Insert']>
      }
      table_sessions: {
        Row: {
          id: string
          policy_id: string
          facilitator_name: string | null
          recorder_name: string | null
          photo_url: string | null
          photo_uploaded_at: string | null
          ai_result: AiResult | null
          ai_processed_at: string | null
          final_content: FinalContent | null
          is_confirmed: boolean
          tiro_summary: string | null
          tiro_url: string | null
          pdf_url: string | null
          pptx_url: string | null
          is_public: 'public' | 'private' | 'admin_only'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['table_sessions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['table_sessions']['Insert']>
      }
    }
  }
}

export type AiResult = {
  agree_content: string
  concern: string
  improvement: string
  first_action: string
  key_sentence: string
  core_problem: string
  final_proposal: string
  implementation: string
  expected_effect: string
  risks_and_supplements: string
}

export type FinalContent = AiResult & {
  policy_proposer?: string
  reference_notes?: string
}
