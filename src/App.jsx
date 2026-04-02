import { useState } from 'react';
import UploadPage from './pages/UploadPage';
import SummaryPage from './pages/SummaryPage';
import MatchResultPage from './pages/MatchResultPage';
import './index.css';

// 状态：upload → analyzing → summary → results
const STEPS = ['upload', 'analyzing', 'summary', 'results'];

function App() {
  const [step, setStep] = useState('upload');
  const [submissionId, setSubmissionId] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [matchData, setMatchData] = useState(null);

  const handleRestart = () => {
    setStep('upload');
    setSubmissionId(null);
    setSummaryData(null);
    setMatchData(null);
  };

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
          onConfirmed={() => {}}
          onMatched={(results) => {
            // 双重防御：确保 results 有效再切换页面
            if (results?.matches && Array.isArray(results.matches) && results.matches.length > 0) {
              setMatchData(results);
              setStep('results');
            } else {
              console.error('[App] onMatched received invalid data:', results);
              // 不切换页面，让 SummaryPage 显示错误
            }
          }}
        />
      )}

      {step === 'results' && matchData && (
        <MatchResultPage
          matchData={matchData}
          onRestart={handleRestart}
        />
      )}

      {/* 兜底防白屏：如果进入 results 步骤但 matchData 为空 */}
      {step === 'results' && !matchData && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">匹配结果加载异常</h2>
            <p className="text-slate-500 text-sm mb-6">
              可能是网络超时或 AI 返回了无效数据，请重新提交分析。
            </p>
            <button
              onClick={handleRestart}
              className="px-6 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors cursor-pointer"
            >
              返回首页重新开始
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
