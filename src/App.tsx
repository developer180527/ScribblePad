/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Home from './components/Home';
import NoteEditor from './components/NoteEditor';

export default function App() {
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  return (
    <div className="w-full h-full antialiased text-neutral-900 selection:bg-neutral-200">
      {activeNoteId ? (
        <NoteEditor 
          noteId={activeNoteId} 
          onClose={() => setActiveNoteId(null)} 
        />
      ) : (
        <Home onOpenNote={setActiveNoteId} />
      )}
    </div>
  );
}
