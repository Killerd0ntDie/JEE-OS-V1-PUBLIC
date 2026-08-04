import os
import re

files = [
    r'd:\JEE OS PLEASE HELP\jee-os (5)\jee-os (10)\src\features\mission\components\MissionCalibrationModal.tsx',
    r'd:\JEE OS PLEASE HELP\jee-os (5)\jee-os (10)\src\features\mission\components\MissionCompleteModal.tsx',
    r'd:\JEE OS PLEASE HELP\jee-os (5)\jee-os (10)\src\features\mission\components\MissionFormulaSheetModal.tsx',
    r'd:\JEE OS PLEASE HELP\jee-os (5)\jee-os (10)\src\features\mission\components\MissionNotesDrawer.tsx',
    r'd:\JEE OS PLEASE HELP\jee-os (5)\jee-os (10)\src\features\mission\components\MissionPauseOverlay.tsx',
    r'd:\JEE OS PLEASE HELP\jee-os (5)\jee-os (10)\src\features\mission\components\MissionTimeUpModal.tsx',
    r'd:\JEE OS PLEASE HELP\jee-os (5)\jee-os (10)\src\features\mission\components\SwapSubjectModal.tsx',
    r'd:\JEE OS PLEASE HELP\jee-os (5)\jee-os (10)\src\features\mistakes\components\AiInterrogationModal.tsx',
    r'd:\JEE OS PLEASE HELP\jee-os (5)\jee-os (10)\src\features\mistakes\components\LogMistakeModal.tsx',
    r'd:\JEE OS PLEASE HELP\jee-os (5)\jee-os (10)\src\features\mistakes\components\MistakeTestModal.tsx'
]

