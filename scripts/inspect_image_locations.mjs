import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function inspectImageLocations() {
  const buf = fs.readFileSync('C:/Users/Mani/Downloads/DTS_1.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1.0 });
    const ops = await page.getOperatorList();
    let currentMatrix = [1, 0, 0, 1, 0, 0];
    const matrixStack = [];

    console.log(`\n=== Page ${p} ===`);
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      const args = ops.argsArray[i];

      if (fn === pdfjs.OPS.save) {
        matrixStack.push([...currentMatrix]);
      } else if (fn === pdfjs.OPS.restore) {
        if (matrixStack.length > 0) currentMatrix = matrixStack.pop();
      } else if (fn === pdfjs.OPS.transform) {
        // currentMatrix = currentMatrix * args
        const [a1, b1, c1, d1, e1, f1] = currentMatrix;
        const [a2, b2, c2, d2, e2, f2] = args;
        currentMatrix = [
          a1 * a2 + c1 * b2,
          b1 * a2 + d1 * b2,
          a1 * c2 + c1 * d2,
          b1 * c2 + d1 * d2,
          a1 * e2 + c1 * f2 + e1,
          b1 * e2 + d1 * f2 + f1,
        ];
      } else if (fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintInlineImageXObject) {
        console.log(`  Image object: name=${args[0]}, x=${Math.round(currentMatrix[4])}, y=${Math.round(currentMatrix[5])}, w=${Math.round(currentMatrix[0])}, h=${Math.round(currentMatrix[3])}`);
      }
    }
  }
}

inspectImageLocations().catch(console.error);
