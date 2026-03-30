import { Router } from 'express';
import { callMiniMaxJSON } from '../services/minimax.js';
import { supabase } from '../services/supabase.js';

const router = Router();

const SUMMARY_SYSTEM_PROMPT = `你是一位资深的 MBA 学术顾问。你的任务是分析学生提交的简历和企业介绍材料，生成一份结构化的学术背景摘要。

请严格按以下 JSON 格式输出：
{
  "studentProfile": {
    "name": "姓名（如能从简历中提取）",
    "industry": "所在行业",
    "currentRole": "当前职务",
    "yearsOfExperience": "工作年限（数字或估算）",
    "companyStage": "企业阶段（初创期/成长期/成熟期/体制内）",
    "companyDescription": "企业简述（1-2句话）",
    "coreBusinessPainPoints": "核心业务痛点（基于材料分析）",
    "managementChallenges": "管理挑战（从材料推断）"
  },
  "suggestedKeywords": ["关键词1", "关键词2", "...（5-10个与论文选题相关的关键词）"],
  "missingInfo": [
    "缺少的信息1（例如：未提及管理年限）",
    "缺少的信息2"
  ],
  "initialDirection": "基于以上信息，建议的论文大致方向（1-2句话）"
}

注意：
- 如果某项信息在材料中找不到，填写 "未提及" 而不是编造
- missingInfo 要列出对匹配导师有帮助但材料中缺失的关键信息
- suggestedKeywords 应该是与商科论文选题相关的关键词`;

/**
 * POST /api/analyze
 * 接收 submissionId，调用 MiniMax 生成学生画像摘要
 */
router.post('/', async (req, res) => {
  try {
    const { submissionId } = req.body;
    
    if (!submissionId) {
      return res.status(400).json({ error: '缺少 submissionId' });
    }

    // 从数据库获取提交数据
    const { data: submission, error: fetchError } = await supabase
      .from('student_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      return res.status(404).json({ error: '未找到提交记录' });
    }

    // 组装给 LLM 的用户消息
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

    // 调用 MiniMax
    const summary = await callMiniMaxJSON(SUMMARY_SYSTEM_PROMPT, userMessage, {
      temperature: 0.3,
      maxTokens: 4096,
    });

    // 更新数据库
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
 * 接收额外补充信息并重新由于生成摘要
 */
router.post('/supplement', async (req, res) => {
  try {
    const { submissionId, supplementaryInfo } = req.body;
    
    if (!submissionId || !supplementaryInfo) {
      return res.status(400).json({ error: '缺少必需的参数' });
    }

    // 获取并追加补充信息
    const { data: submission, error: fetchError } = await supabase
      .from('student_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      return res.status(404).json({ error: '未找到提交记录' });
    }

    // 更新 notes：将原本的备注与新补充的信息合并
    const newNotes = submission.notes 
      ? `${submission.notes}\n\n【用户在摘要页的后续补充】：\n${supplementaryInfo}`
      : `【用户在摘要页补充信息】：\n${supplementaryInfo}`;

    await supabase
      .from('student_submissions')
      .update({ notes: newNotes })
      .eq('id', submissionId);

    // 重新组装用户消息
    const parts = [];
    if (submission.extracted_text?.resume) {
      parts.push(`【个人简历内容】\n${submission.extracted_text.resume}`);
    }
    if (submission.extracted_text?.company) {
      parts.push(`【企业介绍内容】\n${submission.extracted_text.company}`);
    }
    parts.push(`【学生补充备注】\n${newNotes}`);
    parts.push(`【学生找导师的诉求】\n${submission.requirements}`);

    const userMessage = parts.join('\n\n---\n\n');

    // 重新调用 MiniMax
    const summary = await callMiniMaxJSON(SUMMARY_SYSTEM_PROMPT, userMessage, {
      temperature: 0.3,
      maxTokens: 4096,
    });

    // 存入最新的 ai_summary
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
 * 学生确认摘要完整，标记为 confirmed
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