def replace_in_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Generic replace for ModalPortal
    content = content.replace("import { ModalPortal } from '@/components/ui/ModalPortal';", "import { Modal } from '@/components/ui/Modal';")
    content = content.replace("import { ModalPortal } from '@/components/ui/ModalPortal';\n", "import { Modal } from '@/components/ui/Modal';\n")

    if 'MissionCalibrationModal' in path:
        content = content.replace("if (!isCalibrating || !activeChap) return null;\n\n", "")
        content = content.replace(
            "<ModalPortal>\n    <div className=\"fixed inset-0 z-[110] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in\">\n      <div className=\"relative w-full max-w-md bg-[#090a0f] border border-indigo-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_0_80px_rgba(79,70,229,0.25)] text-left max-h-[90dvh] overflow-y-auto\">",
            "<Modal isOpen={isCalibrating && !!activeChap} onClose={() => {}} className=\"relative w-full max-w-md bg-[#090a0f] border border-indigo-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_0_80px_rgba(79,70,229,0.25)] text-left max-h-[90dvh] overflow-y-auto\">"
        )
        content = content.replace("      </div>\n    </div>\n    </ModalPortal>", "    </Modal>")
        
    elif 'MissionCompleteModal' in path:
        content = content.replace("import { motion, AnimatePresence } from 'framer-motion';\n", "")
        content = content.replace(
            "<ModalPortal>\n    <AnimatePresence>\n      {isCompleted && (\n        <motion.div\n          initial={{ opacity: 0 }}\n          animate={{ opacity: 1 }}\n          exit={{ opacity: 0 }}\n          className=\"fixed inset-0 z-[10000] bg-[#060607]/95 backdrop-blur-xl flex flex-col justify-center items-center text-center p-6\"\n        >",
            "<Modal isOpen={isCompleted} onClose={onNextSubject} className=\"max-w-lg space-y-8 relative z-10\">"
        )
        content = content.replace("          <div className=\"max-w-lg space-y-8 relative z-10\">", "<div>")
        content = content.replace("        </motion.div>\n      )}\n    </AnimatePresence>\n    </ModalPortal>", "    </Modal>")

    elif 'MissionFormulaSheetModal' in path:
        content = content.replace("import { motion, AnimatePresence } from 'framer-motion';\n", "")
        content = content.replace(
            "<ModalPortal>\n    <AnimatePresence>\n      {isFormulaOpen && (\n        <motion.div\n          initial={{ opacity: 0 }}\n          animate={{ opacity: 1 }}\n          exit={{ opacity: 0 }}\n          className=\"fixed inset-0 z-[110] bg-[#070708]/90 backdrop-blur-md flex items-center justify-center p-6\"\n        >\n          <motion.div\n            initial={{ scale: 0.95, y: 15 }}\n            animate={{ scale: 1, y: 0 }}\n            exit={{ scale: 0.95, y: 15 }}\n            className=\"w-full max-w-xl border border-zinc-800 bg-[#09090b] p-6 rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden\"\n          >",
            "<Modal isOpen={isFormulaOpen} onClose={() => setIsFormulaOpen(false)} className=\"w-full max-w-xl border border-zinc-800 bg-[#09090b] p-6 rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden\">"
        )
        content = content.replace("          </motion.div>\n        </motion.div>\n      )}\n    </AnimatePresence>\n    </ModalPortal>", "    </Modal>")

    elif 'MissionNotesDrawer' in path:
        content = content.replace("import { motion, AnimatePresence } from 'framer-motion';\n", "")
        content = content.replace("import { Modal } from '@/components/ui/Modal';", "import { Drawer } from '@/components/ui/Drawer';")
        content = content.replace(
            "<ModalPortal>\n    <AnimatePresence>\n      {isNotesOpen && (\n        <>\n          {/* Backdrop overlay */}\n          <motion.div\n            initial={{ opacity: 0 }}\n            animate={{ opacity: 1 }}\n            exit={{ opacity: 0 }}\n            onClick={() => setIsNotesOpen(false)}\n            className=\"fixed inset-0 bg-black/60 backdrop-blur-xs z-[110]\"\n          />\n          <motion.div\n            initial={{ x: '100%' }}\n            animate={{ x: 0 }}\n            exit={{ x: '100%' }}\n            transition={{ type: 'spring', stiffness: 350, damping: 30 }}\n            className=\"fixed right-0 top-0 bottom-0 z-[110] w-80 md:w-96 border-l border-zinc-800 bg-[#09090b] shadow-2xl flex flex-col justify-between\"\n          >",
            "<Drawer position=\"right\" isOpen={isNotesOpen} onClose={() => setIsNotesOpen(false)} className=\"w-80 md:w-96 border-l border-zinc-800 bg-[#09090b] shadow-2xl flex flex-col justify-between\">"
        )
        content = content.replace("          </motion.div>\n        </>\n      )}\n    </AnimatePresence>\n    </ModalPortal>", "    </Drawer>")

    elif 'MissionPauseOverlay' in path:
        content = content.replace("import { motion, AnimatePresence } from 'framer-motion';\n", "")
        content = content.replace(
            "<ModalPortal>\n    <AnimatePresence>\n      {isPaused && (\n        <motion.div\n          initial={{ opacity: 0 }}\n          animate={{ opacity: 1 }}\n          exit={{ opacity: 0 }}\n          className=\"fixed inset-0 z-[10000] bg-[#070708]/85 backdrop-blur-xl flex flex-col justify-center items-center text-center p-6\"\n        >\n          <div className=\"max-w-md space-y-6\">",
            "<Modal isOpen={isPaused} onClose={() => setIsPaused(false)} className=\"max-w-md space-y-6 text-center\">"
        )
        content = content.replace("          </div>\n        </motion.div>\n      )}\n    </AnimatePresence>\n    </ModalPortal>", "    </Modal>")

    elif 'MissionTimeUpModal' in path:
        content = content.replace("import { motion, AnimatePresence } from 'framer-motion';\n", "")
        content = content.replace(
            "<ModalPortal>\n    <AnimatePresence>\n      {isOpen && (\n        <motion.div\n          initial={{ opacity: 0 }}\n          animate={{ opacity: 1 }}\n          exit={{ opacity: 0 }}\n          className=\"fixed inset-0 z-[10000] bg-[#060607]/80 backdrop-blur-md flex flex-col justify-center items-center p-6\"\n        >\n          <div\n            role=\"dialog\"\n            aria-modal=\"true\"\n            aria-labelledby=\"mission-time-up-modal-title\"\n            className=\"max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6 text-left\"\n          >",
            "<Modal isOpen={isOpen} onClose={onComplete} className=\"max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6 text-left\">"
        )
        content = content.replace("          </div>\n        </motion.div>\n      )}\n    </AnimatePresence>\n    </ModalPortal>", "    </Modal>")

    elif 'SwapSubjectModal' in path:
        content = content.replace("if (!isOpen || !mission) return null;\n\n", "if (!mission) return null;\n\n")
        content = content.replace(
            "<ModalPortal>\n      <div className=\"fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200\">\n        <div \n          role=\"dialog\"\n          aria-modal=\"true\"\n          className=\"relative bg-[#09090b] border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl z-50 text-left space-y-5\"\n        >",
            "<Modal isOpen={isOpen} onClose={onClose} className=\"relative bg-[#09090b] border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl z-50 text-left space-y-5\">"
        )
        content = content.replace("        </div>\n      </div>", "      </Modal>")
        content = content.replace("</ModalPortal>", "")
        content = content.replace("<Modal isOpen={isOpen}", "<ModalPortal>\n    <Modal isOpen={isOpen}")
        content = content.replace("      </Modal>\n\n      {/* Hold", "      </Modal>\n\n      {/* Hold")
        # Ensure we don't mess up with the extra ModalPortal at the end
        if content.count("<ModalPortal>") > 0 and content.count("</ModalPortal>") == 0:
            content += "\n</ModalPortal>\n"

    elif 'AiInterrogationModal' in path:
        content = content.replace("import { motion, AnimatePresence } from 'motion/react';\n", "")
        content = content.replace(
            "<ModalPortal>\n      <AnimatePresence>\n        {isOpen && mistake && (\n          <motion.div \n            initial={{ opacity: 0 }}\n            animate={{ opacity: 1 }}\n            exit={{ opacity: 0 }}\n            className=\"fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-2 sm:p-6 text-left\"\n          >\n            <motion.div\n              initial={{ opacity: 0, scale: 0.95, y: 10 }}\n              animate={{ opacity: 1, scale: 1, y: 0 }}\n              exit={{ opacity: 0, scale: 0.95, y: 10 }}\n              transition={{ type: 'spring', damping: 25, stiffness: 300 }}\n              role=\"dialog\"\n              aria-modal=\"true\"\n              className=\"w-full h-full max-w-5xl rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(220,38,38,0.15)] flex flex-col bg-[#09090b] border border-red-900/50\"\n            >",
            "<Modal isOpen={isOpen && !!mistake} onClose={handleClose} className=\"w-full h-[90vh] max-w-5xl rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(220,38,38,0.15)] flex flex-col bg-[#09090b] border border-red-900/50\">"
        )
        content = content.replace("          </motion.div>\n          </motion.div>\n        )}\n      </AnimatePresence>\n    </ModalPortal>", "    </Modal>")

    elif 'LogMistakeModal' in path:
        content = content.replace("import { motion } from 'motion/react';\n", "")
        content = content.replace("if (!isOpen) return null;\n\n", "")
        content = content.replace(
            "<ModalPortal>\n    <div className=\"fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto\">\n      <motion.div\n        role=\"dialog\"\n        aria-modal=\"true\"\n        aria-labelledby=\"log-mistake-modal-title\"\n        initial={{ opacity: 0, scale: 0.95, y: 10 }}\n        animate={{ opacity: 1, scale: 1, y: 0 }}\n        className=\"w-full max-w-2xl bg-zinc-950 border border-zinc-850 rounded-2xl shadow-2xl overflow-hidden my-8 text-left\"\n      >",
            "<Modal isOpen={isOpen} onClose={onClose} className=\"w-full max-w-2xl bg-zinc-950 border border-zinc-850 rounded-2xl shadow-2xl overflow-hidden my-8 text-left\">"
        )
        content = content.replace("      </motion.div>\n    </div>\n    </ModalPortal>", "    </Modal>")

    elif 'MistakeTestModal' in path:
        content = content.replace("import { motion, AnimatePresence } from 'motion/react';\n", "import { motion, AnimatePresence } from 'motion/react';\n")
        content = content.replace("if (!isOpen) return null;\n\n", "")
        content = content.replace(
            "<ModalPortal>\n      <div className=\"fixed inset-0 z-[9999] bg-[#09090b] flex flex-col font-sans animate-in fade-in duration-300 overflow-hidden\">\n        <div\n          className=\"w-full h-full flex flex-col\"\n        >",
            "<Modal isOpen={isOpen} onClose={onClose} className=\"w-full h-[90vh] bg-[#09090b] flex flex-col font-sans overflow-hidden\">\n<div className=\"w-full h-full flex flex-col\">"
        )
        content = content.replace("        </div>\n      </div>\n    </ModalPortal>", "</div>\n</Modal>")
        
    # Extra check for framer-motion empty import
    content = content.replace("import { motion, AnimatePresence } from 'framer-motion';\n", "")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

for file in files:
    try:
        replace_in_file(file)
        print(f'Successfully processed {file}')
    except Exception as e:
        print(f'Error processing {file}: {e}')
