import { PuzzleState } from '../interfaces/puzzle.interfaces';

export class PuzzleHistoryManager {
  private history: Map<string, PuzzleState[]> = new Map();
  private currentIndex: Map<string, number> = new Map();
  private maxHistorySize = 50;

  addState(puzzleId: string, state: PuzzleState): void {
    if (!this.history.has(puzzleId)) {
      this.history.set(puzzleId, []);
      this.currentIndex.set(puzzleId, -1);
    }

    const history = this.history.get(puzzleId)!;
    const currentIdx = this.currentIndex.get(puzzleId)!;

    // Remove any states after current index (for redo functionality)
    history.splice(currentIdx + 1);

    // Add new state
    history.push({ ...state });
    this.currentIndex.set(puzzleId, history.length - 1);

    // Maintain max history size
    if (history.length > this.maxHistorySize) {
      history.shift();
      this.currentIndex.set(puzzleId, history.length - 1);
    }
  }

  undo(puzzleId: string): PuzzleState | null {
    const currentIdx = this.currentIndex.get(puzzleId);
    if (currentIdx === undefined || currentIdx <= 0) return null;

    this.currentIndex.set(puzzleId, currentIdx - 1);
    return { ...this.history.get(puzzleId)![currentIdx - 1] };
  }

  redo(puzzleId: string): PuzzleState | null {
    const history = this.history.get(puzzleId);
    const currentIdx = this.currentIndex.get(puzzleId);

    if (
      !history ||
      currentIdx === undefined ||
      currentIdx >= history.length - 1
    )
      return null;

    this.currentIndex.set(puzzleId, currentIdx + 1);
    return { ...history[currentIdx + 1] };
  }

  canUndo(puzzleId: string): boolean {
    const currentIdx = this.currentIndex.get(puzzleId);
    return currentIdx !== undefined && currentIdx > 0;
  }

  canRedo(puzzleId: string): boolean {
    const history = this.history.get(puzzleId);
    const currentIdx = this.currentIndex.get(puzzleId);
    return (
      history !== undefined &&
      currentIdx !== undefined &&
      currentIdx < history.length - 1
    );
  }
}
