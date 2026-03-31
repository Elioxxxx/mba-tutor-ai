import { Router } from 'express';
import { supabase } from '../services/supabase.js';

const router = Router();

/**
 * GET /api/teachers/top
 * 获取心仪人气值最高的前10名导师
 */
router.get('/top', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('teacher_tags')
      .select('id, name, discipline, popularity_count')
      .gt('popularity_count', 0)
      .not('thesis_titles', 'eq', '{}')
      .order('popularity_count', { ascending: false })
      .limit(10);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, topTeachers: data });
  } catch (err) {
    console.error('Fetch top teachers error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/teachers
 * 获取全部导师的简要信息供前端下拉框使用
 */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('teacher_tags')
      .select('id, name, discipline')
      .not('thesis_titles', 'eq', '{}')
      .order('name');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      success: true,
      teachers: data,
    });
  } catch (err) {
    console.error('Fetch teachers error:', err);
    res.status(500).json({ error: err.message });
  }
});

export { router as teachersRouter };
