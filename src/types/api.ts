export interface CampaignSetupRequest {
  // Режим одержувачів (взаємовиключний вибір)
  emails?: string[]; // Варіант 1: список email
  country?: string; // Варіант 2: фільтри БД
  object_type?: string; // Варіант 2: фільтри БД

  // Обов'язкові генераційні підказки
  subject_prompt: string;
  body_prompt: string;

  // Парсинг (умовне поле)
  parsing?: boolean;
  parsing_prompt?: string;

  // Автовідповіді (умовне поле)
  auto_answering?: boolean;
  reply_prompt?: string;

  // Стиль (необов'язково)
  tov?: 'casual' | 'friendly' | 'professional' | 'enthusiastic' | 'sincere' | 'playful';
  style?: 'short' | 'storytelling' | 'question_centric' | 'compliment_first' | 'conversational' | 'structured';
  language?: string;

  // Надсилання/планування
  use_corporate?: boolean;
  daily_limit?: number;
  timezone?: string;
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
  status: "pending" | "in_progress" | "completed" | "failed";
  started_at: string | null;  // ISO datetime
  finished_at: string | null;  // ISO datetime
  
  // Filters
  country: string | null;
  object_type: string | null;
  
  // Settings
  parsing: boolean;
  auto_answering: boolean;
  use_corporate: boolean;
  
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
  
  // Statistics
  statistics: {
    total: number;     // Total emails to send
    sent: number;      // Successfully sent
    failed: number;    // Failed to send
    replied: number;   // Received replies
  };
  
  // Objects list
  objects: Array<{
    place_id: string;
    name: string | null;
    type: string | null;
    email: string | null;
    email_status: "pending" | "sending" | "sent" | "failed" | "replied" | "bounced";
    sent_at: string | null;  // ISO datetime
    from_email: string | null;  // Sender email address
    error: string | null;
  }>;
}