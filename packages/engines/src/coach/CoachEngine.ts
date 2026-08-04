import { CoachInput, CoachOutput } from './types';

export class CoachEngine {
  public static cachedWorkingModel: string | null = null;

  private async getAuthToken(): Promise<string> {
    const { auth } = await import('@/firebase');
    const user = auth.currentUser;
    if (!user) throw new Error("User must be logged in to analyze performance.");
    return await user.getIdToken();
  }

  public async getAnalysis(input: CoachInput): Promise<CoachOutput> {
    try {
      const token = await this.getAuthToken();
      const response = await fetch('/api/coach/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      return { analysis: data.analysis, actions: data.actions };
    } catch (err: any) {
      console.warn("Backend coach analysis failed:", err.message);
      return { 
        analysis: `Coach is temporarily unavailable, please try again. (Error: ${err.message || 'Unknown'})`
      };
    }
  }
}
