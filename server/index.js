import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { uploadRouter } from './routes/upload.js';
import { analyzeRouter } from './routes/analyze.js';
import { matchRouter } from './routes/match.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 托管前端静态文件 (用于整合部署)
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/analyze', analyzeRouter);
app.use('/api/match', matchRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 对所有未被 Express API 捕获的路径，返回 index.html，让 React 页面接管路由
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
