const fs = require('fs');

const files = [
    'd:/JEE OS PLEASE HELP/jee-os (5)/jee-os (10)/src/features/mission/components/MissionCalibrationModal.tsx',
    'd:/JEE OS PLEASE HELP/jee-os (5)/jee-os (10)/src/features/mission/components/MissionCompleteModal.tsx',
    'd:/JEE OS PLEASE HELP/jee-os (5)/jee-os (10)/src/features/mission/components/MissionFormulaSheetModal.tsx',
    'd:/JEE OS PLEASE HELP/jee-os (5)/jee-os (10)/src/features/mission/components/MissionNotesDrawer.tsx',
    'd:/JEE OS PLEASE HELP/jee-os (5)/jee-os (10)/src/features/mission/components/MissionPauseOverlay.tsx',
    'd:/JEE OS PLEASE HELP/jee-os (5)/jee-os (10)/src/features/mission/components/MissionTimeUpModal.tsx',
    'd:/JEE OS PLEASE HELP/jee-os (5)/jee-os (10)/src/features/mission/components/SwapSubjectModal.tsx',
    'd:/JEE OS PLEASE HELP/jee-os (5)/jee-os (10)/src/features/mistakes/components/AiInterrogationModal.tsx',
    'd:/JEE OS PLEASE HELP/jee-os (5)/jee-os (10)/src/features/mistakes/components/LogMistakeModal.tsx',
    'd:/JEE OS PLEASE HELP/jee-os (5)/jee-os (10)/src/features/mistakes/components/MistakeTestModal.tsx'
];

