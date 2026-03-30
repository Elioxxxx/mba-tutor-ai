import { Trophy, Star, Lightbulb, Target, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export default function MatchResultPage({ matchData, onRestart }) {
  const matches = matchData?.matches || [];
  const analysis = matchData?.overallAnalysis || '';

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full mb-4 border border-blue-100">
            <Trophy className="w-3.5 h-3.5" />
            匹配完成
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            为你推荐的导师
          </h1>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            AI 从 117 位导师中筛选出以下最匹配的推荐
          </p>
        </div>

        {/* 整体分析 */}
        {analysis && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-2xl border border-blue-100 mb-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-800 mb-1">选题建议</p>
                <p className="text-sm text-slate-600 leading-relaxed">{analysis}</p>
              </div>
            </div>
          </div>
        )}

        {/* 导师卡片列表 */}
        <div className="space-y-4">
          {matches.map((match, idx) => (
            <TeacherCard key={idx} match={match} isTop={idx === 0} />
          ))}
        </div>

        {/* 重新开始 */}
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium text-sm rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            重新提交材料分析
          </button>
        </div>
      </div>
    </div>
  );
}

function TeacherCard({ match, isTop }) {
  const [expanded, setExpanded] = useState(isTop);
  const score = match.matchScore || 0;

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${
        isTop ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-100'
      }`}
    >
      {/* Header */}
      <div
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          {/* Rank badge */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
              isTop
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            #{match.rank}
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">{match.teacherName}</h3>
            <p className="text-xs text-slate-500 mt-0.5">匹配度 {score}%</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Score bar */}
          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                score >= 85 ? 'bg-blue-500' : score >= 70 ? 'bg-sky-400' : 'bg-slate-400'
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-100">
          {/* Match reason */}
          <div className="mt-4 mb-4">
            <p className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
              <Star className="w-3.5 h-3.5" /> 推荐理由
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">{match.matchReason}</p>
          </div>

          {/* Key match points */}
          {match.keyMatchPoints?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-slate-500 mb-2">匹配亮点</p>
              <div className="flex flex-wrap gap-2">
                {match.keyMatchPoints.map((pt, i) => (
                  <span key={i} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full border border-emerald-100">
                    {pt}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggested topics */}
          {match.suggestedTopics?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                <Target className="w-3.5 h-3.5" /> 建议论文方向
              </p>
              <div className="space-y-2">
                {match.suggestedTopics.map((topic, i) => (
                  <div key={i} className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 flex items-start gap-2">
                    <span className="text-blue-500 font-medium">{i + 1}.</span>
                    {topic}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
