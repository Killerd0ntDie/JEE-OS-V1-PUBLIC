const fs = require('fs');

const content = fs.readFileSync('src/features/mission/PlannerPage.tsx', 'utf-8');
const lines = content.split('\n');

let startIdx = -1;
let endIdx = -1;
let targetIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("{/* TELEMETRY & BOTTLENECK SUMMARY BAR")) {
        startIdx = i;
    }
    if (lines[i].includes("{/* SCHEDULE & STRATEGY MATRIX CONTAINER */}")) {
        endIdx = i;
    }
    if (lines[i].includes("{/* 3. MONTHLY STRATEGY VIEW MODE */}")) {
        targetIdx = i;
    }
}

if (startIdx !== -1 && endIdx !== -1 && targetIdx !== -1) {
    const block = lines.slice(startIdx, endIdx);
    lines.splice(startIdx, endIdx - startIdx);
    
    // Recalculate targetIdx
    targetIdx -= (endIdx - startIdx);
    
    // Find <div className="space-y-6"> after targetIdx
    let insertIdx = -1;
    for (let i = targetIdx; i < lines.length; i++) {
        if (lines[i].includes('className="space-y-6"')) {
            insertIdx = i + 1;
            break;
        }
    }
    
    if (insertIdx !== -1) {
        lines.splice(insertIdx, 0, ...block);
        fs.writeFileSync('src/features/mission/PlannerPage.tsx', lines.join('\n'), 'utf-8');
        console.log("SUCCESS");
    } else {
        console.log("FAILED TO FIND INSERT IDX");
    }
} else {
    console.log(`FAILED: start=${startIdx}, end=${endIdx}, target=${targetIdx}`);
}
