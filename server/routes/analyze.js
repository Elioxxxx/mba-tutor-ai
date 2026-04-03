import { Router } from 'express';
import { callMiniMaxJSON } from '../services/minimax.js';
import { supabase } from '../services/supabase.js';

const router = Router();

// ==========================================
// 极端压缩输出并双轨并发的系统提示词
// ==========================================

// 提示词 A: 专注于个人背景与经历 (输出占比小，生成极快)
const PROMPT_PROFILE = `你是资深MBA专家。分析以下学生的简历、企业介绍等材料。
提取基础背景并进行个人简评。
严格输出JSON：
{
  "studentProfile": {
    "name": "姓名(如能提取)",
    "industry": "行业(10字以内)",
    "currentRole": "主干职务(10字以内)",
    "yearsOfExperience": "工作年限估算(如: 8年)",
    "companyStage": "企业阶段(初创/成长/成熟/体制内)",
    "companyDescription": "企业主营(20字以内)",
    "personalSummary": "提炼候选人职业优势和商科研究潜力(最高优先级：必须极其精炼，严禁废话，限制在50字左右的短句！)"
  },
  "missingInfo": ["未提及信息1(如:缺具体职级)", "未提及信息2"]
}
注意：输出必须是合法且单纯的JSON，不可包含任何外部文字或Markdown框。找不到填"未提及"。`;

// 提示词 B: 专注于痛点挑战与论文方向 (输出极小)
const PROMPT_DIRECTION = `你是资深MBA专家。分析以下学生的简历、企业介绍等材料。
提取核心业务痛点、管理挑战，并推荐论文方向。
严格输出JSON格式，且所有文本必须是"短语或短句"，禁止长篇大论：
{
  "studentProfile": {
    "coreBusinessPainPoints": "核心业务痛点(最多3个短语词条)",
    "managementChallenges": "核心管理挑战(最多3个短语词条)"
  },
  "suggestedKeywords": ["论文关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
  "initialDirection": "推荐论文破解大方向(一句话纯干货，20字内)"
}
注意：输出必须是合法且单纯的JSON，不可包含任何外部文字或Markdown框。找不到填"未提及"。`;

/**
 * 封装并行的分析逻辑核心函数
 * 无损阅读所有上下文，但由两个大模型拆分输出，时间缩短一半。
 * @param {string} userMessage - 拼装好的全部原始材料
 * @returns {Promise<object>} 拼装完成的综合画像
 */
async function performConcurrentAnalysis(userMessage) {
  // 同时发动两次请求，并行处理，互相不等待
  const [resProfile, resDirection] = await Promise.all([
    callMiniMaxJSON(PROMPT_PROFILE, userMessage, { temperature: 0.2, maxTokens: 800 }),
    callMiniMaxJSON(PROMPT_DIRECTION, userMessage, { temperature: 0.2, maxTokens: 800 })
  ]);

  // 将两个短而快的 JSON 结果深层合并
  const summary = {
    studentProfile: {
      ...(resProfile.studentProfile || {}),
      ...(resDirection.studentProfile || {})
    },
    missingInfo: resProfile.missingInfo || [],
    suggestedKeywords: resDirection.suggestedKeywords || [],
    initialDirection: resDirection.initialDirection || ''
  };

  return summary;
}

/**
 * POST /api/analyze
 * 首轮上传个人材料分析
 */
router.post('/', async (req, res) => {
  try {
    const { submissionId } = req.body;
    
    if (!submissionId) {
      return res.status(400).json({ error: '缺少 submissionId' });
    }

    const { data: submission, error: fetchError } = await supabase
      .from('student_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      return res.status(404).json({ error: '未找到提交记录' });
    }

    // 无损组装完整原始素材
    const parts = [];
    if (submission.extracted_text?.resume) {
      parts.push(`【个人简历内容】\n${submission.extracted_text.resume}`);
    }
    if (submission.extracted_text?.company) {
      parts.push(`【企业介绍内容】\n${submission.extracted_text.company}`);
    }
    if (submission.notes) {
      parts.push(`【学生补充备注】\n${submission.notes}`);
    }
    parts.push(`【学生找导师的诉求】\n${submission.requirements}`);

    const userMessage = parts.join('\n\n---\n\n');

    // 并发分析核心逻辑
    const summary = await performConcurrentAnalysis(userMessage);

    const { error: updateError } = await supabase
      .from('student_submissions')
      .update({ 
        ai_summary: summary,
        status: 'summarized',
      })
      .eq('id', submissionId);

    if (updateError) {
      console.error('DB update error:', updateError);
    }

    res.json({
      success: true,
      summary,
    });

  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/analyze/supplement
 * 修改/补充信息后重新分析
 */
router.post('/supplement', async (req, res) => {
  try {
    const { submissionId, supplementaryInfo } = req.body;
    
    if (!submissionId || !supplementaryInfo) {
      return res.status(400).json({ error: '缺少必需的参数' });
    }

    const { data: submission, error: fetchError } = await supabase
      .from('student_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      return res.status(404).json({ error: '未找到提交记录' });
    }

    const newNotes = submission.notes 
      ? `${submission.notes}\n\n【用户在画像页后的补充说明】：\n${supplementaryInfo}`
      : `【用户在画像页补充说明】：\n${supplementaryInfo}`;

    await supabase
      .from('student_submissions')
      .update({ notes: newNotes })
      .eq('id', submissionId);

    // 重新组合全部材料，准备复核
    const parts = [];
    if (submission.extracted_text?.resume) {
      parts.push(`【个人简历内容】\n${submission.extracted_text.resume}`);
    }
    if (submission.extracted_text?.company) {
      parts.push(`【企业介绍内容】\n${submission.extracted_text.company}`);
    }
    parts.push(`【学生补充备注及重点修改指示】\n${newNotes}`);
    parts.push(`【找导师的初始诉求】\n${submission.requirements}`);

    const userMessage = parts.join('\n\n---\n\n');

    // 重新并发分析
    const summary = await performConcurrentAnalysis(userMessage);

    await supabase
      .from('student_submissions')
      .update({ ai_summary: summary })
      .eq('id', submissionId);

    res.json({
      success: true,
      summary,
    });

  } catch (err) {
    console.error('Supplement Analyze error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/analyze/confirm
 * 确认摘要无误
 */
router.post('/confirm', async (req, res) => {
  try {
    const { submissionId } = req.body;

    const { error } = await supabase
      .from('student_submissions')
      .update({ status: 'confirmed' })
      .eq('id', submissionId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export { router as analyzeRouter };
