/**
 * 从选题.csv生成teachers_topics.json
 * 用法：node scripts/parseCsv.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.resolve(__dirname, '../../../选题.csv');
const outPath = path.resolve(__dirname, '../../../teachers_topics.json');

const raw = fs.readFileSync(csvPath, 'utf-8');
const lines = raw.split('\n').filter(l => l.trim());

// Skip header
const records = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].replace(/\r$/, '');
  // 处理 CSV 中可能的引号字段
  const parts = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);

  if (parts.length >= 4) {
    records.push({
      id: parseInt(parts[0]),
      topicDirection: parts[1].trim(),
      thesisTitle: parts[2].trim().replace(/；$/, '').replace(/\?$/, ''),
      supervisor: parts[3].trim(),
    });
  }
}

fs.writeFileSync(outPath, JSON.stringify(records, null, 2), 'utf-8');

// 统计
const dirs = {};
const supervisors = new Set();
for (const r of records) {
  dirs[r.topicDirection] = (dirs[r.topicDirection] || 0) + 1;
  supervisors.add(r.supervisor);
}

console.log(`✅ 共解析 ${records.length} 条记录，${supervisors.size} 位导师`);
console.log('\n选题方向分布:');
Object.entries(dirs).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => {
  console.log(`  ${k}: ${v} 条`);
});
