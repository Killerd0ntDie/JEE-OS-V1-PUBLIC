const fs = require('fs');
const path = require('path');

const files = [
    "src/components/mentor/ChapterRevisionInspectorModal.tsx",
    "src/components/mentor/DailyCheckinCard.tsx",
    "src/components/mentor/MentorInterviewModal.tsx",
    "src/components/mentor/MonthlyObjectiveModal.tsx",
    "src/components/mentor/SyllabusDiagnosisModal.tsx",
    "src/components/mentor/WeeklyCheckinModal.tsx",
    "src/components/shared/AiRevisionPlanModal.tsx",
    "src/components/shared/ChapterEditModal.tsx",
    "src/components/ui/ToastProvider.tsx",
    "src/features/mission/components/CustomMissionModal.tsx",
    "src/features/mission/components/SwapSubjectModal.tsx",
    "src/features/mistakes/components/AiInterrogationModal.tsx"
];

for (const file_path of files) {
    try {
        let content = fs.readFileSync(file_path, 'utf-8');

        // 1. Replace the import
        content = content.replace(/import\s+\{[^}]*useStudyBrain[^}]*\}\s+from\s+['"][^'"]+['"];?/g, "import { useStudyBrainStore } from '@/store/useStudyBrainStore';");

        const needs_runtime = content.includes("runtime") && !content.includes("StudyBrainRuntime");

        // Find the destructuring line
        const destruct_pattern = /const\s+\{([^}]+)\}\s*=\s*useStudyBrain\(\);/;
        const match = content.match(destruct_pattern);
        
        if (match) {
            const destruct_inner = match[1];
            const has_actions = destruct_inner.includes("actions");
            const has_runtime = destruct_inner.includes("runtime");

            // Find all state.SOMETHING usage
            const state_props = new Set();
            const stateRegex = /state\.([a-zA-Z0-9_]+)/g;
            let regexMatch;
            while ((regexMatch = stateRegex.exec(content)) !== null) {
                state_props.add(regexMatch[1]);
            }
            
            const replacement_lines = [];
            if (has_actions) {
                replacement_lines.push("const actions = useStudyBrainStore(state => state.actions);");
            }
            
            for (const prop of Array.from(state_props).sort()) {
                replacement_lines.push(`const ${prop} = useStudyBrainStore(state => state.${prop});`);
            }
                
            if (has_runtime || (needs_runtime && !content.includes("StudyBrainRuntime"))) {
                replacement_lines.push("const runtime = StudyBrainRuntime.getInstance();");
                if (!content.includes("import { StudyBrainRuntime }")) {
                    content = "import { StudyBrainRuntime } from '@/runtime/StudyBrainRuntime';\n" + content;
                }
            }

            const replacement = replacement_lines.join("\n  ");
            
            // Replace the destructuring line
            content = content.replace(destruct_pattern, replacement);
            
            // Replace `state.xyz` with `xyz`
            for (const prop of state_props) {
                content = content.replace(new RegExp(`state\\.${prop}\\b`, 'g'), prop);
            }
                
            fs.writeFileSync(file_path, content, 'utf-8');
            console.log(`Refactored: ${file_path}`);
        } else {
            console.log(`No useStudyBrain() call found in ${file_path}`);
        }
    } catch (e) {
        console.error(`Error processing ${file_path}: ${e.message}`);
    }
}
