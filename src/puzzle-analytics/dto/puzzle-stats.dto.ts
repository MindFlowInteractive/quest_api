export class PuzzleStatsDto {
  puzzleId: string
  totalAttempts: number
  totalCompletions: number
  completionRate: number
  averageCompletionTime: number | null
  averageScore: number | null
  averageDifficulty: number | null
  averageHintsUsed: number
}

export class UserStatsDto {
  userId: string
  totalPuzzlesSolved: number
  totalAttempts: number
  averageCompletionTime: number | null
  averageScore: number | null
  totalHintsUsed: number
  completionRate: number
}

export class AnalyticsOverviewDto {
  totalUsers: number
  totalPuzzles: number
  totalAttempts: number
  totalCompletions: number
  overallCompletionRate: number
  averageCompletionTime: number | null
}
