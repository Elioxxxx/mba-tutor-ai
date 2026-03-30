import { Router } from 'express';
import multer from 'multer';
import { extractTextFromPDF } from '../services/pdfParser.js';
import { supabase } from '../services/supabase.js';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/**
 * POST /api/upload
 * 接收简历PDF、企业介绍PDF、备注、诉求
 * 返回 submission ID
 */
router.post('/', upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'company', maxCount: 1 },
]), async (req, res) => {
  try {
    const { notes, requirements } = req.body;

    if (!requirements) {
      return res.status(400).json({ error: '请填写找导师的诉求' });
    }

    // 解析 PDF
    let resumeText = '';
    let companyText = '';
    let resumeUrl = null;
    let companyUrl = null;

    if (req.files?.resume?.[0]) {
      const resumeFile = req.files.resume[0];
      const parsed = await extractTextFromPDF(resumeFile.buffer);
      resumeText = parsed.text;

      // 上传至 Supabase Storage
      const resumePath = `resumes/${Date.now()}_${resumeFile.originalname}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(resumePath, resumeFile.buffer, {
          contentType: resumeFile.mimetype,
        });
      
      if (!uploadError) {
        resumeUrl = resumePath;
      }
    }

    if (req.files?.company?.[0]) {
      const companyFile = req.files.company[0];
      const parsed = await extractTextFromPDF(companyFile.buffer);
      companyText = parsed.text;

      const companyPath = `companies/${Date.now()}_${companyFile.originalname}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(companyPath, companyFile.buffer, {
          contentType: companyFile.mimetype,
        });

      if (!uploadError) {
        companyUrl = companyPath;
      }
    }

    // 存入数据库
    const { data, error } = await supabase
      .from('student_submissions')
      .insert({
        resume_url: resumeUrl,
        company_url: companyUrl,
        notes: notes || '',
        requirements,
        extracted_text: {
          resume: resumeText,
          company: companyText,
        },
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: '数据存储失败: ' + error.message });
    }

    res.json({
      success: true,
      submissionId: data.id,
      extractedText: {
        resumeLength: resumeText.length,
        companyLength: companyText.length,
      },
    });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

export { router as uploadRouter };
