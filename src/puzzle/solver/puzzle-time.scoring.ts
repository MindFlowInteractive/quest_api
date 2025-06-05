export class PuzzleTimerScoring {
  private timers: Map<string, { startTime: Date; pausedTime?: number }> = new Map();

  startTimer(puzzleId: string): void {
    this.timers.set(puzzleId, { startTime: new Date() });
  }

  pauseTimer(puzzleId: string): void {
    const timer = this.timers.get(puzzleId);
    if (timer && !timer.pausedTime) {
      timer.pausedTime = Date.now() - timer.startTime.getTime();
    }
  }

  resumeTimer(puzzleId: string): void {
    const timer = this.timers.get(puzzleId);
    if (timer && timer.pausedTime) {
      timer.startTime = new Date(Date.now() - timer.pausedTime);
      delete timer.pausedTime;
    }
  }

  getElapsedTime(puzzleId: string): number {
    const timer = this.timers.get(puzzleId);
    if (!timer) return 0;

    if (timer.pausedTime) {
      return timer.pausedTime;
    }
    
    return Date.now() - timer.startTime.getTime();
  }

  calculateTimeBonus(elapsedTime: number, targetTime: number): number {
    if (elapsedTime <= targetTime) {
      const ratio = (targetTime - elapsedTime) / targetTime;
      return Math.floor(ratio * 1000); // Max 1000 bonus points
    }
    return 0;
  }

  calculateScore(baseScore: number, timeBonus: number, movesPenalty: number, hintsUsed: number): number {
    const hintsPenalty = hintsUsed * 50; // 50 points per hint
    return Math.max(0, baseScore + timeBonus - movesPenalty - hintsPenalty);
  }
}