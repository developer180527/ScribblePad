export interface Note {
  id: string;
  title: string;
  updatedAt: number;
  previewDataUrl?: string;
}

export type Tool = 'pencil' | 'eraser';
