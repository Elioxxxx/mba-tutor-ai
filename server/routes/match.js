import { Router } from 'express';
import { callMiniMaxJSON } from '../services/minimax.js';
import { supabase } from '../services/supabase.js';
import { rankTeachersBySimilarity } from '../services/similarity.js';

const router = Router();

// 极致精简的系统提示词（减少 token 开销）
const MATCH_SYSTEM_PROMPT = `你是MBA导师匹配专家。根据学生背景从候选导师中选5位最匹配的推荐。
匹配优先级：1.选题方向 2.研究关键词 3.行业场景。
如有心仪导师名单，必须在preferredAnalysis中逐一评估。
严格JSON输出：
{"matches":[{"rank":1,"teacherName":"姓名","matchScore":92,"matchReason":"理由(50字内)","suggestedTopics":["方向1"],"keyMatchPoints":["亮点1"]}],"overallAnalysis":"整体建议(30字)","preferredAnalysis":[{"teacherName":"姓名","matchDegree":"高/中/低","analysis":"评估(30字内)"}]}
规则：1.文本内不含未转义双引号 2.matchReason限50字 3.preferredAnalysis每项analysis限30字`;

/**
 * POST /api/match
 * 基于学生画像与导师标签进行匹配
 * 
 * 优化架构（RAG 两段式）：
 *   第一阶段：TF-IDF 文本相似度粗排（毫秒级，0 API 调用）
 *   第二阶段：仅将 Top 8 候选人 + 心仪导师发给大模型精排
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

    // 保存 preferred_tutors 到 notes，同时去导师表增加人气热度值
    if (preferredTutors.length > 0) {
      let notesUpdate = '';
      if (submission.notes) {
        notesUpdate = submission.notes + '\n\n【学生指定的候选心仪导师】：' + preferredTutors.join(', ');
      } else {
        notesUpdate = '【学生指定的候选心仪导师】：' + preferredTutors.join(', ');
      }
      
      // 并行执行：更新 notes + 批量增加人气值
      const updatePromises = [
        supabase
          .from('student_submissions')
          .update({ notes: notesUpdate })
          .eq('id', submissionId),
      ];
      
      for (const tutorName of preferredTutors) {
        updatePromises.push(
          supabase
            .from('teacher_tags')
            .select('id, popularity_count')
            .eq('name', tutorName)
            .single()
            .then(({ data: tutor }) => {
              if (tutor) {
                return supabase
                  .from('teacher_tags')
                  .update({ popularity_count: (tutor.popularity_count || 0) + 1 })
                  .eq('id', tutor.id);
              }
            })
        );
      }
      
      await Promise.all(updatePromises);
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

    // 用 TF-IDF 余弦相似度从全部导师中筛选 Top 8（从15减到8，大幅减少LLM token）
    const TOP_K = 8;
    const topCandidates = rankTeachersBySimilarity(submission, allTeachers, TOP_K);
    const candidateNames = new Set(topCandidates.map(c => c.name));

    // 强制植入心仪导师（如果他们不在 Top K 中）
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
    // 第二阶段：大模型精排（仅处理 8~13 人）
    // ============================================================
    console.log('[Match] Phase 2: LLM fine ranking...');

    // 极致压缩的候选导师信息（每人只保留最核心的数据）
    const teacherSummary = finalCandidates.map(t => {
      const dirs = (t.topic_directions || []).slice(0, 2);
      const titles = (t.thesis_titles || []).slice(0, 2);
      const kws = (t.research_keywords || []).slice(0, 3);
      return `${t.name}|${dirs.join('/')}|${titles.join('/')}|${kws.join('/')}`;
    });

    // 精简学生画像 — 只保留匹配相关信息
    const summary = submission.ai_summary || {};
    const studentProfile = summary.studentProfile || summary;
    const compactStudent = {
      ind: studentProfile.industry || '',
      role: studentProfile.currentRole || '',
      pain: (studentProfile.coreBusinessPainPoints || '').substring(0, 150),
      topic: (summary.initialDirection || studentProfile.topicPreference || '').substring(0, 100),
      kw: (summary.suggestedKeywords || studentProfile.keywords || []).slice(0, 5).join('/'),
    };

    // 组装超精简 Prompt
    const parts = [
      `学生:${JSON.stringify(compactStudent)}`,
    ];

    if (preferredTutors.length > 0) {
      parts.push(`心仪:${preferredTutors.join(',')}`);
    }

    parts.push(`候选(${teacherSummary.length}人,格式:姓名|方向|论文|关键词):`);
    parts.push(teacherSummary.join('\n'));

    const userMessage = parts.join('\n');
    console.log(`[Match] Prompt length: ${userMessage.length} chars (was ~${allTeachers.length * 120} before optimization)`);

    // 调用 MiniMax 进行匹配（带 60 秒超时保护）
    const llmTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI 推理超时（超过60秒），请稍后重试')), 60000)
    );
    
    const matchResult = await Promise.race([
      callMiniMaxJSON(
        MATCH_SYSTEM_PROMPT, 
        userMessage,
        { temperature: 0.2, maxTokens: 2048 }
      ),
      llmTimeout,
    ]);

    const totalTime = Date.now() - startTime;
    console.log(`[Match] Phase 2 complete. Total time: ${totalTime}ms`);

    // 存储匹配结果（并行插入）
    if (matchResult.matches && Array.isArray(matchResult.matches)) {
      const insertPromises = matchResult.matches.map(match =>
        supabase.from('match_results').insert({
          submission_id: submissionId,
          teacher_name: match.teacherName,
          match_score: match.matchScore,
          match_reason: match.matchReason,
          rank: match.rank,
        })
      );
      
      // 并行：插入结果 + 更新状态
      insertPromises.push(
        supabase
          .from('student_submissions')
          .update({ status: 'matched' })
          .eq('id', submissionId)
      );
      
      await Promise.all(insertPromises);
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
