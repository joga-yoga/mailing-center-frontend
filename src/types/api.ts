export interface MailerAgentConfig {
  global_style_instruction?: string | null;
  first_contact_instruction?: string | null;
  reply_instruction?: string | null;
  quality_review_instruction?: string | null;
  company_context?: string | null;
  offer_context?: string | null;
  target_audience?: string | null;
  cta_instruction?: string | null;
  forbidden_phrases?: string[];
  required_points?: string[];
  personalization_level?: 'low' | 'medium' | 'high';
  max_body_chars?: number;
  max_subject_chars?: number;
  default_language?: string | null;
  generation_model?: string | null;
  classifier_model?: string | null;
  reviewer_model?: string | null;
}

export interface CampaignSetupRequest {
  name?: string;
  sender_account_ids?: string[];
  // Режим одержувачів (взаємовиключний вибір)
  emails?: string[]; // Варіант 1: список email
  country?: string; // Варіант 2: фільтри БД
  object_type?: string; // Варіант 2: фільтри БД
  included_place_ids?: string[]; // Додатково: які B2B-об'єкти з фільтрів включати

  // Обов'язкові генераційні підказки
  subject_prompt: string;
  body_prompt: string;

  // Парсинг (умовне поле)
  parsing?: boolean;
  parsing_prompt?: string;

  // Автовідповіді (умовне поле)
  auto_answering?: boolean;
  single_reply_only?: boolean;
  reply_prompt?: string;

  // Стиль (необов'язково)
  tov?: 'casual' | 'friendly' | 'professional' | 'enthusiastic' | 'sincere' | 'playful';
  style?: 'short' | 'storytelling' | 'question_centric' | 'compliment_first' | 'conversational' | 'structured';
  language?: string;

  // Надсилання/планування
  use_corporate?: boolean;
  daily_limit?: number;
  timezone?: string;

  // Mailer Agent
  mailer_agent_mode?: 'legacy_assistant' | 'responses' | 'disabled';
  mailer_agent_draft_mode?: 'draft_only' | 'trusted_auto';
  mailer_agent_website_context_enabled?: boolean;
  mailer_agent_config?: MailerAgentConfig;
}

export interface CampaignSetupResponse {
  campaign_id: string;
  message: string;
  queued: number;
  filters: Record<string, any>;
  settings: Record<string, any>;
}

export interface CampaignStatusResponse {
  // Basic Info
  campaign_id: string;
  name: string | null;
  status: "pending" | "in_progress" | "paused" | "completed" | "failed";
  started_at: string | null;  // ISO datetime
  finished_at: string | null;  // ISO datetime
  next_send_in_seconds: number | null; // seconds until next send (float), nullable
  estimated_seconds_to_finish: number | null; // seconds to finish whole campaign (float), nullable
  
  // Filters
  country: string | null;
  object_type: string | null;
  
  // Settings
  parsing: boolean;
  auto_answering: boolean;
  use_corporate: boolean;
  mailer_agent_mode?: string | null;
  mailer_agent_draft_mode?: string | null;
  mailer_agent_website_context_enabled?: boolean | null;
  mailer_agent_config?: MailerAgentConfig | null;
  
  // Prompts
  subject_prompt: string | null;
  body_prompt: string | null;
  parsing_prompt: string | null;
  reply_prompt: string | null;
  
  // Style
  tov: string | null;  // e.g., "friendly", "professional"
  style: string | null;  // e.g., "short", "storytelling"
  language: string;  // e.g., "pl"
  
  // Limits
  daily_limit: number | null;
  timezone: string | null;
  
  // Work hours
  work_start_hour?: number;
  work_end_hour?: number;
  
  // Statistics
  statistics: {
    total: number;     // Total emails to send
    sent: number;      // Successfully sent
    failed: number;    // Failed to send
    replied: number;   // Received replies
    bounced: number;   // Bounced emails
  };
  
  // Objects list
  objects: Array<{
    place_id: string;
    name: string | null;
    type: string | null;
    email: string | null;
    email_status: "queued" | "enriching" | "generated" | "needs_review" | "scheduled" | "sending" | "sent" | "failed" | "replied" | "bounced" | null;
    planned_send_at: string | null;  // ISO datetime
    sent_at: string | null;  // ISO datetime
    from_email: string | null;  // Sender email address
    error: string | null;
    generation_error: string | null;
    reply_count?: number;
  }>;
}
