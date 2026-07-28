import React, { useState, useEffect } from 'react';
import { Icon } from '../../../components/ui/Icon';
import { useStudyBrain } from '../../../context/StudyBrainContext';
import { RevisionCardItem } from '../../../engines/revision';
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll';
import { useEscapeKey } from '../../../hooks/useEscapeKey';
import { MissionMode } from '../../mission/MissionMode';

interface FormulaSpeedDrillModalProps {
  isOpen: boolean;
  cards: RevisionCardItem[];
  onClose: () => void;
}

export const FormulaSpeedDrillModal: React.FC<FormulaSpeedDrillModalProps> = ({
  isOpen,
  cards,
  onClose
}) => {
  const { actions } = useStudyBrain();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isFlipped, setIsFlipped] = useState(false);
  const [streak, setStreak] = useState(0);
  const [scoreCount, setScoreCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // 30-Second Countdown Timer Effect
  useEffect(() => {
    if (!isOpen || isFinished) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isFinished]);

  // Keyboard Shortcuts (Space = Reveal, 1 = Hard, 2 = Medium, 3 = Easy)
  useEffect(() => {
    if (!isOpen || isFinished) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (isFlipped) {
        if (e.key === '1') handleRecall('Low');
        if (e.key === '2') handleRecall('Medium');
        if (e.key === '3') handleRecall('High');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFlipped, isFinished, currentIndex]);

  useLockBodyScroll(isOpen);
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const currentCard = cards[currentIndex % (cards.length || 1)];

  const handleRecall = (difficulty: 'High' | 'Medium' | 'Low') => {
    if (!currentCard) return;

    actions.completeRevision(currentCard.chapterId, difficulty);

    if (difficulty !== 'Low') {
      setStreak(prev => prev + 1);
      setScoreCount(prev => prev + 1);
    } else {
      setStreak(0);
    }

    setIsFlipped(false);
    setCurrentIndex(prev => prev + 1);
  };

  const totalXP = scoreCount * 25 + streak * 5;

  return isOpen ? (
    <MissionMode 
      mode="revision" 
      activeSubject="all" 
      customDurationSecs={30} 
      onExit={onClose} 
      onComplete={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="formula-speed-drill-modal-title"
        className="relative w-full h-full max-h-[600px] flex-1 bg-[#0e0e11]/80 backdrop-blur-md rounded-2xl overflow-hidden flex flex-col p-6 space-y-5 text-left"
      >
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-zinc-850 pb-4">
          <div className="flex items-center gap-2">
            <span id="formula-speed-drill-modal-title" className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-950/40 border border-amber-900/50 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
              <span>⚡ RAPID-FIRE SPEED DRILL</span>
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Speed Drill Modal"
            className="p-1.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <Icon name="X" className="w-4 h-4" />
          </button>
        </div>

        {/* Finished State Summary */}
        {isFinished ? (
          <div className="py-8 text-center space-y-5 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center mx-auto text-3xl">
              🏆
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-display font-bold text-white">Speed Drill Completed!</h3>
              <p className="text-xs text-zinc-400">Great focus! Memory intervals updated for all recalled formulas.</p>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto font-mono">
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
                <span className="text-[9px] text-zinc-500 block uppercase">Recalled</span>
                <span className="text-lg font-bold text-emerald-400">{scoreCount} Qs</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
                <span className="text-[9px] text-zinc-500 block uppercase">Max Streak</span>
                <span className="text-lg font-bold text-amber-400">{streak} 🔥</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
                <span className="text-[9px] text-zinc-500 block uppercase">XP Earned</span>
                <span className="text-lg font-bold text-indigo-400">+{totalXP}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/30"
            >
              Back to Revision Center
            </button>
          </div>
        ) : (
          /* Active Timed Drill State */
          <div className="space-y-5">
            {/* Timer & Streak Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Icon name="Clock" className="w-3.5 h-3.5 text-amber-400" />
                  <span>Time Remaining: <strong className="text-amber-400">{timeLeft}s</strong></span>
                </span>
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  <span>🔥 Streak: {streak}x</span>
                </span>
              </div>
              <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                  style={{ width: `${(timeLeft / 30) * 100}%` }}
                />
              </div>
            </div>

            {/* Flashcard Box */}
            <div 
              onClick={() => setIsFlipped(!isFlipped)}
              className={`p-6 rounded-2xl border text-center transition-all duration-200 cursor-pointer min-h-[220px] flex flex-col items-center justify-center space-y-3 ${
                isFlipped 
                  ? 'bg-zinc-900/80 border-indigo-500/50 shadow-2xl' 
                  : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <span className="text-[10px] font-mono font-bold uppercase text-zinc-500 tracking-wider">
                {currentCard?.subject.toUpperCase()} • {currentCard?.chapterName}
              </span>

              {isFlipped ? (
                <div className="w-full text-left space-y-1.5">
                  <span className="text-[9px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">
                    Formula Expression:
                  </span>
                  <pre className="font-mono text-sm text-indigo-200 bg-zinc-950 p-4 rounded-xl border border-indigo-900/40 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {currentCard?.formula}
                  </pre>
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="text-base font-display font-bold text-white">{currentCard?.title}</h4>
                  <p className="text-xs text-zinc-300 font-sans max-w-md">
                    "{currentCard?.concept}"
                  </p>
                  <span className="text-[10px] font-mono text-indigo-400 block pt-2">
                    [ Press SPACEBAR or click to reveal ]
                  </span>
                </div>
              )}
            </div>

            {/* Recall Difficulty Keyboard Controls */}
            {isFlipped ? (
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <button
                  onClick={() => handleRecall('Low')}
                  className="p-2.5 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800/60 text-red-300 text-xs font-bold cursor-pointer transition-all"
                >
                  [1] Hard (1d)
                </button>
                <button
                  onClick={() => handleRecall('Medium')}
                  className="p-2.5 rounded-xl bg-amber-950/60 hover:bg-amber-900 border border-amber-800/60 text-amber-300 text-xs font-bold cursor-pointer transition-all"
                >
                  [2] Medium (3d)
                </button>
                <button
                  onClick={() => handleRecall('High')}
                  className="p-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300 text-xs font-bold cursor-pointer transition-all"
                >
                  [3] Easy (7d+)
                </button>
              </div>
            ) : (
              <div className="p-3 text-center text-zinc-500 font-mono text-xs bg-zinc-950/40 rounded-xl border border-zinc-900">
                Press Spacebar to reveal formula answer
              </div>
            )}

          </div>
        )}

      </div>
    </MissionMode>
  ) : null;
};
