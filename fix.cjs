const fs = require('fs');

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
        
        // Fix the bug: const chapters = useStudyBrainStore(state => chapters);
        // Should be: const chapters = useStudyBrainStore(state => state.chapters);
        
        content = content.replace(/const ([a-zA-Z0-9_]+) = useStudyBrainStore\(state => \1\);/g, "const $1 = useStudyBrainStore(state => state.$1);");
        
        fs.writeFileSync(file_path, content, 'utf-8');
        console.log(`Fixed: ${file_path}`);
    } catch (e) {
        console.error(`Error processing ${file_path}: ${e.message}`);
    }
}
