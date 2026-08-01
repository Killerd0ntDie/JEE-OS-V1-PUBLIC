import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from '@/features/auth';
import { StudyBrainProvider } from './context/StudyBrainContext.tsx';
import { ToastProvider } from './components/ui/ToastProvider.tsx';
import { ThemeProvider } from './providers/ThemeProvider.tsx';
import { BrowserRouter } from 'react-router-dom';
import 'katex/dist/katex.min.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <StudyBrainProvider>
          <ToastProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ToastProvider>
        </StudyBrainProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
