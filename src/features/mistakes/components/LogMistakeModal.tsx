import React from 'react';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { SubjectId, Mistake } from '../../../types/index';
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll';
import { useEscapeKey } from '../../../hooks/useEscapeKey';
import { ModalPortal } from '../../../components/ui/ModalPortal';
import { useStudyBrain } from '../../../context/StudyBrainContext';

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
  const { actions } = useStudyBrain();
  useEscapeKey(onClose, isOpen);
  const [formSubject, setFormSubject] = React.useState<SubjectId>('physics');
  const [formChapter, setFormChapter] = React.useState('');
  const [formTopic, setFormTopic] = React.useState('');
  const [formSubtopic, setFormSubtopic] = React.useState('');
  const [formDifficulty, setFormDifficulty] = React.useState<Mistake['difficulty']>('Medium');
  const [formSource, setFormSource] = React.useState('');
  const [formTimeTaken, setFormTimeTaken] = React.useState(5);
  const [formQuestionText, setFormQuestionText] = React.useState('');
  const [formCorrectSolution, setFormCorrectSolution] = React.useState('');
  const [formStudentMethod, setFormStudentMethod] = React.useState('');
  const [formCorrectMethod, setFormCorrectMethod] = React.useState('');
  const [formSelectedTags, setFormSelectedTags] = React.useState<string[]>([]);
  const [formConfidence, setFormConfidence] = React.useState(20);
  const [formPriority, setFormPriority] = React.useState<Mistake['priority']>('Medium');
  const [formTeacherNotes, setFormTeacherNotes] = React.useState('');
  const [formPersonalNotes, setFormPersonalNotes] = React.useState('');
  const [formAiAdvice, setFormAiAdvice] = React.useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await actions.addMistake({
      subject: formSubject,
      chapter: formChapter,
      topic: formTopic,
      subtopic: formSubtopic,
      difficulty: formDifficulty,
      source: formSource,
      timeTaken: formTimeTaken,
      questionText: formQuestionText,
      correctSolution: formCorrectSolution,
      studentMethod: formStudentMethod,
      correctMethod: formCorrectMethod,
      mistakeTypes: formSelectedTags,
      confidence: formConfidence,
      priority: formPriority,
      teacherNotes: formTeacherNotes,
      personalNotes: formPersonalNotes,
      aiAdvice: formAiAdvice,
      revisionStatus: 'New',
      recoveryScore: 0,
      revisionSchedule: 'Next Day',
      masteryImpact: 'High',
      attemptNumber: 1,
      dateLogged: new Date().toISOString()
    });
    
    // Reset form
    setFormChapter('');
    setFormTopic('');
    setFormSubtopic('');
    setFormSource('');
    setFormQuestionText('');
    setFormCorrectSolution('');
    setFormStudentMethod('');
    setFormCorrectMethod('');
    setFormSelectedTags([]);
    setFormTeacherNotes('');
    setFormPersonalNotes('');
    setFormAiAdvice('');
    
    onClose();
  };
  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  return (
    <ModalPortal>
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-mistake-modal-title"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-zinc-950 border border-zinc-850 rounded-2xl shadow-2xl overflow-hidden my-8 text-left"
      >
        {/* Modal Header */}
          <div className="p-5 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/20">
            <div className="space-y-1">
              <h2 id="log-mistake-modal-title" className="text-base font-bold text-white flex items-center gap-1.5 font-display">
                <Plus className="w-4 h-4 text-red-500" />
                Log Conceptual / Tactical Prep Error
              </h2>
              <p className="text-xs text-zinc-500 font-mono">
                DOCUMENTING MISTAKES IS THE QUICKEST ROAD TO SECURING AN IIT RANK
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close Log Mistake Modal"
              className="text-zinc-500 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-900 cursor-pointer"
            >
              ✕
            </button>
          </div>

        <form onSubmit={onSubmit}>
          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Subject Selection row */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-zinc-400">Subject Class</label>
              <div className="grid grid-cols-3 gap-2">
                {(['physics', 'chemistry', 'maths'] as const).map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setFormSubject(sub)}
                    className={`py-1.5 rounded-lg text-2xs font-mono font-bold uppercase tracking-wider border cursor-pointer text-center ${
                      formSubject === sub
                        ? sub === 'physics'
                          ? 'bg-sky-950/40 text-sky-400 border-sky-800/80'
                          : sub === 'chemistry'
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/80'
                          : 'bg-purple-950/40 text-purple-400 border-purple-800/80'
                        : 'bg-zinc-950 text-zinc-500 border-zinc-900 hover:text-zinc-300'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Chapter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-zinc-400">Chapter Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Rotational Dynamics"
                  value={formChapter}
                  onChange={(e) => setFormChapter(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700"
                  required
                />
              </div>

              {/* Topic */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-zinc-400">Topic Area *</label>
                <input
                  type="text"
                  placeholder="e.g. Angular Momentum Conservation"
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700"
                  required
                />
              </div>

              {/* Subtopic */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-zinc-400">Subtopic Details</label>
                <input
                  type="text"
                  placeholder="e.g. Inelastic Collision on pivoted Rod"
                  value={formSubtopic}
                  onChange={(e) => setFormSubtopic(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700"
                />
              </div>

              {/* Question Source */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-zinc-400">Question Source</label>
                <input
                  type="text"
                  placeholder="e.g. Past Year JEE 2023 / HC Verma"
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700"
                />
              </div>

              {/* Difficulty level */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-zinc-400">Difficulty Grade</label>
                <select
                  value={formDifficulty}
                  onChange={(e) => setFormDifficulty(e.target.value as Mistake['difficulty'])}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                  <option value="JEE Main">JEE Main</option>
                  <option value="JEE Advanced">JEE Advanced</option>
                </select>
              </div>

              {/* Time taken */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-zinc-400">Time spent solving (Mins)</label>
                <input
                  type="number"
                  value={formTimeTaken}
                  onChange={(e) => setFormTimeTaken(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700"
                />
              </div>
            </div>

            {/* Question description */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold">The Question Text *</label>
              <textarea
                placeholder="Describe or write out the exact question text..."
                value={formQuestionText}
                onChange={(e) => setFormQuestionText(e.target.value)}
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700 resize-none font-mono"
                required
              />
            </div>

            {/* Split diagnostics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Student wrong approach */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-red-400 font-bold">
                  What I did wrong (My Faulty Method) *
                </label>
                <textarea
                  placeholder="e.g. Conserved linear momentum which is invalid due to pivot impulse force."
                  value={formStudentMethod}
                  onChange={(e) => setFormStudentMethod(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700 resize-none font-sans"
                  required
                />
              </div>

              {/* Correct approach */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                  What I should have done (Correct Method) *
                </label>
                <textarea
                  placeholder="e.g. Conserve angular momentum about the pivot point axis instead."
                  value={formCorrectMethod}
                  onChange={(e) => setFormCorrectMethod(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700 resize-none font-sans"
                  required
                />
              </div>
            </div>

            {/* Step-by-step Correct Solution */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold">
                Correct Analytical Solution steps *
              </label>
              <textarea
                placeholder="Provide a logical step by step walkthrough of correct solution equations..."
                value={formCorrectSolution}
                onChange={(e) => setFormCorrectSolution(e.target.value)}
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700 resize-none font-mono"
                required
              />
            </div>

            {/* Tags multi-select selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-zinc-400">
                Classify Error Categories (Select all that apply)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((tag) => {
                  const isSelected = formSelectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setFormSelectedTags((prev) =>
                          isSelected ? prev.filter((t) => t !== tag) : [...prev, tag]
                        );
                      }}
                      className={`px-2.5 py-1 rounded text-3xs font-mono border cursor-pointer ${
                        isSelected
                          ? 'bg-red-950/40 text-red-400 border-red-800/60'
                          : 'bg-zinc-950 text-zinc-500 border-zinc-900 hover:text-zinc-300'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row for Confidence, priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Confidence Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-mono uppercase text-zinc-400">
                    Initial confidence after review
                  </label>
                  <span className="text-2xs font-mono text-zinc-300">{formConfidence}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formConfidence}
                  onChange={(e) => setFormConfidence(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-zinc-400">Urgency Priority</label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as Mistake['priority'])}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700"
                >
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High (Immediate Spaced Review)</option>
                </select>
              </div>
            </div>

            {/* Notes and custom AI advice override */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-zinc-400">
                  Teacher Notes (e.g. Classroom Warning)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Teacher said it is a standard exam trap."
                  value={formTeacherNotes}
                  onChange={(e) => setFormTeacherNotes(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-zinc-400">My Cockpit Reminder</label>
                <input
                  type="text"
                  placeholder="e.g. Always draw the free body diagram first!"
                  value={formPersonalNotes}
                  onChange={(e) => setFormPersonalNotes(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-zinc-400">AI Advice override (Optional)</label>
              <input
                type="text"
                placeholder="Leave blank to let AI automatically generate diagnostics based on selected tags..."
                value={formAiAdvice}
                onChange={(e) => setFormAiAdvice(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-5 border-t border-zinc-900 flex flex-col sm:flex-row gap-3 bg-zinc-900/10">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-1/3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-zinc-400 hover:text-zinc-200 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-2/3 bg-red-950/40 text-red-400 hover:bg-red-900/30 border border-red-900/50 py-2 rounded-xl text-xs font-extrabold transition-all active:scale-95 cursor-pointer shadow-lg"
            >
              Log & Classify in Error Book
            </button>
          </div>
        </form>
      </motion.div>
    </div>
    </ModalPortal>
  );
};
