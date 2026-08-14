import { CoachInput, CoachOutput, CoachAction } from './types';

export class CoachEngine {
  public static cachedWorkingModel: string | null = null;

  private async getAuthToken(): Promise<string | null> {
    try {
      const { auth } = await import('@/firebase');
      const user = auth?.currentUser;
      if (!user) return null;
      return await user.getIdToken();
    } catch {
      return null;
    }
  }

  public async getAnalysis(input: CoachInput): Promise<CoachOutput> {
    try {
      const token = await this.getAuthToken();
      if (token) {
        const response = await fetch('/api/coach/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(input)
        });

        if (response.ok) {
          const data = await response.json();
          if (data.analysis && !data.analysis.includes('GEMINI_API_KEY not configured')) {
            return { analysis: data.analysis, actions: data.actions };
          }
        }
      }
    } catch (err: any) {
      console.warn("Backend coach analysis failed, falling back to local reasoning engine:", err.message);
    }

    // Fallback: Intelligent Local Reasoning Engine tailored to JEE preparation telemetry
    return this.generateDeterministicTacticalAdvice(input);
  }

  private generateDeterministicTacticalAdvice(input: CoachInput): CoachOutput {
    const q = (input.question || '').toLowerCase();
    const target = input.targetCollege || 'IIT';
    const year = input.targetYear || '2026';

    const activeChapters = (input.chapters || []).filter((c: any) => c.status !== 'Unstarted' || (c.progress && c.progress > 0));
    const weakTopics = input.weakTopics || [];
    const inFlightCount = activeChapters.length;
    const actions: CoachAction[] = [];

    let analysis = '';

    if (q.includes('chemistry') || q.includes('physics') || q.includes('maths') || q.includes('syllabus') || q.includes('graph') || q.includes('prerequisite')) {
      const subject = q.includes('chemistry') ? 'Chemistry' : q.includes('physics') ? 'Physics' : q.includes('maths') ? 'Maths' : 'Core Syllabus';
      
      analysis = `### Tactical Syllabus Blueprint: ${subject} (${target} ${year})

1. **Foundational Priority Assessment:**
   • You currently have **${inFlightCount} active modules** in the pipeline.
   • To maintain high velocity toward **${target}**, prioritize prerequisite nodes before advancing to composite applications.

2. **Immediate Action Steps:**
   • **Concept Solidification:** Dedicate 45 minutes to high-yield derivations and standard pattern recognition.
   • **Targeted Question Drills:** Solve 15 targeted PYQs (2020–2024 JEE Advanced) without consulting solution hints upfront.
   • **Formula Retention Check:** Review key equations to lock in your SuperMemo-2 retention factor.`;

      if (activeChapters.length > 0) {
        const topChap = activeChapters[0];
        actions.push({
          type: 'ADD_MISSION',
          payload: {
            title: `Solve 15 PYQs: ${topChap.name}`,
            subject: q.includes('chemistry') ? 'chemistry' : q.includes('physics') ? 'physics' : 'maths',
            duration: 60,
            chapterId: topChap.name
          }
        });
      }
    } else if (q.includes('backlog') || q.includes('emergency') || q.includes('revision') || q.includes('plan')) {
      analysis = `### Emergency Backlog Resolution Protocol (${target} Focus)

1. **The 70/30 Split Strategy:**
   • Allocate **70% of study hours** to today's core scheduled missions so you do not generate new backlog.
   • Dedicate **30% (60–90 mins)** exclusively to high-yield backlog clearance.

2. **High-Yield First Principle:**
   • Do not study backlogged chapters linearly. Start with Tier-1 weightage topics (Mechanics, Calculus, Organic Reaction Mechanisms).

3. **Active Recall over Passive Reading:**
   • Skip re-watching full 2-hour lectures. Jump directly into short formula review cards and 10 PYQs per chapter.`;

      actions.push({
        type: 'ADD_MISSION',
        payload: {
          title: `Backlog Sprint: 10 High-Yield PYQs`,
          subject: 'physics',
          duration: 45
        }
      });
    } else if (q.includes('weak') || q.includes('mistake') || q.includes('score') || q.includes('readiness')) {
      analysis = `### Error Pattern & Weak Topic Autopsy

1. **Vulnerability Analysis:**
   • You have recorded **${weakTopics.length} recurring mistakes** in your mistake notebook.
   • Most lost marks in JEE Advanced stem from calculation slip-ups under time pressure and edge-case boundary errors.

2. **Actionable Correction:**
   • Re-solve all tagged **Conceptual** and **Calculation** mistakes from your notebook under timed conditions.
   • Maintain a dedicated 1-page "Fatal Traps" checklist for exam day.`;

      if (weakTopics.length > 0) {
        actions.push({
          type: 'ADD_MISSION',
          payload: {
            title: `Review Mistake Notebook: ${weakTopics[0]?.topic || 'Weak Spots'}`,
            subject: 'maths',
            duration: 35
          }
        });
      }
    } else {
      analysis = `### Strategic Mentorship Briefing (${target} ${year})

1. **Daily Execution Rhythm:**
   • Focus on consistent daily execution of your scheduled missions.
   • Balance your three core subjects to avoid burnout in any single area.

2. **Retention Optimization:**
   • Utilize the Neural Link map and Spaced Repetition simulator to identify chapters entering memory decay.
   • Conduct 15-minute formula recall drills every morning before new lectures.`;
    }

    return { analysis, actions };
  }
}
