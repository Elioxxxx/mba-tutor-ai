import { Router } from 'express';
import { callMiniMaxJSON } from '../services/minimax.js';
import { supabase } from '../services/supabase.js';

const router = Router();

const MATCH_SYSTEM_PROMPT = `你是一位电子科技大学经管学院 MBA 导师匹配专家。你需要根据学生的背景画像，从导师标签库中筛选最匹配的导师并排名。

匹配时请综合考虑以下因素（按重要性排序）：
1. 【选题方向匹配】导师的 topicDirections 和 thesisTitles 是否与学生的行业/痛点契合
2. 【研究关键词匹配】导师的 researchKeywords 是否覆盖学生的核心议题
3. 【行业场景匹配】导师的 industryTags 是否涵盖学生所在行业
4. 【方法论适配】导师的 methodologyTags 是否适合学生的情况
5. 【导师特质匹配】导师的 mentorTraits 是否匹配学生的期望

请严格按以下 JSON 格式输出，推荐 5 位最匹配的导师。
如果学生指明了【心仪导师名单】，请你必须在 preferredAnalysis 数组中，为每一位心仪导师输出针对性的匹配评估（无论他们是否在排名前5里，都必须单独在这里评估）。
{
  "matches": [
    {
      "rank": 1,
      "teacherName": "导师姓名",
      "matchScore": 92,
      "matchReason": "匹配理由（2-3句话，具体说明为什么推荐）",
      "suggestedTopics": ["建议论文方向1", "建议论文方向2"],
      "keyMatchPoints": ["匹配亮点1", "匹配亮点2"]
    }
  ],
  "overallAnalysis": "基于学生背景的整体选题建议（2-3句话）",
  "preferredAnalysis": [
    {
      "teacherName": "心仪导师姓名",
      "matchDegree": "高/中/低",
      "analysis": "评估该导师与学生的契合度，指出匹配的优势或不匹配的风险点"
    }
  ]
}`;

/**
 * POST /api/match
 * 基于学生画像与导师标签进行匹配
 */
router.post('/', async (req, res) => {
  try {
    const { submissionId, preferredTutors = [] } = req.body;

    if (!submissionId) {
      return res.status(400).json({ error: '缺少 submissionId' });
    }

    // 获取学生提交和摘要
    const { data: submission, error: fetchError } = await supabase
      .from('student_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      return res.status(404).json({ error: '未找到提交记录' });
    }

    if (!submission.ai_summary) {
      return res.status(400).json({ error: '请先完成 AI 分析步骤' });
    }

    // 保存 preferred_tutors 到 notes 或者专门的逻辑里，这里我们直接将其塞入 userMessage
    if (preferredTutors.length > 0) {
      let notesUpdate = '';
      if (submission.notes) {
        notesUpdate = submission.notes + '\n\n【学生指定的候选心仪导师】：' + preferredTutors.join(', ');
      } else {
        notesUpdate = '【学生指定的候选心仪导师】：' + preferredTutors.join(', ');
      }
      
      await supabase
        .from('student_submissions')
        .update({ notes: notesUpdate })
        .eq('id', submissionId);
    }

    // 获取所有导师标签（仅取有论文题目的，排除无题目数据的老师）
    const { data: teachers, error: teacherError } = await supabase
      .from('teacher_tags')
      .select('*')
      .not('thesis_titles', 'eq', '{}');

    if (teacherError || !teachers?.length) {
      return res.status(500).json({ error: '导师数据未加载' });
    }

    // 构建导师信息（精简版，避免 token 过多）
    const teacherSummary = teachers.map(t => ({
      name: t.name,
      discipline: t.discipline,
      academicRank: t.academic_rank,
      topicDirections: t.topic_directions,
      thesisTitles: t.thesis_titles,
      researchKeywords: t.research_keywords,
      industryTags: t.industry_tags,
      methodologyTags: t.methodology_tags,
      mentorTraits: t.mentor_traits,
    }));

    // 组装 Prompt
    const parts = [
      '【学生画像】',
      JSON.stringify(submission.ai_summary, null, 2),
      '',
      '【学生原始诉求】',
      submission.requirements,
      ''
    ];

    if (submission.notes) {
      parts.push('【学生补充备注】');
      parts.push(submission.notes);
      parts.push('');
    }

    if (preferredTutors.length > 0) {
      parts.push('【注意：学生特别关注以下几位心仪导师】');
      parts.push(preferredTutors.join(', '));
      parts.push('请在返回结果的 preferredAnalysis 字段中，为上述每一位导师输出针对性的匹配度评估，不管他们是否被选入最佳推荐名单！');
      parts.push('');
    }

    parts.push('---');
    parts.push('');
    parts.push(`【导师标签库（共 ${teacherSummary.length} 位导师）】`);
    parts.push(JSON.stringify(teacherSummary, null, 2));

    const userMessage = parts.join('\n');

    // 调用 MiniMax 进行匹配
    const matchResult = await callMiniMaxJSON(
      MATCH_SYSTEM_PROMPT, 
      userMessage,
      { temperature: 0.2, maxTokens: 4096 }
    );

    // 存储匹配结果
    if (matchResult.matches) {
      for (const match of matchResult.matches) {
        await supabase.from('match_results').insert({
          submission_id: submissionId,
          teacher_name: match.teacherName,
          match_score: match.matchScore,
          match_reason: match.matchReason,
          rank: match.rank,
        });
      }

      // 更新提交状态
      await supabase
        .from('student_submissions')
        .update({ status: 'matched' })
        .eq('id', submissionId);
    }

    res.json({
      success: true,
      result: matchResult,
    });

  } catch (err) {
    console.error('Match error:', err);
    res.status(500).json({ error: err.message });
  }
});

export { router as matchRouter };
