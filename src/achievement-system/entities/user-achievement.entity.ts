import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm"
import { Achievement } from "./achievement.entity"

@Entity("user_achievements")
@Index(["userId", "achievementId"], { unique: true })
export class UserAchievement {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column("uuid")
  userId: string

  @Column("uuid")
  achievementId: string

  @Column("jsonb", { nullable: true })
  progress: Record<string, any>

  @Column({ default: false })
  isUnlocked: boolean

  @Column({ nullable: true })
  unlockedAt: Date

  @Column("jsonb", { nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(
    () => Achievement,
    (achievement) => achievement.userAchievements,
  )
  @JoinColumn({ name: "achievementId" })
  achievement: Achievement
}
