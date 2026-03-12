import { get, set, del } from 'idb-keyval';
import { Note } from '../types';

const NOTES_KEY = 'notes_metadata';

export async function getNotes(): Promise<Note[]> {
  const notes = await get<Note[]>(NOTES_KEY);
  return notes || [];
}

export async function saveNoteMetadata(note: Note): Promise<void> {
  const notes = await getNotes();
  const existingIndex = notes.findIndex(n => n.id === note.id);
  if (existingIndex >= 0) {
    notes[existingIndex] = note;
  } else {
    notes.push(note);
  }
  // Sort by updated at, descending
  notes.sort((a, b) => b.updatedAt - a.updatedAt);
  await set(NOTES_KEY, notes);
}

export async function deleteNote(id: string): Promise<void> {
  const notes = await getNotes();
  const updatedNotes = notes.filter(n => n.id !== id);
  await set(NOTES_KEY, updatedNotes);
  await del(`note_data_${id}`);
}

export async function getNoteData(id: string): Promise<string | undefined> {
  return await get<string>(`note_data_${id}`);
}

export async function saveNoteData(id: string, dataUrl: string): Promise<void> {
  await set(`note_data_${id}`, dataUrl);
}
