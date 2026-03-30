import PDFParser from 'pdf2json';

/**
 * 从 PDF Buffer 中提取纯文字内容
 * @param {Buffer} pdfBuffer - PDF 文件的 Buffer
 * @returns {Promise<{ text: string, pages: number }>}
 */
export function extractTextFromPDF(pdfBuffer) {
  return new Promise((resolve, reject) => {
    try {
      const pdfParser = new PDFParser(null, 1);
      
      pdfParser.on('pdfParser_dataError', errData => {
        console.error('PDF parse error:', errData.parserError);
        reject(new Error('无法解析 PDF 文件，请确保文件未损坏且包含可选择的文字'));
      });
      
      pdfParser.on('pdfParser_dataReady', pdfData => {
        // 提取纯文本内容
        const rawText = pdfParser.getRawTextContent();
        
        // 去除连串的换行符和首尾空格
        const text = rawText.replace(/\r\n/g, '\n')
                            .replace(/\n{3,}/g, '\n\n')
                            .trim();
        
        const pages = pdfData.Pages ? pdfData.Pages.length : 1;
        resolve({ text, pages });
      });

      pdfParser.parseBuffer(pdfBuffer);
    } catch (error) {
      console.error('PDF Parser init error:', error);
      reject(new Error('无法加载 PDF 解析器'));
    }
  });
}
