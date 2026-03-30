-- ============================================
-- MBA 导师匹配系统 — Supabase 数据库表结构
-- 在 Supabase Dashboard > SQL Editor 中执行
-- ============================================

-- 1. 学生提交记录
CREATE TABLE IF NOT EXISTS student_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_url TEXT,
  company_url TEXT,
  notes TEXT DEFAULT '',
  requirements TEXT NOT NULL,
  extracted_text JSONB DEFAULT '{}',
  ai_summary JSONB,
  student_tags JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'summarized', 'confirmed', 'matched')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 导师标签
CREATE TABLE IF NOT EXISTS teacher_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  discipline TEXT,
  academic_rank TEXT,
  topic_directions TEXT[] DEFAULT '{}',
  thesis_titles TEXT[] DEFAULT '{}',
  research_keywords TEXT[] DEFAULT '{}',
  industry_tags TEXT[] DEFAULT '{}',
  methodology_tags TEXT[] DEFAULT '{}',
  mentor_traits TEXT[] DEFAULT '{}',
  photo TEXT,
  email TEXT,
  raw_profile JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 匹配结果
CREATE TABLE IF NOT EXISTS match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES student_submissions(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  match_score NUMERIC,
  match_reason TEXT,
  rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 创建 Storage Bucket（用于存储上传的 PDF）
-- 注意：Storage Bucket 需要在 Supabase Dashboard > Storage 中手动创建
-- Bucket 名称: submissions
-- 设为 public 或配置 RLS

-- 5. 启用 RLS（可选，开发阶段先关闭）
ALTER TABLE student_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

-- 开发阶段：允许 anon 用户完全访问
CREATE POLICY "Allow all for anon" ON student_submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON teacher_tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON match_results FOR ALL USING (true) WITH CHECK (true);
