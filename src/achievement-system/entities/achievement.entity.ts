import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm"
import { UserAchievement } from "./user-achievement.entity"
import { UnlockableContent } from "./unlockable-content.entity"

export enum AchievementType {
  MILESTONE = "milestone",
  STREAK = "streak",
  COLLECTION = "collection",
  SOCIAL = "social",
  TIME_BASED = "time_based",
  SKILL = "skill",
}

export enum AchievementRarity {
  COMMON = "common",
  UNCOMMON = "uncommon",
  RARE = "rare",
  EPIC = "epic",
  LEGENDARY = "legendary",
}

@Entity("achievements")
export class Achievement {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ unique: true })
  key: string

  @Column()
  name: string

  @Column("text")
  description: string

  @Column({
    type: "enum",
    enum: AchievementType,
    default: AchievementType.MILESTONE,
  })
  type: AchievementType

  @Column({
    type: "enum",
    enum: AchievementRarity,
    default: AchievementRarity.COMMON,
  })
  rarity: AchievementRarity

  @Column({ nullable: true })
  iconUrl: string

  @Column({ default: 0 })
  points: number

  @Column("jsonb", { nullable: true })
  unlockConditions: Record<string, any>

  @Column({ default: true })
  isActive: boolean

  @Column({ default: false })
  isHidden: boolean

  @Column({ nullable: true })
  category: string

  @Column({ default: 1 })
  sortOrder: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(
    () => UserAchievement,
    (userAchievement) => userAchievement.achievement,
  )
  userAchievements: UserAchievement[]

  @OneToMany(
    () => UnlockableContent,
    (content) => content.achievement,
  )
  unlockableContents: UnlockableContent[]
}
