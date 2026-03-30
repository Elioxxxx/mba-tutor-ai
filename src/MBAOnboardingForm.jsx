import React, { useState } from 'react';
import {
  Briefcase,
  Building2,
  FileText,
  GraduationCap,
  Link as LinkIcon,
  Sparkles,
  Target,
  UploadCloud,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  ArrowRight,
} from 'lucide-react';

export default function MBAOnboardingForm() {
  const [formData, setFormData] = useState({
    program: '电子科技大学 (UESTC) MBA',
    industry: '',
    currentRole: '',
    coreResponsibilities: '',
    companyStage: '',
    companyName: '',
    corePainPoints: '',
    corpusType: 'document',
    corpusLink: '',
    corpusText: '',
    coreObjective: '',
    availableData: [],
    tutorExpectation: '',
  });

  const [isCorpusExpanded, setIsCorpusExpanded] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData((prev) => {
      const currentValues = prev[name] || [];
      if (checked) {
        return { ...prev, [name]: [...currentValues, value] };
      } else {
        return { ...prev, [name]: currentValues.filter((v) => v !== value) };
      }
    });
  };

  const handleAiPolish = (fieldLabel) => {
    console.log(`触发${fieldLabel} AI 润色`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(
      '=== MBA 学术与商业简报提交数据 ===\n',
      JSON.stringify(formData, null, 2)
    );
    alert('提交成功！请打开 控制台 (Console) 查看生成的 JSON 数据。');
  };

  const inputClass =
    'w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all duration-200';
  const labelClass =
    'block text-sm font-medium text-slate-600 mb-1.5 flex items-center gap-1.5';
  const sectionClass =
    'bg-white p-6 md:p-8 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-slate-100/80';
  const sectionTitleClass =
    'text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2.5 pb-4 border-b border-slate-100';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 py-8 md:py-12 px-4 sm:px-6 font-sans">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full mb-4 border border-blue-100">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Matching
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-3 leading-tight">
            MBA 学术与商业简报生成器
          </h1>
          <p className="text-slate-500 text-base max-w-lg mx-auto leading-relaxed">
            只需几步，AI 将为你梳理背景，匹配最契合的论文课题与导师。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 模块 1 */}
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <GraduationCap className="text-blue-600 w-5 h-5" />
              </div>
              个人履历与当前职能
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>就读项目</label>
                  <input
                    type="text"
                    name="program"
                    value={formData.program}
                    readOnly
                    className={`${inputClass} !bg-slate-100 text-slate-500 cursor-not-allowed`}
                  />
                </div>
                <div>
                  <label className={labelClass}>所在行业</label>
                  <input
                    type="text"
                    name="industry"
                    value={formData.industry}
                    onChange={handleInputChange}
                    placeholder="例如：人工智能 / 科技初创"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>当前职务</label>
                <input
                  type="text"
                  name="currentRole"
                  value={formData.currentRole}
                  onChange={handleInputChange}
                  placeholder="例如：总经理 / 创始人"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>核心职责</label>
                <textarea
                  name="coreResponsibilities"
                  value={formData.coreResponsibilities}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="统筹公司整体战略、AI技术研发与商业化落地..."
                  className={`${inputClass} resize-none`}
                />
              </div>
            </div>
          </section>

          {/* 模块 2 */}
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <Building2 className="text-blue-600 w-5 h-5" />
              </div>
              企业介绍与业务场景
              <span className="text-xs text-red-400 font-normal ml-1 bg-red-50 px-2 py-0.5 rounded-full">
                必填
              </span>
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>企业发展阶段</label>
                  <select
                    name="companyStage"
                    required
                    value={formData.companyStage}
                    onChange={handleInputChange}
                    className={`${inputClass} appearance-none`}
                  >
                    <option value="" disabled>
                      请选择发展阶段
                    </option>
                    <option value="初创期">初创期</option>
                    <option value="成长期">成长期</option>
                    <option value="成熟期企业">成熟期企业</option>
                    <option value="体制内/国企">体制内/国企</option>
                    <option value="自由职业">自由职业</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>
                    企业名称
                    <span className="text-slate-400 font-normal">(选填)</span>
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    placeholder="例如：StringX"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="relative">
                <label className={labelClass}>
                  核心业务痛点
                  <span className="text-xs text-slate-400 font-normal">
                    — 请描述你在实际工作中尝试优化的方向
                  </span>
                </label>
                <textarea
                  name="corePainPoints"
                  required
                  value={formData.corePainPoints}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="例如：团队正尝试利用大模型自动分析飞书各部门周报以提升协同效率，但不知如何评估其对组织效能的实际影响，想以此作为论文切入点……"
                  className={`${inputClass} resize-none !pb-12`}
                />
                <button
                  type="button"
                  onClick={() => handleAiPolish('业务痛点')}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all duration-200 border border-blue-100 hover:border-blue-200 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> AI 帮我润色
                </button>
              </div>
            </div>
          </section>

          {/* 模块 3 - 折叠 */}
          <section className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-dashed border-slate-200 overflow-hidden transition-all duration-300">
            <div
              className="p-5 md:p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
              onClick={() => setIsCorpusExpanded(!isCorpusExpanded)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <FolderOpen className="text-slate-500 w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">
                    📁 补充企业语料 (可选)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    提供更多企业背景（如 BP、总结文档），AI 能为你匹配得更精准。
                  </p>
                </div>
              </div>
              <div className="p-1.5 bg-slate-100 rounded-lg">
                {isCorpusExpanded ? (
                  <ChevronUp className="text-slate-400 w-4 h-4" />
                ) : (
                  <ChevronDown className="text-slate-400 w-4 h-4" />
                )}
              </div>
            </div>

            {isCorpusExpanded && (
              <div className="px-5 md:px-6 pb-6 border-t border-slate-100">
                <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-full md:w-max mt-5 mb-5">
                  {[
                    { id: 'document', label: '文档上传', icon: UploadCloud },
                    { id: 'link', label: '外部链接', icon: LinkIcon },
                    { id: 'text', label: '补充文本', icon: FileText },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          corpusType: tab.id,
                        }))
                      }
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                        formData.corpusType === tab.id
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                    </button>
                  ))}
                </div>

                {formData.corpusType === 'document' && (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:bg-slate-50/50 hover:border-blue-200 transition-all duration-200 cursor-pointer group">
                    <UploadCloud className="w-10 h-10 text-slate-300 mx-auto mb-3 group-hover:text-blue-400 transition-colors" />
                    <p className="text-sm font-medium text-slate-600 mb-1">
                      点击或拖拽文件到此处
                    </p>
                    <p className="text-xs text-slate-400">
                      支持 PDF, Word (限制 10MB)
                    </p>
                  </div>
                )}
                {formData.corpusType === 'link' && (
                  <input
                    type="url"
                    name="corpusLink"
                    value={formData.corpusLink}
                    onChange={handleInputChange}
                    placeholder="粘贴飞书/Lark、Notion 公开文档链接..."
                    className={inputClass}
                  />
                )}
                {formData.corpusType === 'text' && (
                  <textarea
                    name="corpusText"
                    value={formData.corpusText}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="或直接粘贴企业简介、会议摘要..."
                    className={`${inputClass} resize-none`}
                  />
                )}
              </div>
            )}
          </section>

          {/* 模块 4 */}
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <Target className="text-blue-600 w-5 h-5" />
              </div>
              开题诉求与可用资源
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  您的核心开题诉求是？
                  <span className="text-slate-400 font-normal ml-1">(单选)</span>
                </label>
                <div className="space-y-2.5">
                  {[
                    '解决实际业务痛点 (形成内部管理改进方案)',
                    '验证新项目商业模式 (形成商业计划书)',
                    '总结过往经验，为跨界转型做准备',
                    '追求效率，稳妥通过盲审顺利毕业',
                    '偏向严谨学术研究，考虑后续深造',
                  ].map((option) => (
                    <label
                      key={option}
                      className={`flex items-start gap-3 cursor-pointer group p-2.5 rounded-xl transition-all duration-200 -mx-2.5 ${
                        formData.coreObjective === option
                          ? 'bg-blue-50/60 border border-blue-100'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <input
                        type="radio"
                        name="coreObjective"
                        value={option}
                        checked={formData.coreObjective === option}
                        onChange={handleInputChange}
                        className="mt-0.5 shrink-0 w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                      />
                      <span
                        className={`text-sm leading-snug ${
                          formData.coreObjective === option
                            ? 'text-blue-700 font-medium'
                            : 'text-slate-600'
                        }`}
                      >
                        {option}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  论文可用的支撑资源有？
                  <span className="text-slate-400 font-normal ml-1">(多选)</span>
                </label>
                <div className="space-y-2.5">
                  {[
                    '内部真实运营/财务数据 (可脱敏)',
                    '员工或客户的主观访谈/问卷调查',
                    '外部行业公开数据',
                    '暂无数据资源',
                  ].map((option) => (
                    <label
                      key={option}
                      className={`flex items-start gap-3 cursor-pointer group p-2.5 rounded-xl transition-all duration-200 -mx-2.5 ${
                        formData.availableData.includes(option)
                          ? 'bg-blue-50/60 border border-blue-100'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="availableData"
                        value={option}
                        checked={formData.availableData.includes(option)}
                        onChange={handleCheckboxChange}
                        className="mt-0.5 shrink-0 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span
                        className={`text-sm leading-snug ${
                          formData.availableData.includes(option)
                            ? 'text-blue-700 font-medium'
                            : 'text-slate-600'
                        }`}
                      >
                        {option}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 模块 5 */}
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <Briefcase className="text-blue-600 w-5 h-5" />
              </div>
              导师与课题偏好
            </h2>
            <div className="relative">
              <label className={labelClass}>对导师/方向的具体期望</label>
              <textarea
                name="tutorExpectation"
                value={formData.tutorExpectation}
                onChange={handleInputChange}
                rows={3}
                placeholder="例如：希望导师懂最新的 AI 技术趋势，不要用陈旧的理论套用敏捷开发团队。最好有创投背景..."
                className={`${inputClass} resize-none !pb-12`}
              />
              <button
                type="button"
                onClick={() => handleAiPolish('个性化诉求')}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all duration-200 border border-blue-100 hover:border-blue-200 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> AI 帮我润色
              </button>
            </div>
          </section>

          {/* Submit */}
          <div className="pt-2 pb-16">
            <button
              type="submit"
              className="w-full py-3.5 bg-slate-900 hover:bg-blue-600 text-white font-medium text-base rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-blue-600/25 transition-all duration-300 flex justify-center items-center gap-2.5 cursor-pointer group"
            >
              生成我的学术与商业简报
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <p className="text-center text-xs text-slate-400 mt-3">
              提交后，AI 将基于你的背景生成结构化简报并推荐匹配导师
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
