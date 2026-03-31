import { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, ArrowLeft, ArrowRight, Sparkles, User, Briefcase, Target, Tag, Send, Users } from 'lucide-react';
import Select from 'react-select';
import { confirmSubmission, matchTeachers, supplementAndReanalyze, getTeachers } from '../api';

export default function SummaryPage({ submissionId, summary, onBack, onConfirmed, onMatched, updateSummary }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [supplementaryInfo, setSupplementaryInfo] = useState('');
  const [error, setError] = useState('');
  
  // 导师选择器状态
  const [teacherOptions, setTeacherOptions] = useState([]);
  const [selectedTeachers, setSelectedTeachers] = useState([]);

  // Note: App.jsx needs to pass `updateSummary` so we can replace the summary state!
  const p = summary?.studentProfile || {};

  const [loadingStep, setLoadingStep] = useState(0);
  const loadingMessages = [
    "正在全盘扫读 95 位名师的履历与论文命题...",
    "正在应用大模型推理，计算多维契合度...",
    "正在评估您指定的「心仪导师」...",
    "正在撰写推荐导师评估深度报告..."
  ];

  useEffect(() => {
    let interval;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
      }, 3500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // 获取全体导师名单
  useEffect(() => {
    getTeachers()
      .then(res => {
        const options = res.teachers.map(t => ({
          value: t.name,
          label: `${t.name} (${t.discipline || '无科别'})`
        }));
        setTeacherOptions(options);
      })
      .catch(err => console.error('Failed to load teachers:', err));
  }, []);

  const handleConfirmAndMatch = async () => {
    setIsLoading(true);
    setLoadingStep(0);
    setError('');
    try {
      await confirmSubmission(submissionId);
      onConfirmed();
      const preferredNames = selectedTeachers.map(t => t.value);
      const matchRes = await matchTeachers(submissionId, preferredNames);
      onMatched(matchRes.result);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleSupplement = async () => {
    if (!supplementaryInfo.trim()) return;
    setIsReanalyzing(true);
    setError('');
    try {
      const res = await supplementAndReanalyze(submissionId, supplementaryInfo);
      if (updateSummary) {
        updateSummary(res.summary);
      }
      setSupplementaryInfo('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsReanalyzing(false);
    }
  };

  const InfoRow = ({ label, value }) => (
    <div className="flex items-start gap-3 py-2">
      <span className="text-xs font-medium text-slate-500 w-24 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-slate-800">{value || '未提及'}</span>
    </div>
  );

  return (
    <div className="min-h-screen py-10 px-4 relative">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-full mb-4 border border-emerald-100">
            <CheckCircle2 className="w-3.5 h-3.5" />
            AI 分析完成
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            你的学术背景摘要
          </h1>
          <p className="text-slate-500 text-sm">
            请确认以下信息是否准确，确认后将开始匹配导师
          </p>
        </div>

        {/* 个人画像 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-4">
          <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500" /> 个人画像
          </h2>
          <div className="divide-y divide-slate-100">
            <InfoRow label="姓名" value={p.name} />
            <InfoRow label="行业" value={p.industry} />
            <InfoRow label="职务" value={p.currentRole} />
            <InfoRow label="工作年限" value={p.yearsOfExperience} />
            <InfoRow label="企业阶段" value={p.companyStage} />
          </div>
        </div>

        {/* 个人总结 — 国家级 HR 视角 */}
        {p.personalSummary && (
          <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/60 p-5 rounded-2xl border border-blue-100/80 mb-4">
            <h2 className="text-base font-semibold text-slate-800 mb-2.5 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" /> 个人总结
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              {p.personalSummary}
            </p>
          </div>
        )}

        {/* 企业与痛点 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-4">
          <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-500" /> 业务分析
          </h2>
          <div className="space-y-3">
            {p.companyDescription && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">企业简述</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{p.companyDescription}</p>
              </div>
            )}
            {p.coreBusinessPainPoints && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">核心业务痛点</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{p.coreBusinessPainPoints}</p>
              </div>
            )}
            {p.managementChallenges && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">管理挑战</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{p.managementChallenges}</p>
              </div>
            )}
          </div>
        </div>

        {/* 关键词 + 建议方向 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-4">
          <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-500" /> 选题关键词
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {(summary?.suggestedKeywords || []).map((kw, i) => (
              <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">
                {kw}
              </span>
            ))}
          </div>
          {summary?.initialDirection && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">建议论文方向</p>
              <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
                <Sparkles className="w-3.5 h-3.5 text-blue-500 inline mr-1" />
                {summary.initialDirection}
              </p>
            </div>
          )}
        </div>

        {/* 缺失信息提醒与补充提交区 */}
        <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 mb-6">
          {summary?.missingInfo?.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> 以下信息可能有助于更精准匹配
              </h3>
              <ul className="space-y-1 mb-3">
                {summary.missingInfo.map((info, i) => (
                  <li key={i} className="text-xs text-amber-700 flex items-start gap-2">
                    <span className="mt-1 w-1 h-1 bg-amber-400 rounded-full shrink-0" />
                    {info}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="relative">
            <textarea
              value={supplementaryInfo}
              onChange={(e) => setSupplementaryInfo(e.target.value)}
              placeholder="在此输入补充信息，例如：其实我管理过50人团队，主要负责ToB销售..."
              className="w-full text-sm p-3 pr-24 rounded-lg border border-amber-200 bg-white placeholder-amber-400/70 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 resize-none"
              rows={3}
              disabled={isReanalyzing || isLoading}
            />
            <button
              onClick={handleSupplement}
              disabled={!supplementaryInfo.trim() || isReanalyzing || isLoading}
              className="absolute bottom-2 right-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-xs font-medium rounded-md transition-colors flex items-center gap-1.5"
            >
              {isReanalyzing ? (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              {isReanalyzing ? '重新分析' : '补充给 AI'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm mb-4">
            {error}
          </div>
        )}

        {/* 导师期望选项 */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" /> （可选）指定心仪导师评估
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            如果你心中已有倾向的导师，可以在这里选择（多选）。除了推荐匹配度最高的导师，AI 还会特地为你分析这些心仪导师与你的匹配度。
          </p>
          <div className="relative text-sm">
            <Select
              isMulti
              name="preferredTeachers"
              options={teacherOptions}
              className="basic-multi-select"
              classNamePrefix="select"
              placeholder="🔍 搜索并选择导师姓名..."
              value={selectedTeachers}
              onChange={setSelectedTeachers}
              isDisabled={isLoading}
              noOptionsMessage={() => (teacherOptions.length === 0 ? "加载导师名单..." : "未找到匹配导师")}
            />
          </div>
        </div>

        {/* Actions 动态加载区 */}
        <div className="relative">
          {isLoading ? (
            <div className="w-full py-8 px-6 bg-slate-900 text-white font-medium rounded-xl shadow-lg shadow-slate-900/10 flex flex-col items-center justify-center gap-4 animate-pulse">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-400 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-sm font-medium text-blue-100 transition-all duration-300">
                  {loadingMessages[loadingStep]}
                </p>
                <p className="text-xs text-slate-400">
                  ⚠️ AI 计算量巨大，请勿刷新页面，此过程大约需要 1 分钟
                </p>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onBack}
                disabled={isReanalyzing}
                className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-700 font-medium text-sm rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                返回修改
              </button>
              <button
                type="button"
                onClick={handleConfirmAndMatch}
                disabled={isReanalyzing}
                className="flex-[2] py-3.5 bg-slate-900 hover:bg-blue-600 text-white font-medium text-sm rounded-xl shadow-lg shadow-slate-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer group"
              >
                确认信息，开始匹配名师
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
