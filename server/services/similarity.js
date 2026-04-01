/**
 * 轻量级中文文本相似度引擎 (TF-IDF Cosine Similarity)
 * 
 * 用途：在不依赖任何外部 Embedding API 的情况下，
 * 通过纯数学方式在毫秒内从 100+ 位导师中筛选出最匹配的 Top-K 候选人。
 * 
 * 原理：将中文文本拆分为 bigram（二元组），计算 TF-IDF 权重，
 * 然后用余弦相似度衡量两段文本的语义贴合度。
 */

/**
 * 将中文文本切分为 bigram tokens
 * 例如 "数字经济" → ["数字", "字经", "经济"]
 * 同时保留英文单词和数字
 */
function tokenize(text) {
  if (!text) return [];
  const tokens = [];

  // 提取英文单词和数字
  const engMatches = text.match(/[a-zA-Z0-9]+/g) || [];
  engMatches.forEach(w => tokens.push(w.toLowerCase()));

  // 提取中文字符并生成 bigram
  const chinese = text.replace(/[^\u4e00-\u9fff]/g, '');
  for (let i = 0; i < chinese.length - 1; i++) {
    tokens.push(chinese.substring(i, i + 2));
  }

  return tokens;
}

/**
 * 计算词频 (Term Frequency)
 */
function termFrequency(tokens) {
  const tf = {};
  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1;
  }
  // 归一化
  const maxFreq = Math.max(...Object.values(tf), 1);
  for (const key of Object.keys(tf)) {
    tf[key] /= maxFreq;
  }
  return tf;
}

/**
 * 计算两个 TF 向量的余弦相似度
 */
function cosineSimilarity(tfA, tfB) {
  const allKeys = new Set([...Object.keys(tfA), ...Object.keys(tfB)]);
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (const key of allKeys) {
    const a = tfA[key] || 0;
    const b = tfB[key] || 0;
    dotProduct += a * b;
    magA += a * a;
    magB += b * b;
  }

  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * 将导师数据转换为可搜索的文本画像
 */
function buildTeacherProfile(teacher) {
  const parts = [
    teacher.name || '',
    teacher.discipline || '',
    (teacher.topic_directions || []).join(' '),
    (teacher.thesis_titles || []).join(' '),
    (teacher.research_keywords || []).join(' '),
    (teacher.industry_tags || []).join(' '),
  ];
  return parts.join(' ');
}

/**
 * 将学生数据转换为可搜索的文本画像
 */
function buildStudentProfile(submission) {
  const summary = submission.ai_summary || {};
  const parts = [
    summary.personalSummary || '',
    summary.topicPreference || '',
    summary.industryBackground || '',
    summary.painPoints || '',
    summary.researchInterests || '',
    (summary.keywords || []).join(' '),
    submission.requirements || '',
  ];
  return parts.join(' ');
}

/**
 * 核心函数：从导师库中快速筛选出与学生最匹配的 Top-K 名导师
 * 
 * @param {object} submission - 学生提交数据（含 ai_summary）
 * @param {object[]} teachers - 全部导师数据数组
 * @param {number} topK - 返回前 K 名（默认 15）
 * @returns {{ name: string, similarity: number, teacher: object }[]}
 */
export function rankTeachersBySimilarity(submission, teachers, topK = 15) {
  const studentText = buildStudentProfile(submission);
  const studentTokens = tokenize(studentText);
  const studentTF = termFrequency(studentTokens);

  const ranked = teachers.map(teacher => {
    const teacherText = buildTeacherProfile(teacher);
    const teacherTokens = tokenize(teacherText);
    const teacherTF = termFrequency(teacherTokens);
    const similarity = cosineSimilarity(studentTF, teacherTF);

    return {
      name: teacher.name,
      similarity,
      teacher,
    };
  });

  // 按相似度降序排列
  ranked.sort((a, b) => b.similarity - a.similarity);

  return ranked.slice(0, topK);
}
