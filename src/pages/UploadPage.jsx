import { useState, useRef } from 'react';
import { Upload, FileText, Sparkles, ArrowRight, X, AlertCircle } from 'lucide-react';
import { uploadSubmission, analyzeSubmission } from '../api';

export default function UploadPage({ onUploaded, onAnalyzed }) {
  const [resumeFile, setResumeFile] = useState(null);
  const [companyFile, setCompanyFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [requirements, setRequirements] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const resumeRef = useRef(null);
  const companyRef = useRef(null);

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
    <div className="min-h-screen flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full mb-4 border border-blue-100">
            <Sparkles className="w-3.5 h-3.5" />
            UESTC MBA · AI 导师匹配
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
            上传你的资料
          </h1>
          <p className="text-slate-500 text-base max-w-md mx-auto">
            上传简历和企业介绍，AI 将为你分析背景并推荐最匹配的论文导师。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* PDF 上传区 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-500" />
              上传文档
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileDropZone
                file={resumeFile}
                setFile={setResumeFile}
                inputRef={resumeRef}
                label="个人简历 PDF"
                hint="点击或拖拽上传 (限 10MB)"
                required
              />
              <FileDropZone
                file={companyFile}
                setFile={setCompanyFile}
                inputRef={companyRef}
                label="企业介绍 PDF"
                hint="选填 · 文字或PPT转PDF均可"
              />
            </div>
          </div>

          {/* 文本输入区 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                找导师的诉求 <span className="text-red-400">*</span>
              </label>
              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                rows={4}
                placeholder="描述你对导师和论文方向的期望。例如：希望导师了解最新AI技术，能指导我将大模型应用于企业管理效率提升方面的论文..."
                className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                补充备注 <span className="text-slate-400 text-xs font-normal">(选填)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="补充其他细节：团队规模、发展阶段、你的管理年限、业务数据情况等..."
                className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all resize-none"
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
            className="w-full py-3.5 bg-slate-900 hover:bg-blue-600 disabled:bg-slate-400 text-white font-medium text-base rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-blue-600/20 transition-all duration-300 flex justify-center items-center gap-2.5 cursor-pointer disabled:cursor-not-allowed group"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                正在上传与分析...
              </>
            ) : (
              <>
                提交并开始 AI 分析
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
