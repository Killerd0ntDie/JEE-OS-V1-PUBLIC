import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Tag, Sparkles, Clock, AlertTriangle, Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { SubjectId, Mistake } from '@/types/index';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { springs, modalVariants } from '@/constants/motion';

export interface LogMistakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
}

export const LogMistakeModal: React.FC<LogMistakeModalProps> = ({
  isOpen,
  onClose,
  categories,
}) => {
  const actions = useStudyBrainStore(state => state.actions);
  const chapters = useStudyBrainStore(state => state.chapters) || [];
  useEscapeKey(onClose, isOpen);
  useLockBodyScroll(isOpen);

  const [formSubject, setFormSubject] = React.useState<SubjectId>('physics');
  const [formChapter, setFormChapter] = React.useState('');
  const [formChapterId, setFormChapterId] = React.useState('');
  const [formTopic, setFormTopic] = React.useState('');
  const [formDifficulty, setFormDifficulty] = React.useState<Mistake['difficulty']>('Medium');
  const [formSource, setFormSource] = React.useState('');
  const [formTimeTaken, setFormTimeTaken] = React.useState(5);
  const [formQuestionText, setFormQuestionText] = React.useState('');
  const [formCorrectSolution, setFormCorrectSolution] = React.useState('');
  const [formStudentMethod, setFormStudentMethod] = React.useState('');
  const [wrongSolutionImage, setWrongSolutionImage] = React.useState<string>('');
  const [correctSolutionImage, setCorrectSolutionImage] = React.useState<string>('');
  const [formSelectedTags, setFormSelectedTags] = React.useState<string[]>([]);
  const [formPriority, setFormPriority] = React.useState<Mistake['priority']>('Medium');
  const [formPersonalNotes, setFormPersonalNotes] = React.useState('');

  const subjectChapters = React.useMemo(() => {
    return chapters.filter(c => c.subject === formSubject);
  }, [chapters, formSubject]);

  if (!isOpen) return null;

  const handleImageFileChange = (file: File | undefined, type: 'wrong' | 'correct') => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("Image is larger than 3MB. Please select a smaller diagram.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (type === 'wrong') setWrongSolutionImage(result);
      else setCorrectSolutionImage(result);
    };
    reader.readAsDataURL(file);
  };

  const toggleTag = (tag: string) => {
    setFormSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleChapterChange = (chapterName: string) => {
    setFormChapter(chapterName);
    const matched = subjectChapters.find(
      c => c.name.toLowerCase() === chapterName.trim().toLowerCase()
    );
    setFormChapterId(matched ? matched.id : '');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formChapter.trim() || !formQuestionText.trim()) return;

    const matched = subjectChapters.find(
      c => c.name.toLowerCase() === formChapter.trim().toLowerCase()
    );
    const resolvedChapterId = formChapterId || (matched ? matched.id : '');

    await actions.addMistake({
      subject: formSubject,
      chapter: formChapter.trim(),
      chapterId: resolvedChapterId,
      topic: formTopic.trim() || 'General Problem',
      subtopic: '',
      difficulty: formDifficulty,
      source: formSource.trim() || 'Self Practice',
      timeTaken: formTimeTaken,
      questionText: formQuestionText.trim(),
      correctSolution: formCorrectSolution.trim(),
      studentMethod: formStudentMethod.trim(),
      correctMethod: formCorrectSolution.trim(),
      wrongSolutionImage: wrongSolutionImage || undefined,
      correctSolutionImage: correctSolutionImage || undefined,
      mistakeTypes: formSelectedTags.length > 0 ? formSelectedTags : ['Conceptual Error'],
      confidence: 20,
      priority: formPriority,
      teacherNotes: '',
      personalNotes: formPersonalNotes.trim(),
      aiAdvice: '',
      revisionStatus: 'New',
      recoveryScore: 0,
      revisionSchedule: 'Next Day',
      masteryImpact: 'High',
      attemptNumber: 1,
      dateLogged: new Date().toISOString()
    });
    
    // Reset form
    setFormChapter('');
    setFormChapterId('');
    setFormTopic('');
    setFormSource('');
    setFormQuestionText('');
    setFormCorrectSolution('');
    setFormStudentMethod('');
    setWrongSolutionImage('');
    setCorrectSolutionImage('');
    setFormSelectedTags([]);
    setFormPersonalNotes('');
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/10 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none overflow-y-auto">
      <motion.div
        variants={modalVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="w-full max-w-2xl bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 border border-zinc-850/90 rounded-2xl shadow-2xl overflow-hidden my-auto text-left"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-850/80 flex justify-between items-center bg-zinc-950/60">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-white flex items-center gap-2 font-display">
              <Plus className="w-4 h-4 text-red-500" />
              Log Conceptual / Tactical Prep Error
            </h2>
            <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              Documenting errors is the fastest road to securing an IIT rank
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={onSubmit} className="p-5 sm:p-6 space-y-4 max-h-[calc(85vh-120px)] overflow-y-auto custom-scrollbar font-mono text-xs">
          
          {/* Subject Switcher with Glider */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
              Subject Class
            </label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-900/80 border border-zinc-850 rounded-xl relative select-none">
              {(['physics', 'chemistry', 'maths'] as const).map(sub => {
                const isActive = formSubject === sub;
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setFormSubject(sub)}
                    className={`relative py-2 rounded-lg font-mono text-xs font-bold uppercase transition-colors cursor-pointer select-none z-10 flex items-center justify-center ${
                      isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="mistakeSubjectTabGlider"
                        className="absolute inset-0 bg-indigo-600 rounded-lg shadow-md shadow-indigo-600/30 -z-10"
                        transition={springs.fluid}
                      />
                    )}
                    <span>{sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chapter & Topic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                Chapter Name *
              </label>
              <input
                type="text"
                required
                list="syllabus-chapters-list"
                value={formChapter}
                onChange={e => handleChapterChange(e.target.value)}
                placeholder="e.g. Rotational Dynamics"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-white placeholder-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
              />
              <datalist id="syllabus-chapters-list">
                {subjectChapters.map(c => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                Topic / Area *
              </label>
              <input
                type="text"
                value={formTopic}
                onChange={e => setFormTopic(e.target.value)}
                placeholder="e.g. Conservation of Angular Momentum"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-white placeholder-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
              />
            </div>
          </div>

          {/* Question Source & Time Spent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                Question Source
              </label>
              <input
                type="text"
                value={formSource}
                onChange={e => setFormSource(e.target.value)}
                placeholder="e.g. JEE Adv 2023 / Pathfinder / HC Verma"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-white placeholder-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1 relative z-20">
                <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                  Difficulty
                </label>
                <CustomSelect
                  size="sm"
                  value={formDifficulty}
                  onChange={val => setFormDifficulty(val as any)}
                  options={[
                    { value: 'Easy', label: 'Easy' },
                    { value: 'Medium', label: 'Medium' },
                    { value: 'Hard', label: 'Hard' },
                  ]}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                  Time (mins)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={formTimeTaken === 0 ? '' : formTimeTaken} placeholder="0"
                  onChange={e => setFormTimeTaken(parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Question Text Formulation */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
              Question Text * (Supports LaTeX $...$)
            </label>
            <textarea
              required
              rows={3}
              value={formQuestionText}
              onChange={e => setFormQuestionText(e.target.value)}
              placeholder="Describe or paste the exact question text with equations ($v = u + at$)..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white placeholder-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 leading-relaxed custom-scrollbar"
            />
          </div>

          {/* Faulty Attempt vs Correct Solution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-bold text-red-400 tracking-wider block">
                  My Faulty Attempt / Misconception
                </label>
                <label className="text-[10px] font-mono text-zinc-400 hover:text-white cursor-pointer flex items-center gap-1 transition-colors">
                  <Upload className="w-3 h-3 text-red-400" />
                  <span>Attach Diagram</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleImageFileChange(e.target.files?.[0], 'wrong')}
                  />
                </label>
              </div>
              <textarea
                rows={3}
                value={formStudentMethod}
                onChange={e => setFormStudentMethod(e.target.value)}
                placeholder="Where did I mess up? (e.g. forgot pseudo-force, wrong sign convention)..."
                className="w-full bg-zinc-900/80 border border-red-900/40 rounded-xl p-3 text-red-200 placeholder-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 leading-relaxed custom-scrollbar"
              />
              {wrongSolutionImage && (
                <div className="relative rounded-xl overflow-hidden border border-red-900/40 bg-zinc-950 p-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={wrongSolutionImage} alt="Faulty Attempt Diagram" className="w-12 h-12 object-cover rounded-lg border border-red-950" />
                    <span className="text-[10px] font-mono text-red-300">Attempt Diagram Attached</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWrongSolutionImage('')}
                    className="p-1 rounded-lg hover:bg-red-950/60 text-zinc-400 hover:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                  Correct Analytical Solution
                </label>
                <label className="text-[10px] font-mono text-zinc-400 hover:text-white cursor-pointer flex items-center gap-1 transition-colors">
                  <Upload className="w-3 h-3 text-emerald-400" />
                  <span>Attach Diagram</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleImageFileChange(e.target.files?.[0], 'correct')}
                  />
                </label>
              </div>
              <textarea
                rows={3}
                value={formCorrectSolution}
                onChange={e => setFormCorrectSolution(e.target.value)}
                placeholder="Write the correct method or final key formula derivation..."
                className="w-full bg-zinc-900/80 border border-emerald-900/40 rounded-xl p-3 text-emerald-200 placeholder-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 leading-relaxed custom-scrollbar"
              />
              {correctSolutionImage && (
                <div className="relative rounded-xl overflow-hidden border border-emerald-900/40 bg-zinc-950 p-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={correctSolutionImage} alt="Correct Solution Diagram" className="w-12 h-12 object-cover rounded-lg border border-emerald-950" />
                    <span className="text-[10px] font-mono text-emerald-300">Solution Diagram Attached</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCorrectSolutionImage('')}
                    className="p-1 rounded-lg hover:bg-emerald-950/60 text-zinc-400 hover:text-emerald-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Error Tag Pills */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
              Root-Cause Classification Tags
            </label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => {
                const isSelected = formSelectedTags.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleTag(cat)}
                    className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-red-950/60 border-red-800/80 text-red-300 shadow-sm'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Footer */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-850">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <motion.button
              type="submit"
              whileTap={{ scale: 0.94 }}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider shadow-lg shadow-red-600/25 transition-colors cursor-pointer"
            >
              Log & Classify in Error Book
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
