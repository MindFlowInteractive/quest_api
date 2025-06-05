// Interface for puzzle state management
export interface PuzzleState<TState> {
  getState(): TState;
  setState(state: TState): void;
  resetState(): void;
}
