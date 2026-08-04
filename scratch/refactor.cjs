const fs = require('fs');
const path = require('path');

const files = [
    'src/components/mentor/AiPracticeModal.tsx',
    'src/components/mentor/ChapterRevisionInspectorModal.tsx',
    'src/components/mentor/MentorInterviewModal.tsx',
    'src/components/mentor/MonthlyObjectiveModal.tsx',
    'src/components/mentor/SyllabusDiagnosisModal.tsx',
    'src/components/mentor/WeeklyCheckinModal.tsx',
    'src/components/shared/AiRevisionPlanModal.tsx',
    'src/components/shared/ChapterEditModal.tsx',
    'src/components/shared/HoldNotificationModal.tsx',
    'src/components/ui/ConfirmDeleteModal.tsx'
];

function processFile(filePath) {
    filePath = path.resolve(__dirname, '..', filePath.replace(/\\/g, '/'));
    let content = fs.readFileSync(filePath, 'utf8');

    // 1 & 2: Import Modal, remove ModalPortal
    content = content.replace(/import\s+\{\s*ModalPortal\s*\}\s*from\s+['"]@\/components\/ui\/ModalPortal['"];/g, "import { Modal } from '@/components/ui/Modal';");
    content = content.replace(/import\s+\{\s*ModalPortal\s*\}\s*from\s+['"]\.\/ModalPortal['"];/g, "import { Modal } from '@/components/ui/Modal';");
    
    // Fallback if ModalPortal wasn't there but we need Modal
    if (!content.includes("import { Modal }")) {
        content = "import { Modal } from '@/components/ui/Modal';\n" + content;
    }

    // 3: Remove `if (!isOpen) return null;`
    content = content.replace(/^\s*if\s*\(\!isOpen\)\s*return\s*null;\s*$/gm, '');
    content = content.replace(/if\s*\(\!isOpen\s*\|\|\s*\!chapterId\)\s*return\s*null;/g, 'if (!chapterId) return null;');
    content = content.replace(/if\s*\(\!isOpen\s*\|\|\s*\!chapter\)\s*return\s*null;/g, 'if (!chapter) return null;');
    content = content.replace(/if\s*\(\!effectiveIsOpen\s*\|\|\s*\!chapter\)\s*return\s*null;/g, 'if (!chapter) return null;');
    
    // Remove ModalPortal wrapper
    content = content.replace(/<ModalPortal>/g, '');
    content = content.replace(/<\/ModalPortal>/g, '');
    
    // Remove AnimatePresence wrappers if present
    content = content.replace(/<AnimatePresence>/g, '');
    content = content.replace(/<\/AnimatePresence>/g, '');
    
    // Remove motion backdrop
    content = content.replace(/<motion\.div\s+initial=\{\{\s*opacity:\s*0\s*\}\}\s+animate=\{\{\s*opacity:\s*1\s*\}\}\s+exit=\{\{\s*opacity:\s*0\s*\}\}([\s\S]*?)className="absolute\s+inset-0([^"]*)"\s*\/>/g, '');
    
    // MentorInterviewModal explicit backdrop
    content = content.replace(/<motion\.div\s+initial=\{\{\s*opacity:\s*0\s*\}\}\s+animate=\{\{\s*opacity:\s*1\s*\}\}\s+exit=\{\{\s*opacity:\s*0\s*\}\}\s+className="absolute\s+inset-0([^"]*)"\s*\/>/g, '');

    // Now process the outer wrapper and inner wrapper
    // We'll look for `<div className="fixed inset-0...` or `<motion.div className="fixed inset-0...`
    
    const fixedRegex = /<div\s+className="(fixed\s+inset-0[^"]*)"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/(?:ModalPortal|AnimatePresence)>|\);)/g;
    
    // Actually it's easier to do this by analyzing the specific structure:
    // Most files:
    // <div className="fixed inset-0 ... (backdrop classes)">
    //   <div (or motion.div) ... className="(inner classes)">
    //      ... content
    //   </div>
    // </div>
    
    // We'll do a simple regex that finds the first fixed inset-0 div and the child div/motion.div
    const wrapperMatch = content.match(/<div\s+className="(fixed\s+inset-0[^"]*)"/);
    if (wrapperMatch) {
        const backdropClass = wrapperMatch[1].replace(/fixed\s+inset-0\s*/, '').replace(/z-\[?\d+\]?\s*/, '').replace(/flex\s+items-center\s+justify-center\s*/, '').trim();
        
        let zIndexMatch = wrapperMatch[1].match(/z-([0-9]+)/) || wrapperMatch[1].match(/z-\[([0-9]+)\]/);
        let zIndex = zIndexMatch ? zIndexMatch[1] : '50';
        
        // Find the inner div/motion.div className
        // It's the next tag that has a className
        const remaining = content.slice(wrapperMatch.index + wrapperMatch[0].length);
        const innerClassMatch = remaining.match(/className="([^"]*)"/);
        
        let innerClass = innerClassMatch ? innerClassMatch[1] : '';
        
        // Replace the start tags
        // Find the exact outer div tag
        const startOuter = content.indexOf('<div', wrapperMatch.index);
        const endOuter = content.indexOf('>', startOuter) + 1;
        
        // Find the next div/motion.div tag
        let innerTagMatch = content.slice(endOuter).match(/<(div|motion\.div)[^>]*>/);
        if (innerTagMatch) {
            const startInner = endOuter + innerTagMatch.index;
            const endInner = startInner + innerTagMatch[0].length;
            
            const isOpenProp = content.includes('effectiveIsOpen') ? 'effectiveIsOpen' : 'isOpen';
            const onCloseProp = content.includes('handleClose') ? 'handleClose' : 'onClose';
            
            const newTag = `<Modal isOpen={${isOpenProp}} onClose={${onCloseProp}} zIndex={${zIndex}} backdropClassName="${backdropClass}" className="${innerClass}">`;
            
            content = content.slice(0, startOuter) + newTag + content.slice(endInner);
            
            // Now we need to replace the closing tags. We'll replace the last `</div> </div>` with `</Modal>`
            let lastDivClose = content.lastIndexOf('</div>');
            let prevDivClose = content.lastIndexOf('</div>', lastDivClose - 1);
            let endTagMatch = content.lastIndexOf('</motion.div>');
            
            if (innerTagMatch[1] === 'motion.div') {
                content = content.slice(0, endTagMatch) + '</Modal>' + content.slice(endTagMatch + '</motion.div>'.length);
                let remainingClose = content.lastIndexOf('</div>');
                if (remainingClose > endTagMatch) {
                     content = content.slice(0, remainingClose) + content.slice(remainingClose + '</div>'.length);
                }
            } else {
                content = content.slice(0, prevDivClose) + '</Modal>' + content.slice(lastDivClose + '</div>'.length);
            }
        }
    }
    
    // Clean up empty lines and formatting artifacts
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Processed', filePath);
}

files.forEach(processFile);
