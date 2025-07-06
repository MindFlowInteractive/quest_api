export interface HintStrategy {
  getHint(puzzleState: any, level: number): string;
}
