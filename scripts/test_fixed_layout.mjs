import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

function findColumnGutterImproved(items, width) {
  if (items.length < 15) return width / 2;

  const numBins = 120;
  const binWidth = width / numBins;
  const bins = new Int32Array(numBins);

  for (const it of items) {
    const b = Math.floor(it.x / binWidth);
    if (b >= 0 && b < numBins) bins[b]++;
  }

  // Look for minimum density valley in central 44% - 56% of the page
  const minBin = Math.floor(numBins * 0.44);
  const maxBin = Math.ceil(numBins * 0.56);
  const centerBin = Math.floor(numBins / 2);
  let lowestCount = Infinity;
  let bestBin = centerBin;

  for (let b = minBin; b <= maxBin; b++) {
    const smoothed = (bins[b - 1] || 0) + bins[b] + (bins[b + 1] || 0);
    // Prioritize bins with lowest count, breaking ties by proximity to centerBin
    if (
      smoothed < lowestCount ||
      (smoothed === lowestCount && Math.abs(b - centerBin) < Math.abs(bestBin - centerBin))
    ) {
      lowestCount = smoothed;
      bestBin = b;
    }
  }

  const adaptiveMidX = Math.round((bestBin + 0.5) * binWidth);
  const center = width / 2;
  // Safety clamp: never deviate by more than 4% from width / 2
  if (Math.abs(adaptiveMidX - center) > width * 0.04) {
    return center;
  }
  return adaptiveMidX;
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
      return { str: it.str, x, y, width: (it.width || 0) * 2.0, height: (it.height || 0) * 2.0 };
    });

    const gutter = findColumnGutterImproved(items, vp.width);
    console.log(`Page ${p} gutter: ${gutter}`);

    const left = items.filter(it => it.x <= gutter);
    const right = items.filter(it => it.x > gutter);

    console.log(`  Left items=${left.length}, Right items=${right.length}`);
    const leftQ = left.filter(it => /^\d{1,2}\.?$/.test(it.str.trim()) || /^Q\.?\d+/i.test(it.str.trim())).map(it => it.str.trim());
    const rightQ = right.filter(it => /^\d{1,2}\.?$/.test(it.str.trim()) || /^Q\.?\d+/i.test(it.str.trim())).map(it => it.str.trim());
    console.log(`  Left questions: ${leftQ.join(', ')}`);
    console.log(`  Right questions: ${rightQ.join(', ')}`);
  }
}

testAll().catch(console.error);
