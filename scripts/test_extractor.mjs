import fs from 'fs';
import { PdfTextExtractor } from '../src/features/mockTests/services/pdf/PdfTextExtractor.ts';

async function main() {
  const buf = fs.readFileSync('C:/Users/Mani/Downloads/1. P-11.pdf');
  const mockFile = {
    arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  };
  const text = await PdfTextExtractor.extractTextFromPDF(mockFile);
  fs.writeFileSync('C:/Users/Mani/.gemini/antigravity/brain/2d4534fc-f0a8-41ea-b4ba-66fb681d9f31/scratch/extracted_extractor.txt', text);
  console.log('Extracted length:', text.length);
}
main().catch(console.error);
