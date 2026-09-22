import { describe, it, expect } from 'vitest';
import { DiagramCropperEngine } from './DiagramCropperEngine';
import { PageLayoutModel } from './types';

describe('DiagramCropperEngine', () => {
  it('cleanOptions sanitizes diagram option text to clean (A)-(D) labels', () => {
    const opts = [
      { id: 'A', text: '![Option A](data:image/webp;base64,abc)' },
      { id: 'B', text: 'structure (B)' },
      { id: 'C', text: '' },
      { id: 'D', text: '(D)' }
    ];

    DiagramCropperEngine.cleanOptions(opts);
    expect(opts[0].text).toBe('(A)');
    expect(opts[1].text).toBe('(B)');
    expect(opts[2].text).toBe('(C)');
    expect(opts[3].text).toBe('(D)');
  });

  it('bounds diagram crop strictly within layout model fence and avoids bleeding', () => {
    const width = 800;
    const height = 1000;
    const pixelData = new Uint8ClampedArray(width * height * 4);
    pixelData.fill(255);

    // Ink in question 5 statement (rows 80..100)
    for (let y = 80; y <= 100; y++) {
      for (let x = 50; x < 300; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0;
      }
    }

    // Ink in question 5 diagram (rows 160..240)
    for (let y = 160; y <= 240; y++) {
      for (let x = 100; x < 500; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0;
      }
    }

    // Ink in question 6 statement (rows 300..320)
    for (let y = 300; y <= 320; y++) {
      for (let x = 50; x < 300; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0;
      }
    }

    const mockCanvas = {
      width,
      height,
      getContext: () => ({
        getImageData: (x: number, y: number, w: number, h: number) => ({ data: pixelData }),
        fillStyle: '',
        fillRect: () => {},
        drawImage: () => {}
      }),
      toDataURL: () => 'data:image/webp;base64,mock'
    } as any;

    const layoutModel: PageLayoutModel = {
      pageNum: 1,
      viewportWidth: width,
      viewportHeight: height,
      scale: 2.0,
      headerHeight: 0,
      footerHeight: height,
      columnCount: 1,
      lines: [],
      sections: [],
      questions: [
        {
          questionNum: 5,
          localQNum: 5,
          lineIndex: 0,
          statementYstart: 80,
          statementYend: 105,
          diagramGapYstart: 105,
          diagramGapYend: 290,
          contentXmin: 50,
          contentXmax: 300,
          statementText: '5. Which of the following is most preferred structure for SO3?'
        },
        {
          questionNum: 6,
          localQNum: 6,
          lineIndex: 2,
          statementYstart: 300,
          statementYend: 325,
          diagramGapYstart: 325,
          diagramGapYend: 450,
          contentXmin: 50,
          contentXmax: 300,
          statementText: '6. For hydrazoic acid which resonating structure is least stable?'
        }
      ]
    };

    const res = DiagramCropperEngine.cropDiagram(mockCanvas, layoutModel, undefined, {
      qNum: 5,
      localQNum: 5
    });

    expect(res).not.toBeNull();
    // Crop Y must not capture statement ink (starts >= 105 + 28 = 133)
    expect(res!.cropY).toBeGreaterThanOrEqual(133);
    // Crop Y + H must not capture question 6 ink (stops <= 300 - 6 = 294)
    expect(res!.cropY + res!.cropH).toBeLessThanOrEqual(294);
  });

  it('guarantees zero-leakage isolation on two-column pages', () => {
    const width = 1000;
    const height = 800;
    const pixelData = new Uint8ClampedArray(width * height * 4);
    pixelData.fill(255);

    // Left column ink (Question 1 diagram at Y=200..260, X=60..250)
    for (let y = 200; y <= 260; y++) {
      for (let x = 60; x <= 250; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx + 1] = 0; pixelData[idx + 2] = 0; pixelData[idx + 3] = 255;
      }
    }

    // Right column ink (Question 7 diagram at SAME Y=200..260, X=650..850)
    for (let y = 200; y <= 260; y++) {
      for (let x = 650; x <= 850; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx + 1] = 0; pixelData[idx + 2] = 0; pixelData[idx + 3] = 255;
      }
    }

    const mockCanvas = {
      width,
      height,
      getContext: () => ({
        getImageData: () => ({ data: pixelData }),
        fillStyle: '',
        fillRect: () => {},
        drawImage: () => {}
      }),
      toDataURL: () => 'data:image/webp;base64,mock'
    } as any;

    const twoColumnLayout: PageLayoutModel = {
      pageNum: 2,
      viewportWidth: width,
      viewportHeight: height,
      scale: 2.0,
      headerHeight: 0,
      footerHeight: height,
      columnCount: 2,
      lines: [],
      sections: [],
      questions: [
        {
          questionNum: 1,
          localQNum: 1,
          lineIndex: 0,
          statementYstart: 100,
          statementYend: 140,
          diagramGapYstart: 140,
          diagramGapYend: 350,
          contentXmin: 50,
          contentXmax: 350,
          statementText: '1. Which structure represents the cis isomer?'
        },
        {
          questionNum: 7,
          localQNum: 7,
          lineIndex: 5,
          statementYstart: 100,
          statementYend: 140,
          diagramGapYstart: 140,
          diagramGapYend: 350,
          contentXmin: 600,
          contentXmax: 900,
          statementText: '7. The hybridization of central atom in the given molecule is:'
        }
      ]
    };

    // Crop for Question 1 (Left column)
    const cropQ1 = DiagramCropperEngine.cropDiagram(mockCanvas, twoColumnLayout, undefined, {
      qNum: 1,
      localQNum: 1
    });

    expect(cropQ1).not.toBeNull();
    // Crop X for Question 1 must stay strictly within left half
    expect(cropQ1!.cropX + cropQ1!.cropW).toBeLessThanOrEqual(510);
    // Must contain left diagram (minX around 60 - 16 = 44)
    expect(cropQ1!.cropX).toBeLessThanOrEqual(60);

    // Crop for Question 7 (Right column)
    const cropQ7 = DiagramCropperEngine.cropDiagram(mockCanvas, twoColumnLayout, undefined, {
      qNum: 7,
      localQNum: 7
    });

    expect(cropQ7).not.toBeNull();
    // Crop X for Question 7 must stay strictly within right half
    expect(cropQ7!.cropX).toBeGreaterThanOrEqual(490);
    expect(cropQ7!.cropX + cropQ7!.cropW).toBeLessThanOrEqual(width);
  });

  it('correctly accepts and reuses pre-computed PageInkProfile', () => {
    const width = 600;
    const height = 400;
    const pixelData = new Uint8ClampedArray(width * height * 4);
    pixelData.fill(255);

    // Ink at Y=100..150, X=100..300
    for (let y = 100; y <= 150; y++) {
      for (let x = 100; x <= 300; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 10; pixelData[idx + 1] = 10; pixelData[idx + 2] = 10; pixelData[idx + 3] = 255;
      }
    }

    const mockCtx = {
      getImageData: () => ({ data: pixelData })
    } as any;

    const precomputedProfile = {
      backgroundLum: 255,
      inkThreshold: 180,
      watermarkLum: null,
      hasColoredInk: false,
      minInkPixelsPerRow: 10
    };

    const rect = DiagramCropperEngine.detectCropRect(
      mockCtx,
      width,
      height,
      null,
      undefined,
      undefined,
      precomputedProfile
    );

    expect(rect).not.toBeNull();
    expect(rect!.cropY).toBeLessThanOrEqual(100);
    expect(rect!.cropY + rect!.cropH).toBeGreaterThanOrEqual(150);
    expect(rect!.strategyUsed).toBe('ink-density');
  });

  it('excludes statement text and option text when cropping central molecule diagram (Question 14 scenario)', () => {
    const width = 800;
    const height = 1000;
    const pixelData = new Uint8ClampedArray(width * height * 4);
    pixelData.fill(255);

    // Question 14 Statement: Y=40..70
    for (let y = 40; y <= 70; y++) {
      for (let x = 40; x <= 450; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
      }
    }

    // Molecule Diagram (Cl-SO2-Cl): Y=150..350
    for (let y = 150; y <= 350; y++) {
      for (let x = 200; x <= 600; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
      }
    }

    // Option (A): Y=420..445
    for (let y = 420; y <= 445; y++) {
      for (let x = 40; x <= 400; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
      }
    }

    // Option (B): Y=460..485
    for (let y = 460; y <= 485; y++) {
      for (let x = 40; x <= 400; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
      }
    }

    const mockCtx = {
      getImageData: () => ({ data: pixelData })
    } as any;

    const rect = DiagramCropperEngine.detectCropRect(
      mockCtx,
      width,
      height,
      null, // pure scanned page
      undefined,
      {
        qNum: 14,
        options: [
          { id: 'A', text: 'It contains p_pi - p_pi and p_pi - d_pi' },
          { id: 'B', text: 'It has regular tetrahedral geometry.' },
          { id: 'C', text: '\\theta_1 > \\theta_3' },
          { id: 'D', text: 'Plane which contains maximum number of atom is 4.' }
        ]
      }
    );

    expect(rect).not.toBeNull();
    // Crop must start below question statement (Y > 70)
    expect(rect!.cropY).toBeGreaterThan(70);
    // Crop must stop before Option (A) (Y + H < 420)
    expect(rect!.cropY + rect!.cropH).toBeLessThan(420);
    // Crop must capture the diagram (150..350)
    expect(rect!.cropY).toBeLessThanOrEqual(150);
    expect(rect!.cropY + rect!.cropH).toBeGreaterThanOrEqual(350);
  });

  it('excludes multi-line statement text and captures full molecules when options are on next page (Question 20 scenario)', () => {
    const width = 800;
    const height = 1000;
    const pixelData = new Uint8ClampedArray(width * height * 4);
    pixelData.fill(255);

    // Question 20 Statement Line 1: Y=40..65
    for (let y = 40; y <= 65; y++) {
      for (let x = 40; x <= 650; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
      }
    }

    // Question 20 Statement Line 2 ("molecules."): Y=75..100
    for (let y = 75; y <= 100; y++) {
      for (let x = 40; x <= 160; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
      }
    }

    // Question 20 Diagram (Two molecules): Y=160..380
    for (let y = 160; y <= 380; y++) {
      for (let x = 80; x <= 720; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
      }
    }

    const mockCtx = {
      getImageData: () => ({ data: pixelData })
    } as any;

    const rect = DiagramCropperEngine.detectCropRect(
      mockCtx,
      width,
      height,
      null,
      undefined,
      {
        qNum: 20,
        options: [
          { id: 'A', text: '$x > y$' },
          { id: 'B', text: '$y > x$' },
          { id: 'C', text: '$x = y$' },
          { id: 'D', text: 'None of these' }
        ]
      }
    );

    expect(rect).not.toBeNull();
    // Crop must start below Line 2 "molecules." (Y > 100)
    expect(rect!.cropY).toBeGreaterThan(100);
    // Crop must fully capture the molecules (160..380)
    expect(rect!.cropY).toBeLessThanOrEqual(160);
    expect(rect!.cropY + rect!.cropH).toBeGreaterThanOrEqual(380);
  });

  it('captures bottom axial atoms connected via colored red vertical bonds and stops before options (Q7/Q20 axial F atoms)', () => {
    const width = 800;
    const height = 1000;
    const pixelData = new Uint8ClampedArray(width * height * 4);
    pixelData.fill(255);

    // Question statement: Y=40..70
    for (let y = 40; y <= 70; y++) {
      for (let x = 40; x <= 600; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
      }
    }

    // Molecule bodies (Cl and S central atoms + top F atoms): Y=140..220
    for (let y = 140; y <= 220; y++) {
      for (let x = 120; x <= 680; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
      }
    }

    // Red vertical single bonds extending downwards: Y=221..270 (red ink, thin 2px lines)
    for (let y = 221; y <= 270; y++) {
      for (const x of [250, 251, 550, 551]) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 240; pixelData[idx+1] = 20; pixelData[idx+2] = 20; pixelData[idx+3] = 255;
      }
    }

    // Bottom axial F atoms: Y=271..295 (black ink)
    for (let y = 271; y <= 295; y++) {
      for (let x = 240; x <= 260; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
      }
      for (let x = 540; x <= 560; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
      }
    }

    // Black horizontal box bottom border: Y=310 (1px line)
    for (let x = 30; x <= 770; x++) {
      const idx = (310 * width + x) * 4;
      pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
    }

    // Options Line 1 (A) & (B): Y=340..365
    for (let y = 340; y <= 365; y++) {
      for (let x = 60; x <= 580; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
      }
    }

    // Options Line 2 (C) & (D): Y=380..405
    for (let y = 380; y <= 405; y++) {
      for (let x = 60; x <= 580; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
      }
    }

    const mockCtx = {
      getImageData: () => ({ data: pixelData })
    } as any;

    const rect = DiagramCropperEngine.detectCropRect(
      mockCtx,
      width,
      height,
      null,
      undefined,
      {
        qNum: 7,
        options: [
          { id: 'A', text: '$x > y$' },
          { id: 'B', text: '$y > x$' },
          { id: 'C', text: '$x = y$' },
          { id: 'D', text: 'None of these' }
        ]
      }
    );

    expect(rect).not.toBeNull();
    // Crop must capture top of molecule (Y <= 140)
    expect(rect!.cropY).toBeLessThanOrEqual(140);
    // Crop MUST capture bottom axial F atoms (Y + H >= 295)
    expect(rect!.cropY + rect!.cropH).toBeGreaterThanOrEqual(295);
    // Crop MUST NOT include the options (Y + H < 340)
    expect(rect!.cropY + rect!.cropH).toBeLessThan(340);
  });

  it('isolates diagram cropping strictly to question column on two-column pages', () => {
    const width = 800; // midX = 400
    const height = 1000;
    const pixelData = new Uint8ClampedArray(width * height * 4);
    pixelData.fill(255);

    // Left Column Diagram (Q2): X=100..300, Y=200..350
    for (let y = 200; y <= 350; y++) {
      for (let x = 100; x <= 300; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
      }
    }

    // Right Column Diagram (Q5 / Q20): X=500..700, Y=200..350
    for (let y = 200; y <= 350; y++) {
      for (let x = 500; x <= 700; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
      }
    }

    const mockCtx = {
      getImageData: () => ({ data: pixelData })
    } as any;

    const twoColLayout: PageLayoutModel = {
      pageNum: 1,
      viewportWidth: width,
      viewportHeight: height,
      scale: 2.0,
      headerHeight: 50,
      footerHeight: 950,
      columnCount: 2,
      lines: [],
      sections: [],
      questions: [
        {
          questionNum: 2,
          localQNum: 2,
          columnIndex: 0,
          lineIndex: 1,
          statementYstart: 150,
          statementYend: 180,
          diagramGapYstart: 188,
          diagramGapYend: 370,
          contentXmin: 50,
          contentXmax: 350,
          statementText: '2. Particle moves along ABCD'
        },
        {
          questionNum: 5,
          localQNum: 5,
          columnIndex: 1,
          lineIndex: 2,
          statementYstart: 150,
          statementYend: 180,
          diagramGapYstart: 188,
          diagramGapYend: 370,
          contentXmin: 450,
          contentXmax: 750,
          statementText: '5. Particle path spiral'
        }
      ]
    };

    // 1. Crop Left Column Question (Q2)
    const leftCrop = DiagramCropperEngine.detectCropRect(
      mockCtx,
      width,
      height,
      twoColLayout,
      undefined,
      { qNum: 2, localQNum: 2 }
    );
    expect(leftCrop).not.toBeNull();
    // Must be strictly confined to left half of page
    expect(leftCrop!.cropX + leftCrop!.cropW).toBeLessThanOrEqual(415);
    expect(leftCrop!.cropX).toBeGreaterThanOrEqual(80);

    // 2. Crop Right Column Question (Q5)
    const rightCrop = DiagramCropperEngine.detectCropRect(
      mockCtx,
      width,
      height,
      twoColLayout,
      undefined,
      { qNum: 5, localQNum: 5 }
    );
    expect(rightCrop).not.toBeNull();
    // Must be strictly confined to right half of page
    expect(rightCrop!.cropX).toBeGreaterThanOrEqual(390);
    expect(rightCrop!.cropX + rightCrop!.cropW).toBeLessThanOrEqual(720);
  });
});
