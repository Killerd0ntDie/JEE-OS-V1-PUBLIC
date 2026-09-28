/**
 * scripts/verify-storage-prefix.ts
 * 
 * CI verification script:
 * 1. Scans all files in `src/` to verify that EVERY storage key starts with 'jeeos_'.
 * 2. Checks that `src/components/` and `src/features/` do NOT contain raw `localStorage` or `sessionStorage` calls.
 * 
 * Exits with code 1 if any violation is detected.
 */

import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.resolve(process.cwd(), 'src');
const STORAGE_PREFIX = 'jeeos_';

interface Violation {
  file: string;
  line: number;
  type: 'UNPREFIXED_KEY' | 'RAW_STORAGE_IN_COMPONENT';
  detail: string;
}

const violations: Violation[] = [];

// Whitelist of allowed test fixtures or legacy mirrors that explicitly verify compatibility
const ALLOWED_RAW_STORAGE_FILES = [
  'StorageAdapter.ts',
  'storageUtils.ts',
  'test',
  '.test.',
  'spec.'
];

function isAllowedRawStorageFile(filePath: string): boolean {
  return ALLOWED_RAW_STORAGE_FILES.some(pattern => filePath.includes(pattern));
}

function walkDir(dir: string, fileList: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        walkDir(fullPath, fileList);
      }
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allFiles = walkDir(SRC_DIR);

for (const file of allFiles) {
  const relPath = path.relative(process.cwd(), file).replace(/\\/g, '/');
  const isComponentOrFeature = relPath.startsWith('src/components/') || relPath.startsWith('src/features/') || relPath.startsWith('src/providers/');
  const isTest = file.includes('.test.') || file.includes('.spec.');
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Check 1: Raw localStorage or sessionStorage in src/components or src/features (non-test files)
    if (isComponentOrFeature && !isTest && !isAllowedRawStorageFile(file)) {
      if (/\b(localStorage|sessionStorage)\.(getItem|setItem|removeItem|clear)\b/.test(line)) {
        violations.push({
          file: relPath,
          line: lineNum,
          type: 'RAW_STORAGE_IN_COMPONENT',
          detail: line.trim()
        });
      }
    }

    // Check 2: Unprefixed storage keys across src/
    if (isAllowedRawStorageFile(file)) {
      return;
    }

    // Match storageAdapter, localStorage, sessionStorage, idb calls with literal string arguments
    const storageCallRegex = /(?:storageAdapter|localStorage|sessionStorage|idbGet|idbSet)\s*\.\s*(?:getItem|setItem|removeItem|hasItem|getSession|setSession|removeSession)\s*\(\s*(['"`])([^'"`]+)\1/g;
    let match: RegExpExecArray | null;
    while ((match = storageCallRegex.exec(line)) !== null) {
      const key = match[2];
      // Check if key is a literal and does not start with jeeos_
      // Ignore template literals that start with jeeos_ like `jeeos_mission_state_${id}`
      if (!key.startsWith(STORAGE_PREFIX)) {
        // Exclude allowed legacy fallback test keys if in test files
        if (isTest && (key === 'syllabusViewMode' || key === 'pendingCoachPrompt' || key === 'gemini_api_key')) {
          continue;
        }
        violations.push({
          file: relPath,
          line: lineNum,
          type: 'UNPREFIXED_KEY',
          detail: `Key "${key}" must begin with "${STORAGE_PREFIX}" (Line: ${line.trim()})`
        });
      }
    }
  });
}

console.log('====================================================');
console.log('JEE OS Architectural Storage Guardrails Audit');
console.log('====================================================');
console.log(`Scanned ${allFiles.length} TypeScript source files in src/`);

if (violations.length > 0) {
  console.error(`\n❌ Found ${violations.length} architectural storage violations:\n`);
  for (const v of violations) {
    console.error(`  [${v.type}] ${v.file}:${v.line}`);
    console.error(`    -> ${v.detail}\n`);
  }
  console.error('Please route all storage operations through StorageAdapter and ensure all keys begin with "jeeos_".');
  process.exit(1);
} else {
  console.log('\n✅ All storage keys strictly conform to "jeeos_" prefix.');
  console.log('✅ No raw localStorage/sessionStorage usage found in components or features.');
  console.log('====================================================\n');
  process.exit(0);
}
