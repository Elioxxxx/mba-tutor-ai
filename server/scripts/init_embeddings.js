/**
 * 导师 Embedding 向量预计算脚本
 * 
 * 为所有导师生成 MiniMax Embedding 向量，保存到本地 JSON 文件。
 * 支持断点续传：如果脚本中断，重新运行会跳过已完成的导师。
 * 
 * 用法：npm run init-embeddings
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
// 正确的 Embedding 端点 — 和 Chat API 同域名 (api.minimaxi.com)
const MINIMAX_EMBEDDING_URL = 'https://api.minimaxi.com/v1/embeddings';
const OUTPUT_PATH = path.resolve(__dirname, '../data/teacher_embeddings.json');

async function getEmbedding(text) {
  const response = await fetch(MINIMAX_EMBEDDING_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'embo-01',
      texts: [text.trim()],
      type: 'db',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  
  // Debug: log response structure on first call
  if (!getEmbedding._debugged) {
    console.log('  [DEBUG] Response keys:', Object.keys(data));
    if (data.data) console.log('  [DEBUG] data.data[0] keys:', Object.keys(data.data[0] || {}));
    if (data.vectors) console.log('  [DEBUG] data.vectors type:', typeof data.vectors[0]);
    getEmbedding._debugged = true;
  }

  // Try various known response formats
  let vector = null;
  
  // Format 1: OpenAI-compatible { data: [{ embedding: [...] }] }
  if (data.data?.[0]?.embedding) {
    vector = data.data[0].embedding;
  }
  // Format 2: MiniMax legacy { vectors: [[...]] }
  else if (data.vectors?.[0] && Array.isArray(data.vectors[0])) {
    vector = data.vectors[0];
  }
  // Format 3: MiniMax legacy { vectors: [...] } (flat)
  else if (data.vectors && Array.isArray(data.vectors) && typeof data.vectors[0] === 'number') {
    vector = data.vectors;
  }
  
  if (!vector || !Array.isArray(vector) || vector.length === 0) {
    throw new Error('Unexpected response format: ' + JSON.stringify(data).substring(0, 300));
  }
  
  return vector;
}

async function main() {
  console.log('📡 Fetching teachers from Supabase...');
  
  const { data: teachers, error } = await supabase
    .from('teacher_tags')
    .select('id, name, topic_directions, thesis_titles, research_keywords, industry_tags')
    .not('thesis_titles', 'eq', '{}');

  if (error) {
    console.error('Error fetching teachers:', error);
    process.exit(1);
  }

  if (!teachers || teachers.length === 0) {
    console.log('No teachers found. Exiting.');
    process.exit(0);
  }

  console.log(`Found ${teachers.length} teachers to process.`);

  // Load existing embeddings if file exists (resumable)
  let existingEmbeddings = {};
  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      existingEmbeddings = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
      console.log(`📦 Loaded ${Object.keys(existingEmbeddings).length} existing embeddings (will skip).`);
    } catch (_) {
      console.log('Existing file is invalid, starting fresh.');
    }
  }

  const embeddings = { ...existingEmbeddings };
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < teachers.length; i++) {
    const t = teachers[i];
    
    // Skip if already computed
    if (embeddings[t.name] && Array.isArray(embeddings[t.name]) && embeddings[t.name].length > 0) {
      skipCount++;
      continue;
    }

    try {
      const semanticText = [
        `导师姓名: ${t.name}`,
        `擅长课题方向: ${(t.topic_directions || []).join('、')}`,
        `历年指导论文题目: ${(t.thesis_titles || []).join('、')}`,
        `核心研究关键词: ${(t.research_keywords || []).join('、')}`,
        `适用行业场景: ${(t.industry_tags || []).join('、')}`,
      ].join('\n');

      const progress = `[${i + 1}/${teachers.length}]`;
      process.stdout.write(`  ${progress} ${t.name}... `);
      
      const vector = await getEmbedding(semanticText);
      embeddings[t.name] = vector;
      successCount++;
      console.log(`✅ (${vector.length}d)`);

      // Save after each success (resumable)
      fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(embeddings));

    } catch (err) {
      console.log(`❌ ${err.message}`);
      errorCount++;
    }

    // Brief delay to avoid API rate limits
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Final save
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(embeddings));

  console.log('');
  console.log('=================================');
  console.log(`✅ New:     ${successCount}`);
  console.log(`⏭️  Skipped: ${skipCount}`);
  console.log(`❌ Errors:  ${errorCount}`);
  console.log(`📄 Saved:   ${OUTPUT_PATH}`);
  if (fs.existsSync(OUTPUT_PATH)) {
    console.log(`📦 Size:    ${(fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(2)} MB`);
  }
  console.log('=================================');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
