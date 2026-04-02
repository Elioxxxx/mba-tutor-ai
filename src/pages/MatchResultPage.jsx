import { Trophy, Star, Lightbulb, Target, RefreshCw, ChevronDown, ChevronUp, Heart, AlertCircle, Info, User } from 'lucide-react';
import { useState } from 'react';

export default function MatchResultPage({ matchData, onRestart }) {
  // 原有的 Top推荐
  let matches = [...(matchData?.matches || [])];
  const analysis = matchData?.overallAnalysis || '';
  const preferredAnalysis = matchData?.preferredAnalysis || [];

  // 合并逻辑：找出心仪导师是否在 Top 推荐里
  const unmatchedPreferred = [];

  preferredAnalysis.forEach(pref => {
    const existingIndex = matches.findIndex(m => m.teacherName === pref.teacherName);
    if (existingIndex >= 0) {
      // 在 Top推荐中 -> 打标记，合并评价
      matches[existingIndex].isPreferred = true;
      matches[existingIndex].preferredAnalysisText = pref.analysis;
      matches[existingIndex].matchDegree = pref.matchDegree;
    } else {
      // 不在 Top推荐中 -> 放入独立评估列表
      unmatchedPreferred.push(pref);
    }
  });

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
            AI 从 95 位导师中筛选出以下最匹配的推荐
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

        {/* 导师卡片列表 (Top Recommended) */}
        <div className="space-y-4 mb-10">
          {matches.map((match, idx) => (
            <TeacherCard key={idx} match={match} isTop={idx === 0} />
          ))}
        </div>

        {/* 独立心仪导师评估 (不在推荐列表中) */}
        {unmatchedPreferred.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500" /> 未入围的心仪导师评估
            </h2>
            <div className="space-y-4">
              {unmatchedPreferred.map((pref, idx) => (
                <PreferredTeacherCard key={idx} pref={pref} />
              ))}
            </div>
          </div>
        )}

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
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors relative overflow-hidden"
        onClick={() => setExpanded(!expanded)}
      >
        {match.isPreferred && (
          <div className="absolute top-0 right-0 px-3 py-1 bg-rose-50 border-b border-l border-rose-100 text-rose-600 text-[10px] font-bold rounded-bl-xl shadow-sm flex items-center gap-1">
            <Heart className="w-3 h-3 fill-rose-500" /> 用户意向
          </div>
        )}

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
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              {match.teacherName}
              {match.isPreferred && <span className="text-rose-500" title="心仪导师命中"><Heart className="w-4 h-4" /></span>}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">匹配度 {score}%</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4 sm:mt-0">
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
          {/* 专属心仪评价 (若匹配中) */}
          {match.preferredAnalysisText && (
            <div className="mt-4 mb-4 p-4 bg-rose-50/50 border border-rose-100 rounded-xl">
              <p className="text-sm font-semibold text-rose-800 flex items-center gap-1.5 mb-2">
                <Heart className="w-4 h-4 fill-rose-400/30 text-rose-500" /> 专向心仪评估 (契合度：{match.matchDegree})
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">{match.preferredAnalysisText}</p>
            </div>
          )}

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

// 独立的未入围导师卡片组件
function PreferredTeacherCard({ pref }) {
  const [expanded, setExpanded] = useState(false);
  
  // 判断契合度颜色
  const isHigh = pref.matchDegree && pref.matchDegree.includes('高');
  const isMed = pref.matchDegree && pref.matchDegree.includes('中');
  
  const badgeColor = isHigh 
    ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
    : isMed 
      ? 'bg-amber-50 text-amber-600 border-amber-200'
      : 'bg-slate-50 text-slate-600 border-slate-200';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative">
       <div
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors relative"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800">{pref.teacherName}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${badgeColor}`}>
                契合度: {pref.matchDegree || '未知'}
              </span>
              {!isHigh && <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><AlertCircle className="w-3 h-3" />未由于整体不符或名额原因入围该表</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </div>
      
      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-100 bg-slate-50/30">
          <div className="mt-4">
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mb-2">
              <Info className="w-3.5 h-3.5" /> AI 分析评估
            </p>
            <p className="text-sm text-slate-700 leading-relaxed bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
              {pref.analysis}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
