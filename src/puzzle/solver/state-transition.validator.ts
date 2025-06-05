import { PuzzleState } from '../interfaces/puzzle.interfaces';

export class StateTransitionValidator {
  private transitionRules: Map<
    string,
    Array<(from: PuzzleState, to: PuzzleState) => boolean>
  > = new Map();

  addTransitionRule(
    puzzleType: string,
    rule: (from: PuzzleState, to: PuzzleState) => boolean,
  ): void {
    if (!this.transitionRules.has(puzzleType)) {
      this.transitionRules.set(puzzleType, []);
    }
    this.transitionRules.get(puzzleType)!.push(rule);
  }

  validateTransition(
    puzzleType: string,
    fromState: PuzzleState,
    toState: PuzzleState,
  ): boolean {
    const rules = this.transitionRules.get(puzzleType) || [];
    return rules.every((rule) => rule(fromState, toState));
  }
}
