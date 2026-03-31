import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Sparkles, ArrowRight, X, AlertCircle, TrendingUp, Medal, Star } from 'lucide-react';
import { uploadSubmission, analyzeSubmission, getTopTeachers } from '../api';

export default function UploadPage({ onUploaded, onAnalyzed }) {
  const [resumeFile, setResumeFile] = useState(null);
  const [companyFile, setCompanyFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [requirements, setRequirements] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [topMentors, setTopMentors] = useState([]);
  const [isLoadingTop, setIsLoadingTop] = useState(true);

  const resumeRef = useRef(null);
  const companyRef = useRef(null);

  useEffect(() => {
    // 页面加载时拉取人气导师库
    getTopTeachers()
      .then(res => {
        setTopMentors(res.topTeachers || []);
      })
      .catch(err => {
        console.error('获取榜单失败', err);
      })
      .finally(() => {
        setIsLoadingTop(false);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requirements.trim()) {
      setError('请填写找导师的诉求');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const formData = new FormData();
      if (resumeFile) formData.append('resume', resumeFile);
      if (companyFile) formData.append('company', companyFile);
      formData.append('notes', notes);
      formData.append('requirements', requirements);

      // 1. 上传
      const uploadRes = await uploadSubmission(formData);
      const submissionId = uploadRes.submissionId;

      // 2. 自动触发分析
      onUploaded(submissionId);
      const analyzeRes = await analyzeSubmission(submissionId);
      onAnalyzed(submissionId, analyzeRes.summary);

    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const FileDropZone = ({ file, setFile, inputRef, label, hint, required }) => (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('!border-blue-400', '!bg-blue-50/50'); }}
      onDragLeave={(e) => { e.currentTarget.classList.remove('!border-blue-400', '!bg-blue-50/50'); }}
      onDrop={(e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('!border-blue-400', '!bg-blue-50/50');
        const dropped = e.dataTransfer.files[0];
        if (dropped?.type === 'application/pdf') setFile(dropped);
      }}
      className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 group ${
        file
          ? 'border-blue-300 bg-blue-50/30'
          : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => setFile(e.target.files[0])}
      />
      {file ? (
        <div className="flex items-center justify-center gap-3">
          <FileText className="w-8 h-8 text-blue-500" />
          <div className="text-left">
            <p className="text-sm font-medium text-slate-800">{file.name}</p>
            <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setFile(null); }}
            className="p-1 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      ) : (
        <>
          <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2 group-hover:text-blue-400 transition-colors" />
          <p className="text-sm font-medium text-slate-600 mb-0.5">
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </p>
          <p className="text-xs text-slate-400">{hint}</p>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen py-10 px-4 md:px-8">
      {/* Header */}
      <div className="text-center mb-10 w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full mb-4 border border-blue-100">
          <Sparkles className="w-3.5 h-3.5" />
          UESTC MBA · AI 导师匹配
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
          起草你的双选档案
        </h1>
        <p className="text-slate-500 text-base max-w-lg mx-auto">
          构建专属画像，AI 将从近百位商学院名师中为你精准提取出命中注定的“课题合伙人”。
        </p>
      </div>

      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 items-start justify-center">
        
        {/* 左侧：表单主图块 */}
        <div className="w-full lg:w-[600px] shrink-0">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* PDF 上传区 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-500" />
                第一步：上传参考资料
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FileDropZone
                  file={resumeFile}
                  setFile={setResumeFile}
                  inputRef={resumeRef}
                  label="个人简历 PDF"
                  hint="必填 · 帮助AI提取工作背景"
                  required
                />
                <FileDropZone
                  file={companyFile}
                  setFile={setCompanyFile}
                  inputRef={companyRef}
                  label="企业介绍 PDF"
                  hint="选填 · 商业计划书或企划案"
                />
              </div>
            </div>

            {/* 文本输入区 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h2 className="text-base font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                第二步：补充文字诉求
              </h2>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  你现在的管理段位与业务刺痛点是什么？ <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  rows={4}
                  placeholder="例如：我目前带 50 人研发团队，面临最大的痛点是大模型落地ROI无法量化，我希望论文能围绕这个具体实施去写..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  你对导师的调性（极客 / 严谨 / 散养）有要求吗？ <span className="text-slate-400 text-xs font-normal">(选填)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="例如：我不喜欢只讲宏观理论的导师，希望导师有创投经历或懂实际的产业化运作..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all resize-none"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-slate-900 hover:bg-blue-600 disabled:bg-slate-400 text-white font-medium text-base rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-blue-600/20 transition-all duration-300 flex justify-center items-center gap-2.5 cursor-pointer disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  正在穿透式解析您的履历...
                </>
              ) : (
                <>
                  提交并召唤 AI 开始匹配
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* 右侧：人气排行榜 */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-gradient-to-br from-white to-blue-50/10 rounded-2xl shadow-sm border border-slate-100 overflow-hidden sticky top-8">
             <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-rose-500" />
                  大家都在选谁
                </h3>
             </div>
             
             <div className="p-3">
               {isLoadingTop ? (
                 <div className="py-10 text-center">
                    <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs text-slate-400">正在生成导师风云榜...</p>
                 </div>
               ) : topMentors.length === 0 ? (
                 <div className="py-10 text-center px-4">
                    <p className="text-sm text-slate-500">榜单更新中</p>
                    <p className="text-xs text-slate-400 mt-1">成为第一个选择心仪导师的人吧！</p>
                 </div>
               ) : (
                 <ul className="space-y-1">
                   {topMentors.map((mentor, idx) => {
                     // 为前三名渲染特殊勋章
                     let medalColor = 'text-slate-400';
                     if (idx === 0) medalColor = 'text-amber-400 drop-shadow-sm';
                     if (idx === 1) medalColor = 'text-slate-300 drop-shadow-sm';
                     if (idx === 2) medalColor = 'text-amber-600 drop-shadow-sm';
                     
                     return (
                       <li key={mentor.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white transition-colors cursor-default group">
                          <div className="flex items-center gap-3">
                            <span className={`w-5 h-5 flex items-center justify-center font-bold text-sm ${idx < 3 ? medalColor : 'text-slate-300'}`}>
                              {idx + 1}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">{mentor.name}</p>
                              <p className="text-[10px] text-slate-400">{mentor.discipline || 'MBA 导师'}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 bg-rose-50/50 px-2 py-1 rounded-md border border-rose-100/50">
                            <Star className="w-3 h-3 text-rose-400 fill-rose-100" />
                            <span className="text-xs font-medium text-rose-600">{mentor.popularity_count || 0}</span>
                          </div>
                       </li>
                     );
                   })}
                 </ul>
               )}
             </div>
             <div className="p-3 bg-slate-50/50 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400">数据来源于全站学生的真实「心仪」指认</p>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
