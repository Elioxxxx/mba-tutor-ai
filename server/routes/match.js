import { Router } from 'express';
import { callMiniMaxJSON } from '../services/minimax.js';
import { supabase } from '../services/supabase.js';
import { rankTeachersBySimilarity } from '../services/similarity.js';

const router = Router();

const MATCH_SYSTEM_PROMPT = `你是一位电子科技大学经管学院 MBA 导师匹配专家。你需要根据学生的背景画像，从候选导师中筛选最匹配的导师并排名。

匹配时请综合考虑以下因素（按重要性排序）：
1. 【选题方向匹配】导师的选题方向和论文题目是否与学生的行业/痛点契合
2. 【研究关键词匹配】导师的关键词是否覆盖学生的核心议题
3. 【行业场景匹配】导师的行业标签是否涵盖学生所在行业

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
      "analysis": "评估该导师与学生的契合度，指出匹配的优势或不匹配的风险点（1-2句话）"
    }
  ]
}

注意：
1. 所有文本字段内绝对不可包含未转义的双引号和换行符
2. preferredAnalysis 中每位导师的 analysis 字段限制在50字以内
3. matchReason 字段限制在80字以内`;

/**
 * POST /api/match
 * 基于学生画像与导师标签进行匹配
 * 
 * 新架构（RAG 两段式）：
 *   第一阶段：TF-IDF 文本相似度粗排（毫秒级，0 API 调用）
 *   第二阶段：仅将 Top 15 候选人 + 心仪导师发给大模型精排
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

    // 保存 preferred_tutors 到 notes，同时去导师表增加人气热度值 (popularity_count)
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

      // 为这些导师的人气值 + 1
      for (const tutorName of preferredTutors) {
        const { data: tutor } = await supabase
          .from('teacher_tags')
          .select('id, popularity_count')
          .eq('name', tutorName)
          .single();
        
        if (tutor) {
          await supabase
            .from('teacher_tags')
            .update({ popularity_count: (tutor.popularity_count || 0) + 1 })
            .eq('id', tutor.id);
        }
      }
    }

    // ============================================================
    // 第一阶段：TF-IDF 粗排（纯数学，0 API 调用，毫秒级完成）
    // ============================================================
    console.log('[Match] Phase 1: TF-IDF coarse ranking...');
    const startTime = Date.now();

    // 获取所有导师标签（仅取有论文题目的）
    const { data: allTeachers, error: teacherError } = await supabase
      .from('teacher_tags')
      .select('*')
      .not('thesis_titles', 'eq', '{}');

    if (teacherError || !allTeachers?.length) {
      return res.status(500).json({ error: '导师数据未加载' });
    }

    // 用 TF-IDF 余弦相似度从全部导师中筛选 Top 15
    const topCandidates = rankTeachersBySimilarity(submission, allTeachers, 15);
    const candidateNames = new Set(topCandidates.map(c => c.name));

    // 强制植入心仪导师（如果他们不在 Top 15 中）
    const extraTeachers = [];
    for (const tutorName of preferredTutors) {
      if (!candidateNames.has(tutorName)) {
        const found = allTeachers.find(t => t.name === tutorName);
        if (found) {
          extraTeachers.push(found);
          candidateNames.add(tutorName);
        }
      }
    }

    // 合并最终候选人列表
    const finalCandidates = [
      ...topCandidates.map(c => c.teacher),
      ...extraTeachers,
    ];

    const phase1Time = Date.now() - startTime;
    console.log(`[Match] Phase 1 complete: ${allTeachers.length} teachers → ${finalCandidates.length} candidates in ${phase1Time}ms`);

    // ============================================================
    // 第二阶段：大模型精排（仅处理 15~20 人，而非全部 100+）
    // ============================================================
    console.log('[Match] Phase 2: LLM fine ranking...');

    // 构建极致压缩版候选导师信息
    const teacherSummary = finalCandidates.map(t => {
      const titles = (t.thesis_titles || []).slice(0, 3);
      const dirs = (t.topic_directions || []).slice(0, 3);
      const kws = (t.research_keywords || []).slice(0, 5);
      const inds = (t.industry_tags || []).slice(0, 3);

      return {
        n: t.name,
        d: t.discipline || '',
        td: dirs.join('/'),
        tt: titles.join('/'),
        kw: kws.join('/'),
        ind: inds.join('/'),
      };
    });

    // 组装 Prompt
    const parts = [
      '【学生画像】',
      JSON.stringify(submission.ai_summary),
      '',
      '【学生原始诉求】',
      (submission.requirements || '').substring(0, 800),
      ''
    ];

    if (submission.notes) {
      parts.push('【学生补充备注】');
      parts.push(submission.notes.substring(0, 600));
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
    parts.push(`【候选导师（经系统初筛，共 ${teacherSummary.length} 位）】`);
    parts.push(JSON.stringify(teacherSummary));

    const userMessage = parts.join('\n');
    console.log(`[Match] Prompt length: ${userMessage.length} chars (was ~${allTeachers.length * 120} before RAG)`);

    // 调用 MiniMax 进行匹配
    const matchResult = await callMiniMaxJSON(
      MATCH_SYSTEM_PROMPT, 
      userMessage,
      { temperature: 0.2, maxTokens: 4096 }
    );

    const totalTime = Date.now() - startTime;
    console.log(`[Match] Phase 2 complete. Total time: ${totalTime}ms`);

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
