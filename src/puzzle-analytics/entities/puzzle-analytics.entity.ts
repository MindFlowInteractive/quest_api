import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

@Entity("puzzle_analytics")
@Index(["puzzleId", "userId"])
@Index(["completedAt"])
export class PuzzleAnalytics {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ name: "puzzle_id", type: "varchar", length: 255 })
  @Index()
  puzzleId: string

  @Column({ name: "user_id", type: "varchar", length: 255 })
  @Index()
  userId: string

  @Column({ name: "completion_time_ms", type: "integer", nullable: true })
  completionTimeMs: number | null

  @Column({ name: "attempts_count", type: "integer", default: 1 })
  attemptsCount: number

  @Column({ name: "is_completed", type: "boolean", default: false })
  isCompleted: boolean

  @Column({ name: "difficulty_rating", type: "integer", nullable: true })
  difficultyRating: number | null

  @Column({ name: "hints_used", type: "integer", default: 0 })
  hintsUsed: number

  @Column({ name: "score", type: "integer", nullable: true })
  score: number | null

  @Column({ name: "completed_at", type: "timestamp", nullable: true })
  completedAt: Date | null

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date

  @Column({ name: "metadata", type: "jsonb", nullable: true })
  metadata: Record<string, any> | null
}
