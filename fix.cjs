const fs = require('fs');
const filePath = 'd:/JEE OS PLEASE HELP/jee-os (5)/jee-os (10)/src/features/mockTests/services/OfflineMockBank.ts';
let content = fs.readFileSync(filePath, 'utf8');

const oldMcqLoop = `    // Add MCQs
    for (let i = 0; i < mcqCount; i++) {
      const base = mcqPool[i % mcqPool.length];
      selected.push({
        ...base,
        id: \`offline_subj_mcq_\${Date.now()}_\${i}\`
      });
    }`;

const newMcqLoop = `    // Add MCQs — cap at pool size to prevent duplicate questions
    const actualMcqCount = Math.min(mcqCount, mcqPool.length);
    if (actualMcqCount < mcqCount) {
      console.warn(\`[OfflineMockBank] Only \${mcqPool.length} MCQs available for \${subject}, requested \${mcqCount}. Capping to prevent duplicates.\`);
    }
    for (let i = 0; i < actualMcqCount; i++) {
      const base = mcqPool[i];
      selected.push({
        ...base,
        id: \`offline_subj_mcq_\${Date.now()}_\${i}\`
      });
    }`;

content = content.replace(oldMcqLoop, newMcqLoop);

const oldNumLoop = `    // Add Numericals
    for (let i = 0; i < numCount; i++) {
      const base = numPool[i % numPool.length];
      selected.push({
        ...base,
        id: \`offline_subj_num_\${Date.now()}_\${i}\`
      });
    }`;

const newNumLoop = `    // Add Numericals — cap at pool size to prevent duplicate questions
    const actualNumCount = Math.min(numCount, numPool.length);
    if (actualNumCount < numCount) {
      console.warn(\`[OfflineMockBank] Only \${numPool.length} Numericals available for \${subject}, requested \${numCount}. Capping to prevent duplicates.\`);
    }
    for (let i = 0; i < actualNumCount; i++) {
      const base = numPool[i];
      selected.push({
        ...base,
        id: \`offline_subj_num_\${Date.now()}_\${i}\`
      });
    }`;

content = content.replace(oldNumLoop, newNumLoop);

content = content.replace(/(type:\s*'NUMERICAL',[\s\S]*?)marks:\s*\{\s*correct:\s*4,\s*incorrect:\s*-1\s*\}/g, '$1marks: { correct: 4, incorrect: 0 }');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
