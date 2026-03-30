import { useState } from 'react';
import UploadPage from './pages/UploadPage';
import SummaryPage from './pages/SummaryPage';
import MatchResultPage from './pages/MatchResultPage';
import './index.css';

// 状态：upload → analyzing → summary → matching → results
const STEPS = ['upload', 'analyzing', 'summary', 'matching', 'results'];

function App() {
  const [step, setStep] = useState('upload');
  const [submissionId, setSubmissionId] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [matchData, setMatchData] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 font-sans">
      {step === 'upload' && (
        <UploadPage
          onUploaded={(id) => {
            setSubmissionId(id);
            setStep('analyzing');
          }}
          onAnalyzed={(id, summary) => {
            setSubmissionId(id);
            setSummaryData(summary);
            setStep('summary');
          }}
        />
      )}

      {step === 'analyzing' && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">AI 正在分析你的材料...</h2>
            <p className="text-slate-500 text-sm">正在解析PDF并生成学术背景摘要，请稍候</p>
          </div>
        </div>
      )}

      {step === 'summary' && summaryData && (
        <SummaryPage
          submissionId={submissionId}
          summary={summaryData}
          updateSummary={setSummaryData}
          onBack={() => setStep('upload')}
          onConfirmed={() => setStep('matching')}
          onMatched={(results) => {
            setMatchData(results);
            setStep('results');
          }}
        />
      )}

      {step === 'matching' && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">正在匹配最佳导师...</h2>
            <p className="text-slate-500 text-sm">AI 正在从 95 位导师中筛选最匹配的推荐</p>
          </div>
        </div>
      )}

      {step === 'results' && matchData && (
        <MatchResultPage
          matchData={matchData}
          onRestart={() => {
            setStep('upload');
            setSubmissionId(null);
            setSummaryData(null);
            setMatchData(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
