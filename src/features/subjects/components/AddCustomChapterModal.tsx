import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { SubjectId } from '@/types/index';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { Modal } from '@/components/ui/Modal';

interface AddCustomChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSubject: SubjectId;
  defaultUnit?: string;
}

export function AddCustomChapterModal({ isOpen, onClose, defaultSubject, defaultUnit }: AddCustomChapterModalProps) {
  const actions = useStudyBrainStore(state => state.actions);
  const chapters = useStudyBrainStore(state => state.chapters);

  const [name, setName] = useState('');
  const [subject, setSubject] = useState<SubjectId>(defaultSubject);
  const [unit, setUnit] = useState(defaultUnit || '');
  const [serialNumber, setSerialNumber] = useState('');
  const [totalLectures, setTotalLectures] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLockBodyScroll(isOpen);
  useEscapeKey(onClose, isOpen);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !unit.trim() || !serialNumber.trim()) {
      setError('Chapter name, unit, and serial number are required.');
      return;
    }

    // Check for duplicate serial number
    const newSerialNumber = serialNumber.trim().padStart(2, '0');
    const fullSerialNumber = `CH${newSerialNumber}`;
    const duplicateChapter = chapters.find(
      c => c.serialNumber === fullSerialNumber && c.subject === subject
    );
    if (duplicateChapter) {
      setError(`Serial number ${fullSerialNumber} is already used by "${duplicateChapter.name}" in this subject. Please use a different number.`);
      return;
    }

    // Check if serial number exceeds max allowed (highest in subject + 1)
    const subjectChapters = chapters.filter(c => c.subject === subject);
    let maxNum = 0;
    subjectChapters.forEach(ch => {
      if (ch.serialNumber && ch.serialNumber.startsWith('CH')) {
        const numStr = ch.serialNumber.slice(2);
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const inputNum = parseInt(newSerialNumber, 10);
    if (!isNaN(inputNum) && inputNum > maxNum + 1) {
      setError(`Serial number cannot exceed ${maxNum + 1} (highest current serial number + 1). Please use a smaller number.`);
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      await actions.addCustomChapter({
        name: name.trim(),
        subject,
        unit: unit.trim(),
        serialNumber: newSerialNumber,
        totalLectures,
        difficulty
      });
      setName('');
      setUnit(defaultUnit || '');
      setSerialNumber('');
      setTotalLectures(5);
      setDifficulty('Medium');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not add this chapter. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} zIndex={100} backdropClassName="bg-black/10 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto" className="w-full max-w-md border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xl font-sans text-left my-4 glass-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" /> Add Custom Chapter
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-zinc-400 font-mono mb-4">
            This chapter will follow the same format as the system's built-in syllabus, so it schedules and tracks progress the same way.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3 font-mono">
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1 uppercase font-bold tracking-wide">Chapter Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Electrochemistry Extra Topics"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3 relative z-20">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1 uppercase font-bold tracking-wide">Subject</label>
                <CustomSelect
                  size="sm"
                  value={subject}
                  onChange={(val) => setSubject(val as SubjectId)}
                  options={[
                    { value: 'physics', label: 'Physics' },
                    { value: 'chemistry', label: 'Chemistry' },
                    { value: 'maths', label: 'Maths' },
                  ]}
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1 uppercase font-bold tracking-wide">Difficulty</label>
                <CustomSelect
                  size="sm"
                  value={difficulty}
                  onChange={(val) => setDifficulty(val as 'Easy' | 'Medium' | 'Hard')}
                  options={[
                    { value: 'Easy', label: 'Easy' },
                    { value: 'Medium', label: 'Medium' },
                    { value: 'Hard', label: 'Hard' },
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 block mb-1 uppercase font-bold tracking-wide">Unit</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. Physical Chemistry"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 block mb-1 uppercase font-bold tracking-wide">Serial Number *</label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. 02"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500"
                required
              />
              <p className="text-[11px] text-zinc-400 mt-1">Enter a number (will be prefixed with CH, e.g., 02 → CH02)</p>
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 block mb-1 uppercase font-bold tracking-wide">
                Estimated Lectures: <span className="text-indigo-400">{totalLectures}</span>
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={totalLectures}
                onChange={(e) => setTotalLectures(parseInt(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {error && <p className="text-[11px] text-red-400">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer"
              >
                {isSaving ? 'Adding...' : 'Add Chapter'}
              </button>
            </div>
          </form>
    </Modal>
  );
}
