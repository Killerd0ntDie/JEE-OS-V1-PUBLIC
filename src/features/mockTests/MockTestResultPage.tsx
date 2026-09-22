import React, { useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { MockTestResult } from './MockTestResult';
import { mockTest1 } from '@/data/mockTests/jeeMain2024Shift1';
import { ArrowLeft, AlertCircle, FileText } from 'lucide-react';

export function MockTestResultPage() {
  const { attemptId } = useParams<{ attemptId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mocks = useStudyBrainStore(state => state.mocks);
  const customMockTests = useStudyBrainStore(state => state.customMockTests);

  const targetAttemptId = attemptId || searchParams.get('attemptId');

  // Find target attempt
  const targetMock = useMemo(() => {
    if (!mocks || mocks.length === 0) return null;
    if (!targetAttemptId || targetAttemptId === 'latest') {
      return mocks[mocks.length - 1];
    }
    const exactMatch = mocks.find(m => m.id === targetAttemptId);
    if (exactMatch) return exactMatch;

    // Fallback 1: match by originalAttemptId or attemptData.testId
    const altMatch = mocks.find(m => (m as any).originalAttemptId === targetAttemptId || m.attemptData?.testId === targetAttemptId);
    if (altMatch) return altMatch;

    // Fallback 2: if an attempt was just recorded, default to latest mock
    return mocks[mocks.length - 1];
  }, [mocks, targetAttemptId]);

  const testSnapshot = useMemo(() => {
    if (!targetMock) return null;
    if (targetMock.testSnapshot) return targetMock.testSnapshot;

    // Fallback: search custom tests or default mockTest1
    const foundCustom = customMockTests?.find(t => t.id === targetMock.attemptData?.testId || t.name === targetMock.title);
    if (foundCustom) return foundCustom;
    if (targetMock.title === mockTest1.name) return mockTest1;
    return null;
  }, [targetMock, customMockTests]);

  const handleClose = () => {
    navigate('/mock-tests');
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!targetMock) {
    return (
      <div className="w-full h-full min-h-screen bg-[#07070a] text-zinc-300 p-6 flex flex-col items-center justify-center">
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-display font-bold text-white">Mock Result Not Found</h2>
          <p className="text-xs font-mono text-zinc-400">
            {targetAttemptId 
              ? `No test autopsy record found for attempt ID "${targetAttemptId}".`
              : 'You haven\'t completed any mock tests yet.'}
          </p>
          <button
            onClick={handleClose}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-mono text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Mock Tests</span>
          </button>
        </div>
      </div>
    );
  }

  // Handle basic external score record without question details
  if (!targetMock.attemptData || !testSnapshot) {
    return (
      <div className="w-full h-full min-h-screen bg-[#07070a] text-zinc-300 p-6 flex flex-col items-center justify-center">
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto text-zinc-400">
            <FileText className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-display font-bold text-white">Basic Score Record</h2>
          <p className="text-zinc-400 text-xs font-mono">
            This is an externally logged score record. Detailed question-by-question analytics are only stored for tests attempted within JEE OS.
          </p>
          <div className="bg-zinc-900/60 rounded-xl p-3 text-left font-mono text-xs space-y-1">
            <div className="text-white font-bold">{targetMock.title}</div>
            <div className="text-zinc-400">Score: <span className="text-indigo-400 font-bold">{targetMock.totalScore}</span></div>
            <div className="text-zinc-400">Date: {new Date(targetMock.date).toLocaleDateString()}</div>
          </div>
          <button
            onClick={handleClose}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-mono text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Mock Tests</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-screen bg-[#07070a] text-zinc-300 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-y-auto scrollbar">
      <div className="max-w-7xl mx-auto w-full">
        <MockTestResult
          test={testSnapshot}
          attempt={targetMock.attemptData}
          onClose={handleClose}
          onNavigate={(pageId) => navigate(`/${pageId}`)}
        />
      </div>
    </div>
  );
}
