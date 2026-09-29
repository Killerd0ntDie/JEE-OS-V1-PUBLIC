import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FORMULAS } from '../../constants/formulas';

export interface UseMissionNotesAndFormulasProps {
  activeSubject: 'physics' | 'chemistry' | 'maths';
  isSettingUp: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  missionFailed: boolean;
  formatTime: (secs: number) => string;
  seconds: number;
}

export function useMissionNotesAndFormulas({
  activeSubject,
  isSettingUp,
  isPaused,
  isCompleted,
  missionFailed,
  formatTime,
  seconds
}: UseMissionNotesAndFormulasProps) {
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isFormulaOpen, setIsFormulaOpen] = useState(false);
  const [formulaSearch, setFormulaSearch] = useState('');

  const [notes, setNotes] = useState<{ id: string; timestamp: string; text: string; category: string }[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [activeNoteCategory, setActiveNoteCategory] = useState('Quick Notes');

  const [coachTip, setCoachTip] = useState('Cockpit armed. High retention mode is actively analyzing your pace.');
  const [isCoachVisible, setIsCoachVisible] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const notesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const coachTips = [
      'Excellent pace! Your focus score is in the top 2% of JEE aspirants.',
      'Active learning logged. Try pausing to verify torque vector direction manually.',
      'Formula sheets updated. Revise "Parallel Axis Theorem" for complex planar body problems.',
      'You are crushing this block. 15m left of optimal focus retention.',
      'Take a micro 1-minute deep breathing break to flush out mental load.',
      'Average lecture speed calibrated to 1.25x. Efficient mental bandwidth uptake.'
    ];

    const coachInterval = setInterval(() => {
      if (!isSettingUp && !isPaused && !isCompleted && !missionFailed) {
        const randTip = coachTips[Math.floor(Math.random() * coachTips.length)];
        setCoachTip(randTip);
      }
    }, 25000);

    return () => clearInterval(coachInterval);
  }, [isPaused, isCompleted, isSettingUp, missionFailed]);

  const handleAddNote = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!noteInput.trim()) return;

    const newNote = {
      id: Date.now().toString(),
      timestamp: formatTime(seconds),
      text: noteInput.trim(),
      category: activeNoteCategory
    };

    setNotes(prev => [...prev, newNote]);
    setNoteInput('');
    setCoachTip('Note captured with active session timestamp.');

    setTimeout(() => {
      notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  const handleQuickPresetNote = (presetText: string) => {
    const newNote = {
      id: Date.now().toString(),
      timestamp: formatTime(seconds),
      text: presetText,
      category: activeNoteCategory
    };
    setNotes(prev => [...prev, newNote]);
    setCoachTip(`Quick note logged: "${presetText}"`);
    setTimeout(() => {
      notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  const filteredFormulas = useMemo(() => {
    const list = FORMULAS[activeSubject] || [];
    if (!formulaSearch.trim()) return list;
    return list.filter(f => 
      f.name.toLowerCase().includes(formulaSearch.toLowerCase()) || 
      f.formula.toLowerCase().includes(formulaSearch.toLowerCase()) ||
      f.description.toLowerCase().includes(formulaSearch.toLowerCase())
    );
  }, [activeSubject, formulaSearch]);

  return {
    isNotesOpen,
    setIsNotesOpen,
    isFormulaOpen,
    setIsFormulaOpen,
    formulaSearch,
    setFormulaSearch,
    notes,
    setNotes,
    noteInput,
    setNoteInput,
    activeNoteCategory,
    setActiveNoteCategory,
    coachTip,
    setCoachTip,
    isCoachVisible,
    setIsCoachVisible,
    showShortcuts,
    setShowShortcuts,
    notesEndRef,
    handleAddNote,
    handleQuickPresetNote,
    filteredFormulas
  };
}
