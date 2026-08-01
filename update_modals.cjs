const fs = require('fs');
const files = [
  'src/components/shared/AiRevisionPlanModal.tsx',
  'src/components/ui/ConfirmDeleteModal.tsx',
  'src/features/mission/components/EditWeeklyGoalsModal.tsx',
  'src/features/mission/components/MissionCalibrationModal.tsx',
  'src/features/mission/components/MissionCompleteModal.tsx',
  'src/features/mission/components/MissionFormulaSheetModal.tsx',
  'src/features/mission/components/MissionTimeUpModal.tsx',
  'src/features/mistakes/components/MistakeTestModal.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('useLockBodyScroll(')) return;
  
  const depth = file.split('/').length - 2; 
  const prefix = '../'.repeat(depth);
  const importStmt = 'import { useLockBodyScroll } from \'' + prefix + 'hooks/useLockBodyScroll\';\n';
  
  const lastImportIndex = content.lastIndexOf('import ');
  const endOfLastImport = content.indexOf('\n', lastImportIndex) + 1;
  content = content.slice(0, endOfLastImport) + importStmt + content.slice(endOfLastImport);
  
  // Safe string replacement
  const regex = /(export function [a-zA-Z0-9_]+\s*\([^)]*\)\s*\{)/;
  const match = content.match(regex);
  if (match) {
     const replacement = match[1] + '\n  useLockBodyScroll(isOpen || false);\n';
     content = content.replace(regex, replacement);
  }
  
  fs.writeFileSync(file, content);
  console.log('Updated', file);
});
