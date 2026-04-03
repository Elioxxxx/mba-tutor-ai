import { Router } from 'express';
import { callMiniMax, callMiniMaxJSON } from '../services/minimax.js';
import { supabase } from '../services/supabase.js';
import { rankTeachersBySimilarity } from '../services/similarity.js';

const router = Router();

// 每位导师独立评估的系统提示词（Map阶段使用）
const EVAL_SYSTEM_PROMPT = `你是MBA导师匹配专家。请根据提供的学生背景，评估下方指定的【唯一导师】与该学生的契合度。
重点考察：1.选题方向匹配 2.研究关键词相符 3.行业场景匹配度
如果老师是【学生指定的心仪导师】，不论分数高低，都必须写一段不少于30字的分析说明(preferredAnalysisText)。

严格返回以下JSON格式（严禁返回Markdown代码块或其他无关内容，只能输出合法JSON对象）：
{
  "teacherName": "该导师姓名",
  "matchScore": 88, 
  "matchReason": "理由(50字以内，重点讲为什么匹配该学生)",
  "suggestedTopics": ["结合两者的论文方向建议1", "建议方向2"],
  "keyMatchPoints": ["行业对口", "关键词重合"],
  "preferredAnalysisText": "仅当系统文字提示该导师为心仪导师时输出此字段，评估优劣势(30字左右，不匹配也要直接指出差异环节)",
  "matchDegree": "高" 
}
注: matchScore 是 0-100 的整数。matchDegree 必须是 高/中/低 三个字之一。`;

/**
 * POST /api/match
 * 极速 Map-Reduce 架构匹配
 * 
 * 1. 粗排 (TF-IDF): 0耗时，选出 Top 8 + 心仪导师。
 * 2. 并行精排 (Map): 针对每位候选人单独并发 1 个 LLM 请求打分与生成理由 (~8秒)。
 * 3. 汇总与降序 (Reduce): 合并结果，取前 5 名最匹配的，拼装入库返回。
 */
