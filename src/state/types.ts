import type { FigureType } from '../figures';
export interface FigureData {
  id: number;
  type: FigureType;
  name: string;
  woodColor: number | null;
  size: number;
  position: [number, number, number];
  rotation: number;
}
export interface SceneState {
  figures: FigureData[];
  selectedFigureId: number | null;
  figureViewId: number | null;
}
export interface SceneController {
  addFigure(type: FigureType): void;
  removeFigure(id: number): void;
  selectFigure(id: number | null): void;
  setColor(id: number, hex: number | null): void;
  setSize(id: number, size: number): void;
  setName(id: number, name: string): void;
  enterFigureView(id: number): void;
  exitFigureView(): void;
  getPreview(type: FigureType, hex: number | null): string;
  dispose(): void;
}
