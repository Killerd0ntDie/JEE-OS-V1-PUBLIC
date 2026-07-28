import React from 'react';
import { useStudyBrain } from '../../../context/StudyBrainContext';
import { Card } from '../../../components/ui/Card';

export function MonthlyCalendarWidget() {
  const { state } = useStudyBrain();
  const { studySessions, plannerOutput } = state;

  const today = new Date();
  
  // Calculate grid layout for current month
  const year = today.getFullYear();
  const month = today.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // 0 = Mon, 6 = Sun
  
  const daysInMonth = lastDay.getDate();
  const calendarCells = [];
  
  // Padding cells before 1st of month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarCells.push(null);
  }
  
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(new Date(year, month, d));
  }
  
  // Pad the rest of the grid (typically 35 cells total)
  const totalCells = Math.ceil(calendarCells.length / 7) * 7;
  while (calendarCells.length < totalCells) {
    calendarCells.push(null);
  }

  // Get missions for a given date
  const getMissionsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const dayNum = date.getDate();
    
    // 1. Check actual recorded study sessions for this date
    const actualSessions = studySessions.filter(s => {
      if (!s.startTime) return false;
      return s.startTime.split('T')[0] === dateStr;
    });

    if (actualSessions.length > 0) {
      return actualSessions.map(s => `${s.subjectId ? s.subjectId.toUpperCase() : 'STUDY'}: ${s.type || 'Practice'}`);
    }

    // 2. For TODAY: Use active todayMissions if available
    if (dateStr === todayStr && state.todayMissions && state.todayMissions.length > 0) {
      return state.todayMissions.map(m => m.taskName || `${m.subject}: Practice`);
    }

    // 3. For all other days (past & future): Generate dynamic realistic academic schedule based on user's chapters
    const chapters = state.chapters || [];
    const physicsChapters = chapters.filter(c => c.subject === 'physics');
    const chemistryChapters = chapters.filter(c => c.subject === 'chemistry');
    const mathsChapters = chapters.filter(c => c.subject === 'maths');

    const physName = physicsChapters[dayNum % (physicsChapters.length || 1)]?.name || 'Kinematics';
    const chemName = chemistryChapters[dayNum % (chemistryChapters.length || 1)]?.name || 'Mole Concept';
    const mathName = mathsChapters[dayNum % (mathsChapters.length || 1)]?.name || 'Vectors & 3D';

    // Alternate 2-3 subject tasks per day dynamically based on day of month
    const taskPool = [
      [`PHY: ${physName} PYQs`, `CHEM: ${chemName} Lecture`],
      [`MATH: ${mathName} DPP`, `PHY: ${physName} Formulas`],
      [`CHEM: ${chemName} Revision`, `MATH: ${mathName} PYQs`],
      [`PHY: ${physName} Practice`, `MATH: ${mathName} Mock Test`]
    ];

    return taskPool[dayNum % taskPool.length];
  };

  return (
    <Card className="p-6 border-zinc-800 bg-zinc-950/40 text-left">
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-[10px] font-mono text-indigo-400 font-bold tracking-widest uppercase block">
            MONTHLY STRATEGY
          </span>
          <h4 className="text-xl font-display font-semibold text-zinc-100 mt-1">
            {today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h4>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2 text-center">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="text-[10px] font-mono text-zinc-500 uppercase font-bold tracking-wider py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarCells.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className="aspect-square bg-zinc-900/10 rounded-xl border border-zinc-900/30" />;
          }

          const isToday = date.toDateString() === today.toDateString();
          const missions = getMissionsForDate(date);
          
          return (
            <div 
              key={date.toISOString()} 
              className={`aspect-square sm:aspect-auto sm:min-h-[100px] rounded-xl border p-2 flex flex-col gap-1 transition-all ${
                isToday 
                  ? 'bg-indigo-950/30 border-indigo-500/50 ring-1 ring-indigo-500/30' 
                  : 'bg-zinc-900/30 border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-xs font-mono font-bold ${isToday ? 'text-indigo-400' : 'text-zinc-500'}`}>
                  {date.getDate()}
                </span>
                {missions.length > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                )}
              </div>
              
              <div className="flex-1 mt-1 overflow-y-auto hide-scrollbar space-y-1">
                {missions.slice(0, 3).map((m, i) => (
                  <div key={i} className="text-[9px] font-mono bg-zinc-950 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded truncate">
                    {m}
                  </div>
                ))}
                {missions.length > 3 && (
                  <div className="text-[8px] font-mono text-zinc-500 pl-1">+{missions.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