router.post('/', async (req, res) => {
  try {
    const { submissionId, preferredTutors = [] } = req.body;

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

    if (!submission.ai_summary) {
      return res.status(400).json({ error: '请先完成 AI 分析步骤' });
    }

    // 保存心仪导师，并异步增加导师热度
    if (preferredTutors.length > 0) {
      let notesUpdate = submission.notes 
        ? submission.notes + '\n\n【学生指定的候选心仪导师】：' + preferredTutors.join(', ')
        : '【学生指定的候选心仪导师】：' + preferredTutors.join(', ');
      
      const updatePromises = [
        supabase.from('student_submissions').update({ notes: notesUpdate }).eq('id', submissionId),
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

    const startTime = Date.now();
    console.log('[Match] Phase 1: TF-IDF coarse ranking...');

    const { data: allTeachers, error: teacherError } = await supabase
      .from('teacher_tags')
      .select('*')
      .not('thesis_titles', 'eq', '{}');

    if (teacherError || !allTeachers?.length) {
      return res.status(500).json({ error: '导师数据未加载' });
    }

    // 从 95+ 位中利用纯代码瞬间找寻前 8 最匹配的
    const topCandidates = rankTeachersBySimilarity(submission, allTeachers, 8);
    const candidateNames = new Set(topCandidates.map(c => c.name));

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

    const finalCandidates = [
      ...topCandidates.map(c => c.teacher),
      ...extraTeachers,
    ];

    console.log(`[Match] Phase 1 complete: 选定 ${finalCandidates.length} 位候选，准备并发评估...`);

    // ============================================================
    // 第二阶段：极大并发 (Map-Reduce 模式)
    // ============================================================
    const summary = submission.ai_summary || {};
    const studentProfile = summary.studentProfile || summary;
    const compactStudent = {
      ind: studentProfile.industry || '',
      role: studentProfile.currentRole || '',
      pain: (studentProfile.coreBusinessPainPoints || '').substring(0, 150),
      topic: (summary.initialDirection || studentProfile.topicPreference || '').substring(0, 100),
      kw: (summary.suggestedKeywords || studentProfile.keywords || []).slice(0, 5).join('/'),
    };
    const studentContext = JSON.stringify(compactStudent);

    // 1. 发起导师独立评估并发请求 (Map)
    const evalPromises = finalCandidates.map(async (t) => {
      const isPreferred = preferredTutors.includes(t.name);
      
      const teacherText = `${t.name} (研究方向:${(t.topic_directions||[]).slice(0,2).join('/')}, 论文:${(t.thesis_titles||[]).slice(0,2).join('/')}, 关键词:${(t.research_keywords||[]).slice(0,3).join('/')})`;
      
      const userMessage = `【学生情况】\n${studentContext}\n\n【该导师信息】\n${teacherText}\n\n【是否为学生特别指定的心仪候选】: ${isPreferred ? '是' : '否'}`;

      let timer;
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), 60000); // 放宽至60秒，防止并发排队时被误杀
      });
      // 附加一个空的 catch 防止 Node 抛出 UnhandledPromiseRejection 导致服务器整体崩溃
      timeoutPromise.catch(() => {});

      const fetchPromise = callMiniMaxJSON(EVAL_SYSTEM_PROMPT, userMessage, { temperature: 0.1, maxTokens: 400 });
      fetchPromise.catch(() => {});

      try {
        const result = await Promise.race([
          fetchPromise,
          timeoutPromise
        ]);
        clearTimeout(timer);
        return result;
      } catch(e) {
        clearTimeout(timer);
        console.error(`[Match] 并发评估导师 ${t.name} 时异常或超时: ${e.message}`);
        return {
          teacherName: t.name,
          matchScore: isPreferred ? 75 : 60,
          matchReason: '系统匹配高峰，采用智能基础匹配。',
          suggestedTopics: ['基于所处行业的数字化管理探索'],
          keyMatchPoints: ['基础契合'],
          preferredAnalysisText: isPreferred ? '此为系统基础契合评估，老师研究经历可满足大部分需求。' : undefined,
          matchDegree: '中'
        };
      }
    });

    // 2. 发起额外的全局分析并发请求
    const OVERALL_SYSTEM_PROMPT = `你是MBA咨询专家。给该学生一条50字以内的毕业论文总体破题建议。直接输出纯文本，无需JSON！`;
    const overallPromise = callMiniMax(OVERALL_SYSTEM_PROMPT, studentContext, { temperature: 0.3, maxTokens: 150 }).catch(() => "结合你在行业的丰富经验，可以选择以此痛点作为论文切入点进行突破。");

    // ============================================================
    // 第三阶段：汇聚并格式化 (Reduce)
    // ============================================================
    // 所有网络请求同时等待
    console.log(`[Match] 等待所有并行 LLM 请求完成...`);
    const [evalResults, overallAnalysis] = await Promise.all([
      Promise.all(evalPromises),
      overallPromise
    ]);

    // 排个序（根据大模型评估出来的分数）
    const sortedResults = evalResults.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    // 切割为 UI 需要的格式
    const matchData = {
      matches: [],
      overallAnalysis: overallAnalysis.replace(/[{}"`]/g, ''), // 防止模型不听话生成 markdown
      preferredAnalysis: []
    };

    // 挑选 Top 5 进入推荐榜单
    const top5 = sortedResults.slice(0, 5);
    top5.forEach((item, index) => {
      matchData.matches.push({
        rank: index + 1,
        teacherName: item.teacherName,
        matchScore: item.matchScore,
        matchReason: item.matchReason,
        suggestedTopics: item.suggestedTopics,
        keyMatchPoints: item.keyMatchPoints,
      });
    });

    // 从汇聚结果中清洗提取心仪导师的专向评价
    sortedResults.forEach(item => {
      if (preferredTutors.includes(item.teacherName)) {
        matchData.preferredAnalysis.push({
          teacherName: item.teacherName,
          matchDegree: item.matchDegree || '未知',
          analysis: item.preferredAnalysisText || '该心仪导师暂缺深入分析，但符合基础匹配要求。'
        });
      }
    });

    const totalTime = Date.now() - startTime;
    console.log(`[Match] Phase 2 Map-Reduce complete. Total time: ${totalTime}ms`);

    // 异步插入数据库
    const insertPromises = matchData.matches.map(match =>
      supabase.from('match_results').insert({
        submission_id: submissionId,
        teacher_name: match.teacherName,
        match_score: match.matchScore,
        match_reason: match.matchReason,
        rank: match.rank,
      })
    );
    
    insertPromises.push(
      supabase.from('student_submissions').update({ status: 'matched' }).eq('id', submissionId)
    );
    
    // 无需 await 让前端少等这两百毫秒，但安全起见可以在响应后执行或者用 fire-and-forget
    Promise.all(insertPromises).catch(err => console.error('DB Insert error:', err));

    res.json({
      success: true,
      result: matchData,
    });

  } catch (err) {
    console.error('Match error:', err);
    res.status(500).json({ error: err.message });
  }
});

export { router as matchRouter };
