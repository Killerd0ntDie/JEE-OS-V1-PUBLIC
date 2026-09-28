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
    // Crop Y must not capture statement ink (starts >= 105)
    expect(res!.cropY).toBeGreaterThanOrEqual(105);
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
    expect(leftCrop!.cropX).toBeGreaterThanOrEqual(75);

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
    expect(rightCrop!.cropX + rightCrop!.cropW).toBeLessThanOrEqual(730);
  });

  it('preserves tall diagrams exceeding 420px on high-DPI canvas without arbitrary height clipping', () => {
    const width = 1200;
    const height = 2400; // High-DPI canvas
    const pixelData = new Uint8ClampedArray(width * height * 4);
    pixelData.fill(255);

    // Question statement: y = 100..150
    for (let y = 100; y <= 150; y++) {
      for (let x = 100; x < 600; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0;
      }
    }

    // Tall diagram (e.g. optics ray or circuit ladder): y = 220..920 (700px tall!)
    for (let y = 220; y <= 920; y++) {
      for (let x = 200; x <= 800; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0;
      }
    }

    const mockCtx = {
      getImageData: () => ({ data: pixelData })
    } as unknown as CanvasRenderingContext2D;

    // Strict fence bounding the question to y = 100..1100
    const crop = DiagramCropperEngine.detectCropRect(
      mockCtx,
      width,
      height,
      null,
      undefined,
      { fence: { fenceYmin: 160, fenceYmax: 1100 } }
    );

    expect(crop).not.toBeNull();
    expect(crop!.cropY).toBeLessThanOrEqual(220);
    // Diagram is 700px tall (220..920). It should NOT be clamped to 420px!
    expect(crop!.cropH).toBeGreaterThan(650);
    expect(crop!.cropY + crop!.cropH).toBeGreaterThanOrEqual(920);
  });

  it('correctly detects and strips option text in the right-hand column using column-relative width', () => {
    const width = 1000;
    const height = 1000;
    const pixelData = new Uint8ClampedArray(width * height * 4);
    pixelData.fill(255);

    // Right column: x = 500..1000
    // Right column statement: y = 50..90, x = 550..950
    for (let y = 50; y <= 90; y++) {
      for (let x = 550; x <= 950; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0;
      }
    }

    // Right column centered diagram: y = 130..280, x = 650..850
    for (let y = 130; y <= 280; y++) {
      for (let x = 650; x <= 850; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0;
      }
    }

    // Right column option text starting at column left margin: y = 330..360, x = 530..800
    for (let y = 330; y <= 360; y++) {
      for (let x = 530; x <= 800; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0;
      }
    }

    const mockCtx = {
      getImageData: () => ({ data: pixelData })
    } as unknown as CanvasRenderingContext2D;

    const twoColLayout: PageLayoutModel = {
      pageNum: 1,
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
          questionNum: 4,
          localQNum: 4,
          columnIndex: 1,
          lineIndex: 0,
          statementYstart: 50,
          statementYend: 90,
          diagramGapYstart: 100,
          diagramGapYend: 450,
          contentXmin: 520,
          contentXmax: 980,
          statementText: '4. In right column apparatus'
        }
      ]
    };

    const crop = DiagramCropperEngine.detectCropRect(
      mockCtx,
      width,
      height,
      twoColLayout,
      undefined,
      {
        qNum: 4,
        localQNum: 4,
        options: [{ id: 'A', text: 'Option A text' }, { id: 'B', text: 'Option B text' }]
      }
    );

    expect(crop).not.toBeNull();
    // Crop should capture the diagram (130..280) and strip option text at y = 330
    expect(crop!.cropY + crop!.cropH).toBeLessThan(330);
    expect(crop!.cropX).toBeGreaterThanOrEqual(520);
  });

  it('returns null instead of blank white fallback when bands.length === 0 and no bbox provided (R4)', () => {
    const width = 800;
    const height = 1000;
    const pixelData = new Uint8ClampedArray(width * height * 4);
    pixelData.fill(255); // Entire canvas is pure white (0 ink)

    const mockCtx = {
      getImageData: () => ({ data: pixelData })
    } as unknown as CanvasRenderingContext2D;

    const layout: PageLayoutModel = {
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
          questionNum: 48,
          localQNum: 48,
          lineIndex: 0,
          statementYstart: 100,
          statementYend: 140,
          diagramGapYstart: 140,
          diagramGapYend: 400,
          contentXmin: 50,
          contentXmax: 400,
          statementText: '48. Arrange the four graphs in descending order of total work done'
        }
      ]
    };

    const crop = DiagramCropperEngine.detectCropRect(
      mockCtx,
      width,
      height,
      layout,
      undefined, // No AI bbox provided
      {
        qNum: 48,
        localQNum: 48,
        fence: { fenceYmin: 150, fenceYmax: 400 }
      }
    );

    // CRITICAL: Must return null rather than cropping an empty white box!
    expect(crop).toBeNull();
  });

  it('uses AI bounding box when ink scanning yields zero bands but valid AI bbox is provided (R4)', () => {
    const width = 800;
    const height = 1000;
    const pixelData = new Uint8ClampedArray(width * height * 4);
    pixelData.fill(255); // Zero ink detected (e.g. fine vector curves)

    const mockCtx = {
      getImageData: () => ({ data: pixelData })
    } as unknown as CanvasRenderingContext2D;

    const layout: PageLayoutModel = {
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
          questionNum: 48,
          localQNum: 48,
          lineIndex: 0,
          statementYstart: 100,
          statementYend: 140,
          diagramGapYstart: 140,
          diagramGapYend: 500,
          contentXmin: 50,
          contentXmax: 400,
          statementText: '48. Four graphs'
        }
      ]
    };

    // AI provided bbox in normalized 0-1000 scale: [ymin=200, xmin=100, ymax=400, xmax=500]
    const bbox = [200, 100, 400, 500];

    const crop = DiagramCropperEngine.detectCropRect(
      mockCtx,
      width,
      height,
      layout,
      bbox,
      {
        qNum: 48,
        localQNum: 48,
        fence: { fenceYmin: 150, fenceYmax: 500 }
      }
    );

    expect(crop).not.toBeNull();
    expect(crop!.strategyUsed).toBe('ai-hint');
    expect(crop!.cropY).toBeGreaterThanOrEqual(150);
    expect(crop!.cropW).toBeGreaterThanOrEqual(300);
    expect(crop!.cropH).toBeGreaterThanOrEqual(180);
  });

  describe('Phase 2: Robustness & Validation Tests', () => {
    it('validateBbox sanitizes, flips inverted bboxes, and rejects degenerate boxes (R5)', () => {
      // 1. Valid bbox
      const valid = DiagramCropperEngine.validateBbox([100, 200, 300, 400]);
      expect(valid).toEqual([100, 200, 300, 400]);

      // 2. Inverted coordinates auto-flipped
      const inverted = DiagramCropperEngine.validateBbox([400, 500, 100, 200]);
      expect(inverted).toEqual([100, 200, 400, 500]);

      // 3. Degenerate box (< 15 units span) rejected
      const degenerate = DiagramCropperEngine.validateBbox([100, 100, 105, 105]);
      expect(degenerate).toBeUndefined();

      // 4. Non-number or NaN coordinates rejected
      const nanBox = DiagramCropperEngine.validateBbox([100, NaN, 300, 400]);
      expect(nanBox).toBeUndefined();

      // 5. Invalid array length rejected
      const shortBox = DiagramCropperEngine.validateBbox([100, 200]);
      expect(shortBox).toBeUndefined();
    });

    it('hasSubstantiveInk detects real diagram ink and rejects pure white canvas (R1)', () => {
      const width = 200;
      const height = 150;
      const whiteData = new Uint8ClampedArray(width * height * 4);
      whiteData.fill(255); // 0 ink

      const whiteCtx = {
        getImageData: () => ({ data: whiteData })
      } as unknown as CanvasRenderingContext2D;

      // Pure white region must be rejected
      const isWhiteOk = DiagramCropperEngine.hasSubstantiveInk(whiteCtx, 0, 0, width, height);
      expect(isWhiteOk).toBe(false);

      // Add diagram ink strokes (200 pixels with r=0, g=0, b=0)
      const inkData = new Uint8ClampedArray(width * height * 4);
      inkData.fill(255);
      for (let i = 0; i < 200; i++) {
        const idx = i * 4;
        inkData[idx] = 0;
        inkData[idx + 1] = 0;
        inkData[idx + 2] = 0;
        inkData[idx + 3] = 255;
      }

      const inkCtx = {
        getImageData: () => ({ data: inkData })
      } as unknown as CanvasRenderingContext2D;

      const isInkOk = DiagramCropperEngine.hasSubstantiveInk(inkCtx, 0, 0, width, height);
      expect(isInkOk).toBe(true);
    });

    it('cropDiagram rejects crop and returns null when target region contains zero ink (R1)', () => {
      const width = 800;
      const height = 1000;
      const whiteData = new Uint8ClampedArray(width * height * 4);
      whiteData.fill(255); // Entire canvas is pure white

      const mockCanvas = {
        width,
        height,
        getContext: () => ({
          getImageData: () => ({ data: whiteData }),
          fillStyle: '',
          fillRect: () => {},
          drawImage: () => {}
        }),
        toDataURL: () => 'data:image/webp;base64,SHOULD_NEVER_BE_CALLED'
      } as any;

      const layout: PageLayoutModel = {
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
            questionNum: 48,
            localQNum: 48,
            lineIndex: 0,
            statementYstart: 100,
            statementYend: 140,
            diagramGapYstart: 140,
            diagramGapYend: 450,
            contentXmin: 50,
            contentXmax: 400,
            statementText: '48. Four graphs'
          }
        ]
      };

      // Even with an AI bbox, if the canvas has literally 0 ink, cropDiagram must return null!
      const result = DiagramCropperEngine.cropDiagram(
        mockCanvas,
        layout,
        [200, 100, 400, 500],
        { qNum: 48, localQNum: 48 }
      );

      expect(result).toBeNull();
    });

    it('strips top leaked text line when thin left-aligned band precedes diagram by whitespace (Phase 3 - R12)', () => {
      const width = 800;
      const height = 1000;
      const pixelData = new Uint8ClampedArray(width * height * 4);
      pixelData.fill(255);

      // Leaked statement text line: Y = 145..165 (height 20), X = 60..200 (left-aligned)
      for (let y = 145; y <= 165; y++) {
        for (let x = 60; x <= 200; x++) {
          const idx = (y * width + x) * 4;
          pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
        }
      }

      // 25px whitespace gap: Y = 166..190

      // Diagram below: Y = 191..320 (height 129), X = 150..550 (indented and large)
      for (let y = 191; y <= 320; y++) {
        for (let x = 150; x <= 550; x++) {
          const idx = (y * width + x) * 4;
          pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
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
        toDataURL: () => 'data:image/webp;base64,mock_cropped'
      } as any;

      const layout: PageLayoutModel = {
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
            questionNum: 12,
            localQNum: 12,
            lineIndex: 0,
            statementYstart: 100,
            statementYend: 140,
            diagramGapYstart: 140,
            diagramGapYend: 450,
            contentXmin: 50,
            contentXmax: 750,
            statementText: '12. In the circuit shown below'
          }
        ]
      };

      const result = DiagramCropperEngine.cropDiagram(
        mockCanvas,
        layout,
        undefined,
        { qNum: 12, localQNum: 12 }
      );

      expect(result).not.toBeNull();
      // Crop should exclude the leaked text at 145..165 and focus on the diagram starting at 191
      // With safety top padding (20px), cropY should be >= 171 (191 - 20)
      expect(result!.cropY).toBeGreaterThanOrEqual(160);
    });

    it('isolates 2-column pages and stops safely before the central gutter divider line (Phase 3 - Multi-Column Isolation)', () => {
      const width = 1000;
      const height = 1000;
      const pixelData = new Uint8ClampedArray(width * height * 4);
      pixelData.fill(255);

      // Central divider line at x = 500
      for (let y = 50; y < 900; y++) {
        const idx = (y * width + 500) * 4;
        pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
      }

      // Question in Left Column: x = 50..460, diagram at x = 100..450, y = 200..350
      for (let y = 200; y <= 350; y++) {
        for (let x = 100; x <= 450; x++) {
          const idx = (y * width + x) * 4;
          pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
        }
      }

      // Ink in Right Column adjacent to divider: x = 520..800, y = 200..350
      for (let y = 200; y <= 350; y++) {
        for (let x = 520; x <= 800; x++) {
          const idx = (y * width + x) * 4;
          pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
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

      const layout: PageLayoutModel = {
        pageNum: 1,
        viewportWidth: width,
        viewportHeight: height,
        scale: 1,
        headerHeight: 0,
        footerHeight: height,
        columnCount: 2,
        columnGutterX: 500,
        lines: [],
        sections: [],
        questions: [
          {
            questionNum: 1,
            localQNum: 1,
            lineIndex: 0,
            columnIndex: 0,
            statementYstart: 100,
            statementYend: 150,
            diagramGapYstart: 150,
            diagramGapYend: 400,
            contentXmin: 50,
            contentXmax: 460,
            statementText: '1. Left column question'
          }
        ]
      };

      const result = DiagramCropperEngine.cropDiagram(
        mockCanvas,
        layout,
        undefined,
        { qNum: 1, localQNum: 1 }
      );

      expect(result).not.toBeNull();
      // Left column diagram crop MUST NOT cross or touch the gutter line at x=500!
      // Must stop <= 500 - 6 = 494
      expect(result!.cropX + result!.cropW).toBeLessThanOrEqual(494);
    });

    it('clamps bottom padding against fenceYmax so it never touches the next question statement', () => {
      const width = 800;
      const height = 1000;
      const pixelData = new Uint8ClampedArray(width * height * 4);
      pixelData.fill(255);

      // Question 1 diagram ending at y = 430
      for (let y = 300; y <= 430; y++) {
        for (let x = 100; x <= 400; x++) {
          const idx = (y * width + x) * 4;
          pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
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

      const layout: PageLayoutModel = {
        pageNum: 1,
        viewportWidth: width,
        viewportHeight: height,
        scale: 1,
        headerHeight: 0,
        footerHeight: height,
        columnCount: 1,
        lines: [],
        sections: [],
        questions: [
          {
            questionNum: 1,
            localQNum: 1,
            lineIndex: 0,
            statementYstart: 100,
            statementYend: 150,
            diagramGapYstart: 150,
            diagramGapYend: 450,
            contentXmin: 50,
            contentXmax: 400,
            statementText: '1. First question'
          },
          {
            questionNum: 2,
            localQNum: 2,
            lineIndex: 1,
            statementYstart: 460, // Next question statement baseline
            statementYend: 500,
            diagramGapYstart: 500,
            diagramGapYend: 700,
            contentXmin: 50,
            contentXmax: 400,
            statementText: '2. Next question statement'
          }
        ]
      };

      const result = DiagramCropperEngine.cropDiagram(
        mockCanvas,
        layout,
        undefined,
        { qNum: 1, localQNum: 1 }
      );

      expect(result).not.toBeNull();
      // computeDiagramFence puts fenceYmax at 460 - 24 = 436
      // crop bottom must be <= 436
      expect(result!.cropY + result!.cropH).toBeLessThanOrEqual(436);
    });

    it('Phase 4: strips option text lines at the bottom in AI-hint mode (swimming pool / vertical circle scenario)', () => {
      const width = 600;
      const height = 800;
      const pixelData = new Uint8ClampedArray(width * height * 4);
      pixelData.fill(255);

      // Diagram (e.g. circle / pool): Y=150..320, X=150..450
      for (let y = 150; y <= 320; y++) {
        for (let x = 150; x <= 450; x++) {
          const idx = (y * width + x) * 4;
          pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
        }
      }

      // Option Row 1 (1) 45 m   (2) 90 m: Y=350..375
      for (let y = 350; y <= 375; y++) {
        for (let x = 50; x <= 500; x++) {
          const idx = (y * width + x) * 4;
          pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
        }
      }

      // Option Row 2 (3) 125 m  (4) 25 m: Y=390..415
      for (let y = 390; y <= 415; y++) {
        for (let x = 50; x <= 500; x++) {
          const idx = (y * width + x) * 4;
          pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
        }
      }

      const mockCtx = {
        getImageData: () => ({ data: pixelData })
      } as any;

      // Gemini AI bbox that accidentally stretched down to 400 (into options)
      const rect = DiagramCropperEngine.detectCropRect(
        mockCtx,
        width,
        height,
        null,
        [150, 150, 400, 450] // bbox in pixel units
      );

      expect(rect).not.toBeNull();
      expect(rect!.strategyUsed).toBe('ai-hint');
      // Must capture the diagram at Y=150..320
      expect(rect!.cropY).toBeLessThanOrEqual(150);
      // Crop bottom MUST NOT include the options (Y + H < 345)
      expect(rect!.cropY + rect!.cropH).toBeLessThan(355);
      expect(rect!.cropY + rect!.cropH).toBeGreaterThanOrEqual(320);
    });

    it('Phase 4: strips top leaked metadata tag [JEEMAIN...] in AI-hint mode (concentric circles scenario)', () => {
      const width = 600;
      const height = 800;
      const pixelData = new Uint8ClampedArray(width * height * 4);
      pixelData.fill(255);

      // Metadata text band [JEEMAIN100423_S1]: Y=80..100, X=50..200
      for (let y = 80; y <= 100; y++) {
        for (let x = 50; x <= 200; x++) {
          const idx = (y * width + x) * 4;
          pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
        }
      }

      // Diagram (Concentric circles): Y=130..380, X=120..480
      for (let y = 130; y <= 380; y++) {
        for (let x = 120; x <= 480; x++) {
          const idx = (y * width + x) * 4;
          pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
        }
      }

      const mockCtx = {
        getImageData: () => ({ data: pixelData })
      } as any;

      // AI bbox that covers metadata and diagram
      const rect = DiagramCropperEngine.detectCropRect(
        mockCtx,
        width,
        height,
        null,
        [80, 50, 380, 480]
      );

      expect(rect).not.toBeNull();
      expect(rect!.strategyUsed).toBe('ai-hint');
      // Crop top must start at or below 120 (metadata at 80..100 stripped)
      expect(rect!.cropY).toBeGreaterThanOrEqual(100);
      expect(rect!.cropY).toBeLessThanOrEqual(130);
    });

    it('Phase 4: preserves diagram top when aiYmin starts above stmtFence', () => {
      const width = 600;
      const height = 800;
      const pixelData = new Uint8ClampedArray(width * height * 4);
      pixelData.fill(255);

      // Diagram (circle apex): Y=130..300, X=150..450
      for (let y = 130; y <= 300; y++) {
        for (let x = 150; x <= 450; x++) {
          const idx = (y * width + x) * 4;
          pixelData[idx] = 0; pixelData[idx+1] = 0; pixelData[idx+2] = 0; pixelData[idx+3] = 255;
        }
      }

      const mockCtx = {
        getImageData: () => ({ data: pixelData })
      } as any;

      const layout: PageLayoutModel = {
        pageNum: 1,
        viewportWidth: width,
        viewportHeight: height,
        scale: 1,
        headerHeight: 0,
        footerHeight: height,
        columnCount: 1,
        lines: [],
        sections: [],
        questions: [
          {
            questionNum: 1,
            localQNum: 1,
            lineIndex: 0,
            statementYstart: 60,
            statementYend: 145, // Overestimated statementYend
            diagramGapYstart: 145,
            diagramGapYend: 500,
            contentXmin: 50,
            contentXmax: 400,
            statementText: '1. Circle problem'
          }
        ]
      };

      // AI correctly sees diagram starts at 130
      const rect = DiagramCropperEngine.detectCropRect(
        mockCtx,
        width,
        height,
        layout,
        [130, 150, 300, 450],
        { qNum: 1, localQNum: 1 }
      );

      expect(rect).not.toBeNull();
      // Crop must not chop off top of circle (cropY must be <= 130)
      expect(rect!.cropY).toBeLessThanOrEqual(130);
    });

    it('Phase 5: trimHorizontalBleed prunes vertical column divider rule and stray left-column text (Q27, Q41, Q48 scenario)', () => {
      const width = 800;
      const height = 600;
      const pixelData = new Uint8ClampedArray(width * height * 4);
      pixelData.fill(255);

      // Stray text from left column at x = 100..115 (width = 16px)
      for (let y = 150; y <= 250; y++) {
        for (let x = 100; x <= 115; x++) {
          const idx = (y * width + x) * 4;
          pixelData[idx] = 0;
          pixelData[idx + 1] = 0;
          pixelData[idx + 2] = 0;
          pixelData[idx + 3] = 255;
        }
      }

      // Vertical column divider rule at x = 130..132 (width = 3px)
      for (let y = 100; y <= 400; y++) {
        for (let x = 130; x <= 132; x++) {
          const idx = (y * width + x) * 4;
          pixelData[idx] = 0;
          pixelData[idx + 1] = 0;
          pixelData[idx + 2] = 0;
          pixelData[idx + 3] = 255;
        }
      }

      // Main diagram at x = 160..350 (width = 191px)
      for (let y = 140; y <= 280; y++) {
        for (let x = 160; x <= 350; x++) {
          const idx = (y * width + x) * 4;
          pixelData[idx] = 0;
          pixelData[idx + 1] = 0;
          pixelData[idx + 2] = 0;
          pixelData[idx + 3] = 255;
        }
      }

      const profile = { inkThreshold: 185, hasColoredInk: true, minInkPixelsPerRow: 5, backgroundLum: 255, watermarkLum: 255 };
      const trimmed = DiagramCropperEngine.trimHorizontalBleed(
        pixelData,
        width,
        100,
        350,
        100,
        400,
        profile,
        true // isMultiColumn
      );

      // Must have trimmed both stray text (100..115) and divider line (130..132)
      // New minX should start at or after the gap at 133, right before the diagram at 160
      expect(trimmed.minX).toBeGreaterThanOrEqual(150);
      expect(trimmed.maxX).toBe(350);
    });

    it('Phase 5: detectCropRect stops cleanly above answerKeyYstart and never captures answer key table (Q50 scenario)', () => {
      const width = 800;
      const height = 1000;
      const pixelData = new Uint8ClampedArray(width * height * 4);
      pixelData.fill(255);

      // Q50 Statement text at y = 300..340
      // Q50 Diagram at y = 380..520
      for (let y = 380; y <= 520; y++) {
        for (let x = 150; x <= 350; x++) {
          const idx = (y * width + x) * 4;
          pixelData[idx] = 0;
          pixelData[idx + 1] = 0;
          pixelData[idx + 2] = 0;
          pixelData[idx + 3] = 255;
        }
      }

      // ANSWER KEY Banner at y = 600..630
      // Answer grid rows at y = 640..750
      for (let y = 600; y <= 750; y++) {
        for (let x = 50; x <= 750; x++) {
          const idx = (y * width + x) * 4;
          pixelData[idx] = 0;
          pixelData[idx + 1] = 0;
          pixelData[idx + 2] = 0;
          pixelData[idx + 3] = 255;
        }
      }

      const mockCtx = {
        getImageData: () => ({ data: pixelData })
      } as any;

      const layout: PageLayoutModel = {
        pageNum: 5,
        viewportWidth: width,
        viewportHeight: height,
        scale: 1,
        headerHeight: 0,
        footerHeight: 1000,
        columnCount: 1,
        lines: [
          { text: '50. The current in the circuit is', y: 320, anchorY: 320, minX: 50, maxX: 400, items: [] },
          { text: 'ANSWER KEY', y: 600, anchorY: 600, minX: 100, maxX: 300, items: [] }
        ],
        sections: [],
        questions: [
          {
            questionNum: 50,
            localQNum: 50,
            lineIndex: 0,
            statementYstart: 300,
            statementYend: 340,
            diagramGapYstart: 340,
            diagramGapYend: 580,
            contentXmin: 50,
            contentXmax: 400,
            statementText: '50. The current in the circuit is'
          }
        ],
        answerKeyYstart: 600
      };

      const rect = DiagramCropperEngine.detectCropRect(
        mockCtx,
        width,
        height,
        layout,
        undefined,
        { qNum: 50, localQNum: 50 }
      );

      expect(rect).not.toBeNull();
      // Crop bottom (cropY + cropH) must strictly stop ABOVE the answer key (y = 600)
      expect(rect!.cropY + rect!.cropH).toBeLessThanOrEqual(588);
      // And crop must capture the actual diagram at 380..520
      expect(rect!.cropY).toBeLessThanOrEqual(380);
      expect(rect!.cropY + rect!.cropH).toBeGreaterThanOrEqual(520);
    });
  });
});
