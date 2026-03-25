import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, Pencil, Eraser } from 'lucide-react';
import { Note, Tool } from '../types';
import { getNoteData, saveNoteData, saveNoteMetadata, getNotes } from '../lib/db';

interface NoteEditorProps {
  noteId: string;
  onClose: () => void;
}

export default function NoteEditor({ noteId, onClose }: NoteEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  
  const [tool, setTool] = useState<Tool>('pencil');
  const [title, setTitle] = useState('Untitled Note');
  const [isSaving, setIsSaving] = useState(false);
  
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const hasUnsavedChanges = useRef(false);
  const activePointerId = useRef<number | null>(null);

  // Initialize canvas and load data
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Load metadata
    getNotes().then(notes => {
      const note = notes.find(n => n.id === noteId);
      if (note) setTitle(note.title);
    });

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Set actual size in memory (scaled to account for extra pixel density)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Normalize coordinate system to use css pixels
    const ctx = canvas.getContext('2d', { desynchronized: true });
    if (!ctx) return;
    
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;

    // Load existing drawing
    getNoteData(noteId).then(dataUrl => {
      if (dataUrl) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
        };
        img.src = dataUrl;
      } else {
        // Fill white background for new notes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, rect.height);
      }
    });

    const handleResize = () => {
      // In a full app, we'd save the image data, resize canvas, and redraw
      // For this prototype, we'll just keep the original size to prevent data loss
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [noteId]);

  // Handle drawing events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPos = (e: PointerEvent) => {
      return {
        x: e.offsetX,
        y: e.offsetY
      };
    };

    const handlePointerDown = (e: PointerEvent) => {
      // Prevent default to stop any browser-level gesture handling that might cause latency
      e.preventDefault();
      
      // If we are already drawing with another pointer, ignore this one
      if (activePointerId.current !== null) return;
      
      activePointerId.current = e.pointerId;
      isDrawing.current = true;
      hasUnsavedChanges.current = true;
      canvas.setPointerCapture(e.pointerId);
      
      const pos = getPos(e);
      lastPos.current = pos;
      
      const ctx = ctxRef.current;
      if (!ctx) return;

      // Setup context for current tool
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 40; // Eraser size
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#171717'; // Neutral 900
        ctx.lineWidth = 4; // Constant width for pencil
      }

      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDrawing.current || !lastPos.current || e.pointerId !== activePointerId.current) return;
      
      const ctx = ctxRef.current;
      if (!ctx) return;

      // Use coalesced events for smoother curves
      const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      
      // Also consider predicted events for even lower perceived latency
      const predictedEvents = e.getPredictedEvents ? e.getPredictedEvents() : [];
      
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      
      for (const event of [...events, ...predictedEvents]) {
        const pos = getPos(event);
        ctx.lineTo(pos.x, pos.y);
        lastPos.current = pos;
      }
      ctx.stroke();
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerId !== activePointerId.current) return;
      isDrawing.current = false;
      lastPos.current = null;
      activePointerId.current = null;
      canvas.releasePointerCapture(e.pointerId);
    };

    canvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
    canvas.addEventListener('pointermove', handlePointerMove, { passive: false });
    canvas.addEventListener('pointerup', handlePointerUp, { passive: false });
    canvas.addEventListener('pointercancel', handlePointerUp, { passive: false });

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [tool]);

  // Auto-save mechanism
  const saveNote = useCallback(async () => {
    if (!hasUnsavedChanges.current || !canvasRef.current) return;
    
    setIsSaving(true);
    try {
      const canvas = canvasRef.current;
      const dataUrl = canvas.toDataURL('image/png');
      
      // Create a smaller preview
      const previewCanvas = document.createElement('canvas');
      const previewCtx = previewCanvas.getContext('2d');
      const scale = 300 / canvas.width;
      previewCanvas.width = 300;
      previewCanvas.height = canvas.height * scale;
      
      if (previewCtx) {
        // Fill white background for preview
        previewCtx.fillStyle = '#ffffff';
        previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
      }
      
      const previewDataUrl = previewCanvas.toDataURL('image/jpeg', 0.8);

      await saveNoteData(noteId, dataUrl);
      
      const noteMeta: Note = {
        id: noteId,
        title,
        updatedAt: Date.now(),
        previewDataUrl
      };
      await saveNoteMetadata(noteMeta);
      
      hasUnsavedChanges.current = false;
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setIsSaving(false);
    }
  }, [noteId, title]);

  // Save on unmount or title change
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasUnsavedChanges.current) {
        saveNote();
      }
    }, 5000); // Auto-save every 5 seconds if changes exist
    
    return () => {
      clearInterval(interval);
      if (hasUnsavedChanges.current) {
        saveNote();
      }
    };
  }, [saveNote]);

  const handleBack = async () => {
    if (hasUnsavedChanges.current) {
      await saveNote();
    }
    onClose();
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    hasUnsavedChanges.current = true;
  };

  return (
    <div className="fixed inset-0 bg-neutral-100 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-4 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <button 
            onClick={handleBack}
            className="p-2 -ml-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            className="text-lg font-medium text-neutral-900 bg-transparent border-none focus:outline-none focus:ring-0 w-full max-w-md placeholder-neutral-400"
            placeholder="Note Title"
          />
        </div>

        <div className="flex items-center justify-center gap-2 flex-1">
          <button
            onClick={() => setTool('pencil')}
            className={`p-3 rounded-xl transition-all ${
              tool === 'pencil' 
                ? 'bg-neutral-900 text-white shadow-md scale-105' 
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
            title="Pencil"
          >
            <Pencil size={20} />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-3 rounded-xl transition-all ${
              tool === 'eraser' 
                ? 'bg-neutral-900 text-white shadow-md scale-105' 
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
            title="Eraser"
          >
            <Eraser size={20} />
          </button>
        </div>

        <div className="flex items-center justify-end gap-4 flex-1">
          <span className="text-xs text-neutral-400 font-medium">
            {isSaving ? 'Saving...' : 'Saved'}
          </span>
        </div>
      </div>

      {/* Canvas Area */}
      <div 
        ref={containerRef} 
        className="flex-1 relative bg-neutral-200/50 overflow-hidden"
        style={{ touchAction: 'none' }}
      >
        <div className="absolute inset-4 md:inset-8 bg-white rounded-2xl shadow-sm overflow-hidden border border-neutral-200/60">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair block"
            style={{ 
              touchAction: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
              WebkitTouchCallout: 'none'
            }}
          />
        </div>
      </div>
    </div>
  );
}
