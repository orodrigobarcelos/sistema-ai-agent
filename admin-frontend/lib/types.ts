export interface Tag {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  created_at: string;
}

export interface CustomField {
  id: string;
  name: string;
  field_type: "text" | "number" | "boolean" | "date" | "datetime" | "json";
  description: string | null;
  created_at: string;
}

export interface Board {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface BoardListItem extends Board {
  kanban_columns: { count: number }[];
}

export interface BoardColumn {
  id: string;
  board_id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface KanbanLead {
  id: string;
  name: string;
  whatsapp: string;
  country_code: string;
  instagram: string | null;
  tags: Array<{ id: string; name: string; color: string | null }>;
  position_id: string;
  position: number;
  moved_at: string;
}

export interface KanbanColumnWithLeads extends BoardColumn {
  leads: KanbanLead[];
}

export interface ContactListItem {
  id: string;
  name: string;
  whatsapp: string;
  country_code: string;
  instagram: string | null;
  utm_source: string | null;
  created_at: string;
  profile_pic_url: string | null;
  ig_username: string | null;
  tags: Array<{ id: string; name: string; color: string | null }>;
}

export interface TictoOrder {
  id: string;
  status: string;
  status_date: string | null;
  product_name: string | null;
  offer_name: string | null;
  paid_amount: number | null;
  payment_method: string | null;
  created_at: string;
}

export interface ContactDetail extends ContactListItem {
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_content: string | null;
  utm_term: string | null;
  session_id: string | null;
  ig_full_name: string | null;
  ig_bio: string | null;
  ig_followers: number | null;
  custom_fields: Array<{ name: string; value: string; field_type: string }>;
  kanban_position: { board_name: string; column_name: string } | null;
  orders: TictoOrder[];
  last_interaction: string | null;
  conversation_summary: string | null;
}

export interface ChatConversation {
  session_id: string;
  lead_name: string | null;
  lead_phone: string;
  profile_pic_url: string | null;
  last_message: string;
  last_message_at: string;
}

export interface ChatMessage {
  id: number;
  session_id: string;
  type: "human" | "ai";
  content: string;
  created_at: string;
}

export interface ChatLeadInfo {
  name: string | null;
  phone: string;
  profile_pic_url: string | null;
  ig_username: string | null;
  tags: Array<{ id: string; name: string; color: string | null }>;
  utm_source: string | null;
  created_at: string | null;
  kanban_position: { board_name: string; column_name: string } | null;
}

export interface ChatMedia {
  id: string;
  session_id: string;
  message_id: number | null;
  media_type: "image" | "audio" | "video" | "document" | "sticker";
  storage_path: string;
  mime_type: string | null;
  created_at: string;
}
