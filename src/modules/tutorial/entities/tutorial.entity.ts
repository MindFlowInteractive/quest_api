import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from "typeorm"
import { TutorialStep } from "./tutorial-step.entity"
import { TutorialProgress } from "./utorial-progress.entity"

export enum TutorialType {
  BASIC = "basic",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
  SPECIALIZED = "specialized",
}

export enum TutorialCategory {
  ONBOARDING = "onboarding",
  PUZZLE_MECHANICS = "puzzle_mechanics",
  ADVANCED_STRATEGIES = "advanced_strategies",
  GAME_FEATURES = "game_features",
  ACCESSIBILITY = "accessibility",
}

export enum TutorialDifficulty {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
  EXPERT = "expert",
}

@Entity("tutorials")
@Index(["category", "difficulty"])
@Index(["isActive", "type"])
export class Tutorial {
  @PrimaryGeneratedColumn("uuid")
  id!: string

  @Column()
  title!: string

  @Column("text")
  description!: string

  @Column({ type: "enum", enum: TutorialType })
  type!: TutorialType

  @Column({ type: "enum", enum: TutorialCategory })
  category!: TutorialCategory

  @Column({ type: "enum", enum: TutorialDifficulty })
  difficulty!: TutorialDifficulty

  @Column({ default: 0 })
  orderIndex!: number

  @Column({ type: "json", nullable: true })
  prerequisites?: string[] // Tutorial IDs that must be completed first

  @Column({ type: "json", nullable: true })
  learningObjectives?: string[]

  @Column({ type: "json", nullable: true })
  tags?: string[]

  @Column({ default: 0 })
  estimatedDurationMinutes!: number

  @Column({ default: true })
  isActive!: boolean

  @Column({ default: false })
  isSkippable!: boolean

  @Column({ default: false })
  isAdaptive!: boolean

  @Column({ type: "json", nullable: true })
  adaptiveSettings?: {
    minSteps?: number
    maxSteps?: number
    difficultyAdjustment?: boolean
    pacingAdjustment?: boolean
  }

  @Column({ type: "json", nullable: true })
  accessibilityFeatures?: {
    screenReaderSupport?: boolean
    highContrast?: boolean
    largeText?: boolean
    audioNarration?: boolean
    subtitles?: boolean
  }

  @Column({ type: "json", nullable: true })
  metadata?: Record<string, any>

  @OneToMany(
    () => TutorialStep,
    (step) => step.tutorial,
    { cascade: true },
  )
  steps!: TutorialStep[]

  @OneToMany(
    () => TutorialProgress,
    (progress) => progress.tutorial,
  )
  progress!: TutorialProgress[]

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
