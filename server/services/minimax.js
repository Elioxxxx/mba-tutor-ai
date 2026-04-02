/**
 * MiniMax API 封装
 * 
 * 配置位置：.env 文件中的以下变量
 *   MINIMAX_API_KEY  — 你的 MiniMax API Key
 *   MINIMAX_MODEL    — 模型名称（默认 MiniMax-Text-01）
 * 
 * MiniMax API 文档参考：https://platform.minimaxi.com/document/text
 */

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_MODEL = process.env.MINIMAX_MODEL || 'MiniMax-Text-01';
const MINIMAX_API_URL = 'https://api.minimaxi.com/v1/text/chatcompletion_v2';
const MINIMAX_EMBEDDING_URL = 'https://api.minimaxi.com/v1/embeddings';

if (!MINIMAX_API_KEY) {
  console.warn('⚠️  Missing MINIMAX_API_KEY in .env — AI features will not work');
}

/**
 * 调用 MiniMax Chat Completion API
 * @param {string} systemPrompt - 系统提示词
 * @param {string} userMessage - 用户消息
 * @param {object} options - 可选参数 { temperature, maxTokens }
 * @returns {Promise<string>} - 模型回复文本
 */
export async function callMiniMax(systemPrompt, userMessage, options = {}) {
  const { temperature = 0.3, maxTokens = 4096 } = options;

  const response = await fetch(MINIMAX_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: MINIMAX_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MiniMax API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  
  // MiniMax 返回格式
  const reply = data.choices?.[0]?.message?.content;
  if (!reply) {
    throw new Error('MiniMax API returned empty response: ' + JSON.stringify(data));
  }
  
  return reply;
}

/**
 * 调用 MiniMax 并解析 JSON 返回
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {object} options
 * @returns {Promise<object>}
 */
export async function callMiniMaxJSON(systemPrompt, userMessage, options = {}) {
  const reply = await callMiniMax(systemPrompt, userMessage, options);
  
  // 尝试从回复中提取 JSON
  const jsonMatch = reply.match(/```json\s*([\s\S]*?)```/) || reply.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : reply;
  
  try {
    return JSON.parse(jsonStr.trim());
  } catch (e) {
    console.error('Failed to parse MiniMax JSON response:', reply);
    throw new Error('MiniMax returned non-JSON response');
  }
}

/**
 * 调用 MiniMax Embeddings API 生成语义特征向量
 * @param {string} text - 需要语义化编码的文本
 * @param {string} type - 向量用途 ('db' 存入数据库, 'query' 用于检索匹配)
 * @returns {Promise<number[]>} - 1536 维度的数学向量
 */
export async function getMiniMaxEmbedding(text, type = 'db') {
  if (!text || !text.trim()) {
    throw new Error('Embedding 文本不能为空');
  }
  
  const response = await fetch(MINIMAX_EMBEDDING_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'embo-01',
      texts: [text.trim()],
      type: type,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MiniMax Embedding API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  
  // 兼容两种返回格式
  // OpenAI 格式: { data: [{ embedding: [...] }] }
  // MiniMax 旧格式: { vectors: [[...]] }
  let vector = null;
  if (data.data?.[0]?.embedding) {
    vector = data.data[0].embedding;
  } else if (data.vectors?.[0] && Array.isArray(data.vectors[0])) {
    vector = data.vectors[0];
  } else if (data.vectors && Array.isArray(data.vectors) && typeof data.vectors[0] === 'number') {
    vector = data.vectors;
  }
  
  if (!vector || !Array.isArray(vector)) {
    throw new Error('MiniMax returned invalid embedding vector: ' + JSON.stringify(data).substring(0, 200));
  }
  
  return vector;
}
