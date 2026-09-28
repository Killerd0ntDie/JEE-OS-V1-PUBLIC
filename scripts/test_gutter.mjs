import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

function findGutterWidestEmptyGap(items, width) {
  const minX = width * 0.40;
  const maxX = width * 0.60;
  const midItems = items.filter(it => it.x >= minX && it.x <= maxX);

  // Collect all occupied x-ranges (it.x to it.x + width)
  const occupied = midItems.map(it => ({
    start: it.x,
    end: it.x + Math.max(1, it.width || 0)
  })).sort((a, b) => a.start - b.start);

  // Find gaps
  let bestGapCenter = width / 2;
  let maxGapWidth = 0;

  let currentEnd = minX;
  for (const occ of occupied) {
    if (occ.start > currentEnd) {
      const gap = occ.start - currentEnd;
      if (gap > maxGapWidth) {
        maxGapWidth = gap;
        bestGapCenter = (currentEnd + occ.start) / 2;
      }
    }
    currentEnd = Math.max(currentEnd, occ.end);
  }
  if (maxX > currentEnd) {
    const gap = maxX - currentEnd;
    if (gap > maxGapWidth) {
      maxGapWidth = gap;
      bestGapCenter = (currentEnd + maxX) / 2;
    }
  }

  return { bestGapCenter, maxGapWidth };
}

async function testAll() {
  const buf = fs.readFileSync('C:/Users/Mani/Downloads/DTS_1.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 2.0 });
    const tc = await page.getTextContent();
    const items = tc.items.map(it => {
      const [x, y] = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
      return { str: it.str, x, y, width: (it.width || 0) * 2.0 };
    });

    const res = findGutterWidestEmptyGap(items, vp.width);
    console.log(`Page ${p}: bestGapCenter=${Math.round(res.bestGapCenter)}, maxGapWidth=${Math.round(res.maxGapWidth)}`);
  }
}

testAll().catch(console.error);
