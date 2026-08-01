import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-400 font-sans p-6 relative z-[100]">
        <div className="w-12 h-12 border-4 border-indigo-900/30 border-t-indigo-500 rounded-full animate-spin mb-8"></div>
        <div className="space-y-4 text-center">
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-indigo-400 font-bold mb-6">JEE COCKPIT</div>
          <h2 className="text-base font-display font-bold text-white tracking-wider uppercase mt-4">LOADING WORKSPACE...</h2>
          <p className="text-[15px] text-zinc-500 max-w-sm mx-auto leading-relaxed mt-4">
            Retrieving syllabus milestones, mistakes logs, and personal preparation notes...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login, but save the intended destination
    return <Navigate to="/auth" state={{ returnUrl: location.pathname + location.search }} replace />;
  }

  return <>{children}</>;
};
