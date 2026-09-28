import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function inspectGraphics() {
  const buf = fs.readFileSync('C:/Users/Mani/Downloads/DTS_1.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const ops = await page.getOperatorList();
    const imgs = [];
    let pathOps = 0;
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      const args = ops.argsArray[i];
      // Check image ops
      if (fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintInlineImageXObject) {
        imgs.push({ fn, args });
      }
      // Check path ops: constructPath, lineTo, curveTo, stroke, fill
      if (fn === pdfjs.OPS.constructPath || fn === pdfjs.OPS.stroke || fn === pdfjs.OPS.fill) {
        pathOps++;
      }
    }
    console.log(`Page ${p}: Images=${imgs.length}, PathOps=${pathOps}`);
  }
}

inspectGraphics().catch(console.error);
