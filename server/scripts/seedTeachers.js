/**
 * 导师数据合并 + 入库脚本
 * 
 * 功能：
 * 1. 合并 teachers_detailed.json + teachers_topics.json
 * 2. 为每位导师生成基础标签（discipline, academicRank, topicDirections, thesisTitles）
 * 3. 将数据批量写入 Supabase teacher_tags 表
 * 
 * 用法：node server/scripts/seedTeachers.js
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

async function main() {
  // 加载数据
  const detailedPath = path.resolve(__dirname, '../../../teachers_detailed.json');
  const topicsPath = path.resolve(__dirname, '../../../teachers_topics.json');

  const teachers = JSON.parse(fs.readFileSync(detailedPath, 'utf-8'));
  const topics = JSON.parse(fs.readFileSync(topicsPath, 'utf-8'));

  console.log(`Loaded ${teachers.length} teachers, ${topics.length} topic entries`);

  // 按导师名聚合 topics
  const topicMap = {};
  for (const t of topics) {
    const name = t.supervisor;
    if (!topicMap[name]) {
      topicMap[name] = { directions: new Set(), titles: [] };
    }
    topicMap[name].directions.add(t.topicDirection);
    topicMap[name].titles.push(t.thesisTitle);
  }

  // 合并生成导师标签记录
  const records = teachers.map(teacher => {
    const topicData = topicMap[teacher.name];
    
    // 从 profileSections 提取研究方向文本
    const researchSection = teacher.profileSections?.find(
      s => s.title === '研究方向'
    );
    const researchKeywords = researchSection
      ? researchSection.content.split(/[,;，；、\n]/).map(s => s.trim()).filter(Boolean).slice(0, 8)
      : [];

    return {
      name: teacher.name,
      discipline: teacher.direction || '',
      academic_rank: teacher.basicInfo?.['职称'] || '',
      topic_directions: topicData ? [...topicData.directions] : [],
      thesis_titles: topicData ? topicData.titles : [],
      research_keywords: researchKeywords,
      industry_tags: [],         // 将由 LLM 标签脚本填充
      methodology_tags: [],      // 将由 LLM 标签脚本填充
      mentor_traits: [],         // 将由 LLM 标签脚本填充
      photo: teacher.photo || '',
      email: teacher.basicInfo?.['邮箱'] || '',
      raw_profile: {
        basicInfo: teacher.basicInfo,
        profileSections: teacher.profileSections,
      },
    };
  });

  console.log(`Prepared ${records.length} teacher records`);
  console.log(`Teachers with topics: ${Object.keys(topicMap).length}`);

  // 先清空表
  const { error: deleteError } = await supabase
    .from('teacher_tags')
    .delete()
    .gte('created_at', '2000-01-01');

  if (deleteError) {
    console.error('Delete error:', deleteError);
    return;
  }

  // 分批写入（每批 20 条）
  const BATCH_SIZE = 20;
  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('teacher_tags').insert(batch);
    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} error:`, error);
    } else {
      inserted += batch.length;
      console.log(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} records`);
    }
  }

  console.log(`\nDone! Inserted ${inserted}/${records.length} teacher records into Supabase.`);

  // 输出 topic 覆盖情况
  const withTopics = records.filter(r => r.topic_directions.length > 0);
  const withKeywords = records.filter(r => r.research_keywords.length > 0);
  console.log(`Teachers with topic directions: ${withTopics.length}`);
  console.log(`Teachers with research keywords: ${withKeywords.length}`);
}

main().catch(console.error);
