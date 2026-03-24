export function getTablesSql(option: 1 | 2 | 3, boardName: string = "Vendas"): string {
  let sql = `
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT '+55',
  email TEXT,
  instagram TEXT,
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  utm_content TEXT,
  utm_term TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id TEXT UNIQUE,
  last_followup_at TIMESTAMPTZ,
  completed_followups JSONB DEFAULT '[]'::jsonb,
  followup_attempts JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS n8n_chat_histories_whatsapp (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR NOT NULL,
  message JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kanban_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES kanban_boards(id),
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kanban_lead_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id UUID NOT NULL REFERENCES kanban_columns(id),
  lead_id UUID NOT NULL REFERENCES leads(id),
  position INTEGER NOT NULL DEFAULT 0,
  moved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  moved_by TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  ai_paused BOOLEAN DEFAULT false,
  paused_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  typing_until TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  total_messages_at_summary INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_name TEXT NOT NULL UNIQUE,
  is_running BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message_buffer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_phone TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);`;

  if (option === 3) {
    sql += `

CREATE TABLE IF NOT EXISTS instagram (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lead_id UUID NOT NULL UNIQUE REFERENCES leads(id),
  username TEXT NOT NULL,
  full_name TEXT,
  profile_pic_url TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  biography TEXT
);

CREATE TABLE IF NOT EXISTS personalizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id),
  message TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source = ANY (ARRAY['stories', 'bio'])),
  created_at TIMESTAMPTZ DEFAULT now(),
  message_generated_at TIMESTAMPTZ DEFAULT now(),
  instagram_username TEXT,
  UNIQUE(lead_id, source)
);`;
  }

  // Seed: criar board com nome customizado e 10 colunas
  const safeBoardName = boardName.replace(/'/g, "''");
  sql += `

DO $$
DECLARE v_board_id UUID;
BEGIN
  INSERT INTO kanban_boards (name, description)
  VALUES ('${safeBoardName}', 'Quadro kanban de ${safeBoardName.toLowerCase()}')
  ON CONFLICT (name) DO NOTHING
  RETURNING id INTO v_board_id;

  IF v_board_id IS NOT NULL THEN
    INSERT INTO kanban_columns (board_id, name, position) VALUES
      (v_board_id, 'RECEBIDO', 0),
      (v_board_id, 'RESPONDEU', 1),
      (v_board_id, 'EM FECHAMENTO', 2),
      (v_board_id, 'FALAR C/ HUMANO', 3),
      (v_board_id, 'CARRINHO ABANDONADO', 4),
      (v_board_id, 'COMPRA RECUSADA', 5),
      (v_board_id, 'PAGAMENTO GERADO', 6),
      (v_board_id, 'FECHADO', 7),
      (v_board_id, 'PERDIDO', 8),
      (v_board_id, 'REEMBOLSO', 9);
  END IF;
END $$;`;

  return sql;
}

export function getRpcsSql(option: 1 | 2 | 3): string {
  let sql = `
CREATE OR REPLACE FUNCTION public.delete_duplicate_human_message(p_session_id text, p_content text)
 RETURNS void LANGUAGE sql SECURITY DEFINER
AS $function$
  DELETE FROM n8n_chat_histories_whatsapp
  WHERE id = (
    SELECT id FROM n8n_chat_histories_whatsapp
    WHERE session_id = p_session_id
      AND message->>'type' = 'human'
      AND message->>'content' = p_content
    ORDER BY id DESC LIMIT 1
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_lead_board_column(p_lead_id uuid, p_board_name text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER
AS $function$
DECLARE
  v_board_id UUID;
  v_column_name TEXT;
BEGIN
  SELECT id INTO v_board_id FROM kanban_boards WHERE LOWER(name) = LOWER(p_board_name);
  IF v_board_id IS NULL THEN
    RETURN json_build_object('found', false, 'board_exists', false, 'column_name', null);
  END IF;
  SELECT kc.name INTO v_column_name
  FROM kanban_lead_positions klp
  JOIN kanban_columns kc ON kc.id = klp.column_id
  WHERE kc.board_id = v_board_id AND klp.lead_id = p_lead_id;
  IF v_column_name IS NULL THEN
    RETURN json_build_object('found', false, 'board_exists', true, 'column_name', null);
  END IF;
  RETURN json_build_object('found', true, 'board_exists', true, 'column_name', v_column_name);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_leads_pending_followup(p_kanban_nome text, p_espera_respondeu integer DEFAULT 6, p_espera_nao_respondeu integer DEFAULT 24, p_expira_tentativa integer DEFAULT 72)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER
AS $function$
DECLARE
  v_board_id UUID;
  v_result JSON;
BEGIN
  SELECT id INTO v_board_id FROM kanban_boards WHERE LOWER(name) = LOWER(p_kanban_nome);
  IF v_board_id IS NULL THEN RETURN '[]'::JSON; END IF;
  WITH board_leads AS (
    SELECT l.id AS lead_id, l.name AS lead_name, l.whatsapp, kc.name AS column_name,
      last_msg.session_id, last_msg.last_message_at,
      RIGHT(REPLACE(l.whatsapp, '+', ''), 8) AS phone_8,
      COALESCE(l.completed_followups, '[]'::jsonb) AS completed_followups,
      COALESCE(l.followup_attempts, '{}'::jsonb) AS followup_attempts,
      l.last_followup_at
    FROM kanban_lead_positions klp
    JOIN kanban_columns kc ON kc.id = klp.column_id AND kc.board_id = v_board_id
    JOIN leads l ON l.id = klp.lead_id
    INNER JOIN LATERAL (
      SELECT h.session_id, h.created_at AS last_message_at, h.message->>'type' AS last_message_type
      FROM n8n_chat_histories_whatsapp h
      WHERE RIGHT(REPLACE(REPLACE(h.session_id, '@s.whatsapp.net', ''), '+', ''), 8) = RIGHT(REPLACE(l.whatsapp, '+', ''), 8)
      ORDER BY h.id DESC LIMIT 1
    ) last_msg ON last_msg.last_message_type = 'ai'
  ),
  lead_status AS (
    SELECT bl.*,
      (SELECT min(n) FROM generate_series(1, 4) AS n
       WHERE NOT bl.completed_followups @> ('[' || n || ']')::jsonb
       AND (NOT bl.followup_attempts ? n::text
            OR (bl.followup_attempts ->> n::text)::timestamptz > NOW() - (p_expira_tentativa || ' hours')::INTERVAL)
      ) AS next_followup,
      jsonb_array_length(bl.completed_followups) AS done_count,
      CASE WHEN bl.last_followup_at IS NOT NULL THEN
        EXISTS (SELECT 1 FROM n8n_chat_histories_whatsapp h
          WHERE RIGHT(REPLACE(REPLACE(h.session_id, '@s.whatsapp.net', ''), '+', ''), 8) = bl.phone_8
          AND h.message->>'type' = 'human' AND h.created_at > bl.last_followup_at)
      ELSE FALSE END AS lead_responded
    FROM board_leads bl
  )
  SELECT COALESCE(json_agg(row_to_json(r)), '[]'::JSON) INTO v_result
  FROM (
    SELECT ls.lead_id, ls.lead_name, ls.whatsapp, ls.column_name, ls.session_id,
      ls.last_message_at, ls.next_followup, ls.lead_responded, ls.completed_followups
    FROM lead_status ls
    WHERE ls.next_followup IS NOT NULL
    AND (
      ((ls.done_count = 0 OR ls.lead_responded = TRUE)
       AND ls.last_message_at < NOW() - (p_espera_respondeu || ' hours')::INTERVAL)
      OR
      (ls.done_count >= 1 AND ls.lead_responded = FALSE
       AND ls.last_followup_at < NOW() - (p_espera_nao_respondeu || ' hours')::INTERVAL)
    )
  ) r;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_followup_done(p_lead_id UUID, p_followup_number INT)
 RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
AS $function$
BEGIN
  UPDATE leads
  SET completed_followups = CASE
    WHEN NOT COALESCE(completed_followups, '[]'::jsonb) @> ('[' || p_followup_number || ']')::jsonb
    THEN COALESCE(completed_followups, '[]'::jsonb) || to_jsonb(p_followup_number)
    ELSE completed_followups
  END,
  last_followup_at = NOW()
  WHERE id = p_lead_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_followup_attempted(p_lead_id UUID, p_followup_number INT)
 RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
AS $function$
BEGIN
  UPDATE leads
  SET followup_attempts = CASE
    WHEN NOT COALESCE(followup_attempts, '{}'::jsonb) ? p_followup_number::text
    THEN COALESCE(followup_attempts, '{}'::jsonb) || jsonb_build_object(p_followup_number::text, NOW())
    ELSE followup_attempts
  END
  WHERE id = p_lead_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_ai_paused(p_session_id text)
 RETURNS boolean LANGUAGE sql
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM chat_control
    WHERE session_id = p_session_id
    AND (ai_paused = true OR typing_until > NOW())
  );
$function$;

CREATE OR REPLACE FUNCTION public.move_lead_to_board_column(p_lead_id uuid, p_board_name text, p_column_name text, p_moved_by text DEFAULT 'n8n')
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_board_id UUID; v_column_id UUID;
  v_board_created BOOLEAN := false; v_column_created BOOLEAN := false;
  v_max_position INTEGER;
BEGIN
  SELECT id INTO v_board_id FROM kanban_boards WHERE LOWER(name) = LOWER(p_board_name);
  IF v_board_id IS NULL THEN
    INSERT INTO kanban_boards (name, description) VALUES (p_board_name, 'Criado automaticamente via ' || p_moved_by) RETURNING id INTO v_board_id;
    v_board_created := true;
  END IF;
  SELECT id INTO v_column_id FROM kanban_columns WHERE board_id = v_board_id AND LOWER(name) = LOWER(p_column_name);
  IF v_column_id IS NULL THEN
    SELECT COALESCE(MAX(position), -1) + 1 INTO v_max_position FROM kanban_columns WHERE board_id = v_board_id;
    INSERT INTO kanban_columns (board_id, name, position) VALUES (v_board_id, p_column_name, v_max_position) RETURNING id INTO v_column_id;
    v_column_created := true;
  END IF;
  DELETE FROM kanban_lead_positions WHERE lead_id = p_lead_id AND column_id IN (SELECT id FROM kanban_columns WHERE board_id = v_board_id);
  SELECT COALESCE(MAX(position), -1) + 1 INTO v_max_position FROM kanban_lead_positions WHERE column_id = v_column_id;
  INSERT INTO kanban_lead_positions (column_id, lead_id, position, moved_by, moved_at) VALUES (v_column_id, p_lead_id, v_max_position, p_moved_by, now());
  RETURN json_build_object('success', true, 'lead_id', p_lead_id, 'board_name', p_board_name, 'board_id', v_board_id, 'column_name', p_column_name, 'column_id', v_column_id, 'board_created', v_board_created, 'column_created', v_column_created);
END;
$function$;

CREATE OR REPLACE FUNCTION public.stop_workflow(p_workflow_name text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.workflow_control SET is_running = false, stopped_at = now() WHERE workflow_name = p_workflow_name;
  RETURN json_build_object('stopped', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.try_start_workflow(p_workflow_name text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_was_running boolean;
BEGIN
  UPDATE public.workflow_control SET is_running = true, started_at = now()
  WHERE workflow_name = p_workflow_name AND is_running = false
  RETURNING false INTO v_was_running;
  IF v_was_running IS NULL THEN RETURN json_build_object('started', false);
  ELSE RETURN json_build_object('started', true); END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.count_chat_messages(p_session_id text)
 RETURNS TABLE(total integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT count(*)::integer as total
  FROM public.n8n_chat_histories_whatsapp
  WHERE session_id = p_session_id;
$function$;

CREATE OR REPLACE FUNCTION public.get_messages_for_summary(
  p_session_id text,
  p_total_messages integer,
  p_last_total integer
)
 RETURNS TABLE(messages_text text, total integer) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_window_size integer := 20;
  v_offset integer;
  v_limit integer;
  v_result text := '';
  v_role text;
  rec record;
BEGIN
  v_offset := GREATEST(0, p_last_total - v_window_size);
  v_limit := LEAST(20, GREATEST(0, p_total_messages - v_window_size - v_offset));
  FOR rec IN
    SELECT m.message->>'type' as msg_type, m.message->>'content' as msg_content
    FROM n8n_chat_histories_whatsapp m
    WHERE m.session_id = p_session_id
    ORDER BY m.id ASC
    OFFSET v_offset
    LIMIT v_limit
  LOOP
    IF rec.msg_type = 'human' THEN v_role := 'Lead';
    ELSE v_role := 'Agente';
    END IF;
    IF v_result != '' THEN v_result := v_result || E'\n'; END IF;
    v_result := v_result || v_role || ': ' || COALESCE(rec.msg_content, '');
  END LOOP;
  RETURN QUERY SELECT v_result, p_total_messages;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_last_messages(p_session_id text, p_limit int DEFAULT 10)
 RETURNS TABLE(message jsonb) LANGUAGE sql
AS $function$
  SELECT message FROM (
    (SELECT id, message FROM n8n_chat_histories_whatsapp
     WHERE session_id = p_session_id AND message->>'type' = 'human'
     ORDER BY id DESC LIMIT p_limit)
    UNION ALL
    (SELECT id, message FROM n8n_chat_histories_whatsapp
     WHERE session_id = p_session_id AND message->>'type' = 'ai'
     ORDER BY id DESC LIMIT p_limit)
  ) combined
  ORDER BY id ASC;
$function$;`;

  if (option === 3) {
    sql += `

CREATE OR REPLACE FUNCTION public.get_insta_infos(p_lead_id uuid)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_biography text; v_followers_count integer; v_following_count integer; v_posts_count integer;
BEGIN
  SELECT biography, followers_count, following_count, posts_count
  INTO v_biography, v_followers_count, v_following_count, v_posts_count
  FROM public.instagram WHERE lead_id = p_lead_id;
  RETURN json_build_object('lead_id', p_lead_id, 'biography', COALESCE(v_biography, ''),
    'followers_count', COALESCE(v_followers_count, 0), 'following_count', COALESCE(v_following_count, 0),
    'posts_count', COALESCE(v_posts_count, 0));
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_lead_data(p_lead_id uuid)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_lead leads%ROWTYPE;
  v_ig instagram%ROWTYPE;
  v_ig_found boolean := false;
BEGIN
  SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RETURN json_build_object('data', null, 'error', 'Lead nao encontrado');
  END IF;
  SELECT * INTO v_ig FROM instagram WHERE lead_id = p_lead_id;
  IF FOUND THEN v_ig_found := true; END IF;
  RETURN json_build_object(
    'data', json_build_object(
      'id', v_lead.id, 'name', v_lead.name, 'whatsapp', v_lead.whatsapp,
      'country_code', v_lead.country_code, 'email', v_lead.email,
      'instagram', CASE WHEN v_ig_found THEN v_ig.username ELSE v_lead.instagram END,
      'instagram_full', CASE WHEN v_ig_found THEN json_build_object(
        'username', v_ig.username, 'full_name', v_ig.full_name, 'biography', v_ig.biography,
        'followers_count', v_ig.followers_count, 'following_count', v_ig.following_count,
        'posts_count', v_ig.posts_count, 'is_verified', v_ig.is_verified,
        'profile_pic_url', v_ig.profile_pic_url
      ) ELSE null END,
      'utm_source', v_lead.utm_source, 'utm_medium', v_lead.utm_medium,
      'utm_campaign', v_lead.utm_campaign, 'utm_content', v_lead.utm_content,
      'utm_term', v_lead.utm_term, 'created_at', v_lead.created_at
    ),
    'error', null
  );
END;
$function$;`;
  }

  return sql;
}

export function getTriggerSql(): string {
  return `
CREATE OR REPLACE FUNCTION public.link_lead_session_id()
 RETURNS trigger LANGUAGE plpgsql
AS $function$
DECLARE phone_digits TEXT;
BEGIN
  phone_digits := RIGHT(SPLIT_PART(NEW.session_id, '@', 1), 8);
  UPDATE leads SET session_id = NEW.session_id
  WHERE session_id IS NULL AND RIGHT(REPLACE(whatsapp, '+', ''), 8) = phone_digits;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_link_lead_session_id ON n8n_chat_histories_whatsapp;
CREATE TRIGGER trg_link_lead_session_id
  AFTER INSERT ON n8n_chat_histories_whatsapp
  FOR EACH ROW EXECUTE FUNCTION link_lead_session_id();`;
}

function rlsBlock(table: string): string {
  return `
ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access" ON ${table};
CREATE POLICY "service_role_full_access" ON ${table} FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');`;
}

export function getRlsSql(option: 1 | 2 | 3): string {
  const tables = [
    "leads",
    "n8n_chat_histories_whatsapp",
    "kanban_boards",
    "kanban_columns",
    "kanban_lead_positions",
    "chat_control",
    "conversation_summaries",
    "workflow_control",
    "message_buffer",
  ];

  if (option === 3) {
    tables.push("instagram", "personalizations");
  }

  return tables.map(rlsBlock).join("\n");
}

export function getStorageSql(): string {
  return `INSERT INTO storage.buckets (id, name, public) VALUES ('instagram_avatars', 'instagram_avatars', true) ON CONFLICT (id) DO NOTHING;`;
}
