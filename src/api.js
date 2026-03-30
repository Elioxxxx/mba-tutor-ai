// 如果部署在同一个服务中，可以使用 /api，如果是本地开发则用 http://localhost:3001/api
const API_BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

export async function uploadSubmission(formData) {
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '上传失败');
  }
  return res.json();
}

export async function supplementAndReanalyze(submissionId, supplementaryInfo) {
  const res = await fetch(`${API_BASE}/analyze/supplement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ submissionId, supplementaryInfo }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '重新分析失败');
  }
  return res.json();
}

export async function analyzeSubmission(submissionId) {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ submissionId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '分析失败');
  }
  return res.json();
}

export async function confirmSubmission(submissionId) {
  const res = await fetch(`${API_BASE}/analyze/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ submissionId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '确认失败');
  }
  return res.json();
}

export async function getTeachers() {
  const res = await fetch(`${API_BASE}/teachers`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '获取导师列表失败');
  }
  return res.json();
}

export async function matchTeachers(submissionId, preferredTutors = []) {
  const res = await fetch(`${API_BASE}/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ submissionId, preferredTutors }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '匹配失败');
  }
  return res.json();
}
