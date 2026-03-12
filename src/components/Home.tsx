import React, { useEffect, useState } from 'react';
import { Plus, FileEdit, Trash2 } from 'lucide-react';
import { Note } from '../types';
import { getNotes, deleteNote } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';

interface HomeProps {
  onOpenNote: (id: string) => void;
}

export default function Home({ onOpenNote }: HomeProps) {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    const loadedNotes = await getNotes();
    setNotes(loadedNotes);
  };

  const handleCreateNote = () => {
    const newId = uuidv4();
    onOpenNote(newId);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this note?')) {
      await deleteNote(id);
      await loadNotes();
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">Notes</h1>
          <button
            onClick={handleCreateNote}
            className="flex items-center gap-2 bg-neutral-900 text-white px-6 py-3 rounded-full font-medium hover:bg-neutral-800 transition-colors shadow-sm active:scale-95"
          >
            <Plus size={20} />
            New Note
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-neutral-400">
            <FileEdit size={48} className="mb-4 opacity-50" />
            <p className="text-lg">No notes yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {notes.map((note) => (
              <div
                key={note.id}
                onClick={() => onOpenNote(note.id)}
                className="group relative bg-white rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden aspect-[3/4] flex flex-col border border-neutral-200/60"
              >
                <div className="flex-1 bg-neutral-50 relative">
                  {note.previewDataUrl ? (
                    <img 
                      src={note.previewDataUrl} 
                      alt={note.title} 
                      className="absolute inset-0 w-full h-full object-contain p-4"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-neutral-300">
                      Empty
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-neutral-100 flex justify-between items-center bg-white z-10">
                  <div className="overflow-hidden">
                    <h3 className="font-medium text-neutral-900 truncate pr-2">{note.title}</h3>
                    <p className="text-xs text-neutral-500 mt-1">
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, note.id)}
                    className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                    aria-label="Delete note"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
