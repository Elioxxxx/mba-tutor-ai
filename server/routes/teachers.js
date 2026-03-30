import { Router } from 'express';
import { supabase } from '../services/supabase.js';

const router = Router();

/**
 * GET /api/teachers
 * 获取全部导师的简要信息供前端下拉框使用
 */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('teacher_tags')
      .select('id, name, discipline')
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
