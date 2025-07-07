import { HintStrategy } from '../interfaces/hint-strategy.interface';

export class SudokuHintStrategy implements HintStrategy {
  getHint(state: any, level: number): string {
    switch (level) {
      case 1:
        return 'Look for rows or columns with one missing number.';
      case 2:
        return 'Use the elimination method on cells with fewer candidates.';
      case 3:
        return 'Cell [3,4] can only be 7 due to block restrictions.';
      default:
        return 'Try scanning rows, columns, and boxes together.';
    }
  }
}