function replaceInFile(path) {
    let content = fs.readFileSync(path, 'utf-8');
    content = content.replace(/\r\n/g, '\n'); // Normalize line endings

    content = content.replace(/import \{ ModalPortal \} from '@\/components\/ui\/ModalPortal';/g, "import { Modal } from '@/components/ui/Modal';");
    
    if (path.includes('MissionCalibrationModal')) {
        content = content.replace("if (!isCalibrating || !activeChap) return null;\n\n", "");
        content = content.replace(
            /<ModalPortal>\s*<div className="fixed inset-0 z-\[110\] bg-black\/90 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in">\s*<div className="relative w-full max-w-md bg-\[#090a0f\] border border-indigo-500\/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-\[0_0_80px_rgba\(79,70,229,0\.25\)\] text-left max-h-\[90dvh\] overflow-y-auto">/,
            "<Modal isOpen={isCalibrating && !!activeChap} onClose={() => {}} className=\"relative w-full max-w-md bg-[#090a0f] border border-indigo-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_0_80px_rgba(79,70,229,0.25)] text-left max-h-[90dvh] overflow-y-auto\">"
        );
        content = content.replace(/\s*<\/div>\s*<\/div>\s*<\/ModalPortal>/, "\n    </Modal>");
        
    } else if (path.includes('MissionCompleteModal')) {
        content = content.replace(/import \{ motion, AnimatePresence \} from 'framer-motion';\n/g, "");
        content = content.replace(
            /<ModalPortal>[\s\S]*?<AnimatePresence>[\s\S]*?\{isCompleted && \([\s\S]*?<motion\.div[\s\S]*?className="fixed inset-0 z-\[10000\] bg-\[#060607\]\/95 backdrop-blur-xl flex flex-col justify-center items-center text-center p-6"[\s\S]*?>/,
            "<Modal isOpen={isCompleted} onClose={onNextSubject} className=\"max-w-lg space-y-8 relative z-10 w-full bg-transparent border-none shadow-none text-center\">"
        );
        content = content.replace(/<div className="max-w-lg space-y-8 relative z-10">/, "<div>");
        content = content.replace(/\s*<\/motion\.div>\s*\)\}\s*<\/AnimatePresence>\s*<\/ModalPortal>/, "\n    </Modal>");

    } else if (path.includes('MissionFormulaSheetModal')) {
        content = content.replace(/import \{ motion, AnimatePresence \} from 'framer-motion';\n/g, "");
        content = content.replace(
            /<ModalPortal>[\s\S]*?<AnimatePresence>[\s\S]*?\{isFormulaOpen && \([\s\S]*?<motion\.div[\s\S]*?className="fixed inset-0 z-\[110\] bg-\[#070708\]\/90 backdrop-blur-md flex items-center justify-center p-6"[\s\S]*?>[\s\S]*?<motion\.div[\s\S]*?className="w-full max-w-xl border border-zinc-800 bg-\[#09090b\] p-6 rounded-2xl shadow-2xl flex flex-col max-h-\[80vh\] overflow-hidden"[\s\S]*?>/,
            "<Modal isOpen={isFormulaOpen} onClose={() => setIsFormulaOpen(false)} className=\"w-full max-w-xl border border-zinc-800 bg-[#09090b] p-6 rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden\">"
        );
        content = content.replace(/\s*<\/motion\.div>\s*<\/motion\.div>\s*\)\}\s*<\/AnimatePresence>\s*<\/ModalPortal>/, "\n    </Modal>");

    } else if (path.includes('MissionNotesDrawer')) {
        content = content.replace(/import \{ motion, AnimatePresence \} from 'framer-motion';\n/g, "");
        content = content.replace("import { Modal } from '@/components/ui/Modal';", "import { Drawer } from '@/components/ui/Drawer';");
        content = content.replace(
            /<ModalPortal>[\s\S]*?<AnimatePresence>[\s\S]*?\{isNotesOpen && \([\s\S]*?<>[\s\S]*?<motion\.div[\s\S]*?className="fixed inset-0 bg-black\/60 backdrop-blur-xs z-\[110\]"[\s\S]*?\/>[\s\S]*?<motion\.div[\s\S]*?className="fixed right-0 top-0 bottom-0 z-\[110\] w-80 md:w-96 border-l border-zinc-800 bg-\[#09090b\] shadow-2xl flex flex-col justify-between"[\s\S]*?>/,
            "<Drawer position=\"right\" isOpen={isNotesOpen} onClose={() => setIsNotesOpen(false)} className=\"w-80 md:w-96 border-l border-zinc-800 bg-[#09090b] shadow-2xl flex flex-col justify-between\">"
        );
        content = content.replace(/\s*<\/motion\.div>\s*<\/>\s*\)\}\s*<\/AnimatePresence>\s*<\/ModalPortal>/, "\n    </Drawer>");

    } else if (path.includes('MissionPauseOverlay')) {
        content = content.replace(/import \{ motion, AnimatePresence \} from 'framer-motion';\n/g, "");
        content = content.replace(
            /<ModalPortal>[\s\S]*?<AnimatePresence>[\s\S]*?\{isPaused && \([\s\S]*?<motion\.div[\s\S]*?className="fixed inset-0 z-\[10000\] bg-\[#070708\]\/85 backdrop-blur-xl flex flex-col justify-center items-center text-center p-6"[\s\S]*?>[\s\S]*?<div className="max-w-md space-y-6">/,
            "<Modal isOpen={isPaused} onClose={() => setIsPaused(false)} className=\"max-w-md space-y-6 text-center w-full bg-transparent border-none shadow-none\">"
        );
        content = content.replace(/\s*<\/div>\s*<\/motion\.div>\s*\)\}\s*<\/AnimatePresence>\s*<\/ModalPortal>/, "\n    </Modal>");

    } else if (path.includes('MissionTimeUpModal')) {
        content = content.replace(/import \{ motion, AnimatePresence \} from 'framer-motion';\n/g, "");
        content = content.replace(
            /<ModalPortal>[\s\S]*?<AnimatePresence>[\s\S]*?\{isOpen && \([\s\S]*?<motion\.div[\s\S]*?className="fixed inset-0 z-\[10000\] bg-\[#060607\]\/80 backdrop-blur-md flex flex-col justify-center items-center p-6"[\s\S]*?>[\s\S]*?<div[\s\S]*?className="max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6 text-left"[\s\S]*?>/,
            "<Modal isOpen={isOpen} onClose={onComplete} className=\"max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6 text-left\">"
        );
        content = content.replace(/\s*<\/div>\s*<\/motion\.div>\s*\)\}\s*<\/AnimatePresence>\s*<\/ModalPortal>/, "\n    </Modal>");

    } else if (path.includes('SwapSubjectModal')) {
        content = content.replace(/if \(!isOpen \|\| !mission\) return null;\n\n/g, "if (!mission) return null;\n\n");
        content = content.replace(
            /<ModalPortal>[\s\S]*?<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black\/80 backdrop-blur-md animate-in fade-in duration-200">[\s\S]*?<div\s+role="dialog"\s+aria-modal="true"\s+className="relative bg-\[#09090b\] border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl z-50 text-left space-y-5">/,
            "<Modal isOpen={isOpen} onClose={onClose} className=\"relative bg-[#09090b] border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl z-50 text-left space-y-5\">"
        );
        content = content.replace(/\s*<\/div>\s*<\/div>\s*(?:<\/ModalPortal>|)/, "\n      </Modal>");
        content = content.replace(/<Modal isOpen=\{isOpen\}/g, "<ModalPortal>\n    <Modal isOpen={isOpen}");
        
        // Final cleanup for dangling ModalPortals at the end of SwapSubjectModal if they exist incorrectly
        content = content.replace(/<\/Modal>\s*<\/ModalPortal>\s*<\/ModalPortal>/, "      </Modal>\n    </ModalPortal>");

    } else if (path.includes('AiInterrogationModal')) {
        content = content.replace(/import \{ motion, AnimatePresence \} from 'motion\/react';\n/g, "");
        content = content.replace(
            /<ModalPortal>[\s\S]*?<AnimatePresence>[\s\S]*?\{isOpen && mistake && \([\s\S]*?<motion\.div[\s\S]*?className="fixed inset-0 z-\[100\] flex items-center justify-center bg-black\/60 backdrop-blur-xl p-2 sm:p-6 text-left"[\s\S]*?>[\s\S]*?<motion\.div[\s\S]*?className="w-full h-full max-w-5xl rounded-3xl overflow-hidden shadow-\[0_0_80px_rgba\(220,38,38,0\.15\)\] flex flex-col bg-\[#09090b\] border border-red-900\/50"[\s\S]*?>/,
            "<Modal isOpen={isOpen && !!mistake} onClose={handleClose} className=\"w-full h-[90vh] max-w-5xl rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(220,38,38,0.15)] flex flex-col bg-[#09090b] border border-red-900/50\">"
        );
        content = content.replace(/\s*<\/motion\.div>\s*<\/motion\.div>\s*\)\}\s*<\/AnimatePresence>\s*<\/ModalPortal>/, "\n    </Modal>");

    } else if (path.includes('LogMistakeModal')) {
        content = content.replace(/import \{ motion \} from 'motion\/react';\n/g, "");
        content = content.replace(/if \(!isOpen\) return null;\n\n/g, "");
        content = content.replace(
            /<ModalPortal>[\s\S]*?<div className="fixed inset-0 bg-black\/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">[\s\S]*?<motion\.div[\s\S]*?className="w-full max-w-2xl bg-zinc-950 border border-zinc-850 rounded-2xl shadow-2xl overflow-hidden my-8 text-left"[\s\S]*?>/,
            "<Modal isOpen={isOpen} onClose={onClose} className=\"w-full max-w-2xl bg-zinc-950 border border-zinc-850 rounded-2xl shadow-2xl overflow-hidden my-8 text-left\">"
        );
        content = content.replace(/\s*<\/motion\.div>\s*<\/div>\s*<\/ModalPortal>/, "\n    </Modal>");

    } else if (path.includes('MistakeTestModal')) {
        content = content.replace(/import \{ motion, AnimatePresence \} from 'motion\/react';\n/g, "import { motion, AnimatePresence } from 'framer-motion';\n");
        content = content.replace(/if \(!isOpen\) return null;\n\n/g, "");
        content = content.replace(
            /<ModalPortal>[\s\S]*?<div className="fixed inset-0 z-\[9999\] bg-\[#09090b\] flex flex-col font-sans animate-in fade-in duration-300 overflow-hidden">[\s\S]*?<div[\s\S]*?className="w-full h-full flex flex-col"[\s\S]*?>/,
            "<Modal isOpen={isOpen} onClose={onClose} className=\"w-full h-[90vh] bg-[#09090b] flex flex-col font-sans overflow-hidden\">\n<div className=\"w-full h-full flex flex-col\">"
        );
        content = content.replace(/\s*<\/div>\s*<\/div>\s*<\/ModalPortal>/, "\n</div>\n</Modal>");
    }

    fs.writeFileSync(path, content, 'utf-8');
}

files.forEach(file => {
    try {
        replaceInFile(file);
        console.log(`Successfully processed ${file}`);
    } catch (e) {
        console.error(`Error processing ${file}:`, e);
    }
});
