
-- PDFs
CREATE TABLE public.pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  page_count INT DEFAULT 0,
  last_page INT DEFAULT 1,
  last_zoom REAL DEFAULT 1.0,
  scroll_position REAL DEFAULT 0,
  is_favorite BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  file_size BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_opened_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdfs TO authenticated;
GRANT ALL ON public.pdfs TO service_role;
ALTER TABLE public.pdfs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdfs_own" ON public.pdfs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX pdfs_user_idx ON public.pdfs(user_id, last_opened_at DESC);

-- Highlights
CREATE TABLE public.highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_id UUID NOT NULL REFERENCES public.pdfs(id) ON DELETE CASCADE,
  page INT NOT NULL,
  color TEXT NOT NULL DEFAULT 'yellow',
  style TEXT NOT NULL DEFAULT 'highlight', -- highlight | underline | strikethrough
  selected_text TEXT,
  note TEXT,
  rects JSONB NOT NULL, -- array of {x,y,width,height} relative to page
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.highlights TO authenticated;
GRANT ALL ON public.highlights TO service_role;
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "highlights_own" ON public.highlights FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX highlights_pdf_idx ON public.highlights(pdf_id, page);

-- Drawings (one row per page per pdf, paths as JSON)
CREATE TABLE public.drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_id UUID NOT NULL REFERENCES public.pdfs(id) ON DELETE CASCADE,
  page INT NOT NULL,
  strokes JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pdf_id, page)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drawings TO authenticated;
GRANT ALL ON public.drawings TO service_role;
ALTER TABLE public.drawings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drawings_own" ON public.drawings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Sticky notes
CREATE TABLE public.sticky_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_id UUID NOT NULL REFERENCES public.pdfs(id) ON DELETE CASCADE,
  page INT NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'amber',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sticky_notes TO authenticated;
GRANT ALL ON public.sticky_notes TO service_role;
ALTER TABLE public.sticky_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sticky_own" ON public.sticky_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Page notes (one row per page)
CREATE TABLE public.page_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_id UUID NOT NULL REFERENCES public.pdfs(id) ON DELETE CASCADE,
  page INT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pdf_id, page)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_notes TO authenticated;
GRANT ALL ON public.page_notes TO service_role;
ALTER TABLE public.page_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pagenotes_own" ON public.page_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Bookmarks
CREATE TABLE public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_id UUID NOT NULL REFERENCES public.pdfs(id) ON DELETE CASCADE,
  page INT NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookmarks TO authenticated;
GRANT ALL ON public.bookmarks TO service_role;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookmarks_own" ON public.bookmarks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Chat messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_id UUID NOT NULL REFERENCES public.pdfs(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  page_context INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_own" ON public.chat_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX chat_pdf_idx ON public.chat_messages(pdf_id, created_at);

-- Study sessions
CREATE TABLE public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_id UUID REFERENCES public.pdfs(id) ON DELETE SET NULL,
  mode TEXT NOT NULL DEFAULT 'focus',
  duration_seconds INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT ALL ON public.study_sessions TO service_role;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_own" ON public.study_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
