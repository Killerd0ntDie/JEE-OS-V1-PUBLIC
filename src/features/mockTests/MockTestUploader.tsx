import React, { useState, useRef } from 'react';
import { UploadCloud, FileJson, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { MockTest } from '../../types/mockTest';
import { Modal } from '@/components/ui/Modal';

interface MockTestUploaderProps {
  isOpen: boolean;
  onUpload: (test: MockTest) => void;
  onCancel: () => void;
}

export function MockTestUploader({ isOpen, onUpload, onCancel }: MockTestUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    setError(null);
    
    if (!file.name.endsWith('.json')) {
      setError("Please upload a valid JSON file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text) as MockTest;
        
        // Basic Validation
        if (!json.name || !json.durationMinutes || !json.sections || !Array.isArray(json.sections)) {
          setError("Invalid mock test format. Ensure 'name', 'durationMinutes', and 'sections' exist.");
          return;
        }

        onUpload(json);
      } catch (err) {
        setError("Failed to parse JSON file. Ensure it is well-formed.");
      }
    };
    reader.onerror = () => {
      setError("Failed to read the file.");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} zIndex={50} backdropClassName="bg-black/35 backdrop-blur-sm p-4" className="glass-panel bg-zinc-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] relative text-left">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <FileJson className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Upload Custom Test</h2>
              <p className="text-xs text-zinc-400 font-mono">Accepts JSON Schema</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div 
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            dragActive ? 'border-indigo-500 bg-indigo-500/5' : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            accept=".json" 
            className="hidden" 
            onChange={handleChange}
          />
          <div className="w-12 h-12 mx-auto rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-zinc-400">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-sm text-zinc-300 font-medium mb-1">Drag and drop your JSON here</p>
          <p className="text-xs text-zinc-400 font-mono mb-4">Or click to browse your files</p>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-bold rounded-lg transition-colors"
          >
            Select File
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-950/30 border border-red-900/50 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400 font-medium">{error}</p>
          </div>
        )}

        {fileName && !error && (
          <div className="mt-4 p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <p className="text-xs text-emerald-400 font-medium font-mono truncate">{fileName}</p>
          </div>
        )}
    </Modal>
  );
}
