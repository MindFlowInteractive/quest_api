import { PuzzleState } from '../interfaces/puzzle.interfaces';

export interface CauseEffectRule {
  id: string;
  condition: (state: PuzzleState) => boolean;
  effect: (state: PuzzleState) => PuzzleState;
  priority: number;
}

export class CauseEffectEngine {
  private rules: Map<string, CauseEffectRule[]> = new Map();

  addRule(puzzleType: string, rule: CauseEffectRule): void {
    if (!this.rules.has(puzzleType)) {
      this.rules.set(puzzleType, []);
    }
    this.rules.get(puzzleType)!.push(rule);
    this.rules.get(puzzleType)!.sort((a, b) => b.priority - a.priority);
  }

  processEffects(puzzleType: string, state: PuzzleState): PuzzleState {
    const rules = this.rules.get(puzzleType) || [];
    let currentState = { ...state };

    for (const rule of rules) {
      if (rule.condition(currentState)) {
        currentState = rule.effect(currentState);
      }
    }

    return currentState;
  }
}
