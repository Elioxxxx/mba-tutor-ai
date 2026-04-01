import dotenv from 'dotenv';
dotenv.config();

import { supabase } from '../services/supabase.js';
import { getMiniMaxEmbedding } from '../services/minimax.js';

async function initTeacherEmbeddings() {
  console.log('Fetching all teachers from Supabase...');
  
  const { data: teachers, error } = await supabase
    .from('teacher_tags')
    .select('id, name, topic_directions, thesis_titles, research_keywords, industry_tags')
    .is('embedding', null); // Only fetch ones that don't have an embedding yet

  if (error) {
    console.error('Error fetching teachers:', error);
    process.exit(1);
  }

  if (!teachers || teachers.length === 0) {
    console.log('No teachers need embedding updates. Exiting.');
    process.exit(0);
  }

  console.log(`Found ${teachers.length} teachers to process.`);

  let successCount = 0;
  let errorCount = 0;

  for (const t of teachers) {
    try {
      // Build a comprehensive rich text block representing the teacher's core semantics
      const semanticText = `
        导师姓名: ${t.name}
        擅长课题方向: ${(t.topic_directions || []).join('、')}
        历年指导论文题目: ${(t.thesis_titles || []).join('、')}
        核心研究关键词: ${(t.research_keywords || []).join('、')}
        适用商业落地的行业/场景: ${(t.industry_tags || []).join('、')}
      `.trim().replace(/\n\s+/g, '\n');

      console.log(`Generating embedding for ${t.name}...`);
      
      const vector = await getMiniMaxEmbedding(semanticText);

      const { error: updateError } = await supabase
        .from('teacher_tags')
        .update({ embedding: vector })
        .eq('id', t.id);

      if (updateError) {
        console.error(`Failed to update DB for ${t.name}:`, updateError);
        errorCount++;
      } else {
        successCount++;
        console.log(`✅ Success for ${t.name}`);
      }

    } catch (err) {
      console.error(`❌ Failed to process ${t.name}:`, err.message);
      errorCount++;
    }

    // Brief delay to avoid hitting MiniMax API rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('---------------------------------');
  console.log(`Finished processing. Success: ${successCount}, Errors: ${errorCount}`);
  process.exit(0);
}

initTeacherEmbeddings();
