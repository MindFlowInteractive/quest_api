import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

export enum ContentType {
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  INTERACTIVE = "interactive",
  QUIZ = "quiz",
}

export enum ContentStatus {
  DRAFT = "draft",
  REVIEW = "review",
  APPROVED = "approved",
  PUBLISHED = "published",
  ARCHIVED = "archived",
}

@Entity("tutorial_content")
@Index(["contentType", "status"])
@Index(["tutorialId", "stepId"])
export class TutorialContent {
  @PrimaryGeneratedColumn("uuid")
  id!: string

  @Column()
  title!: string

  @Column("text")
  content!: string

  @Column({ type: "enum", enum: ContentType })
  contentType!: ContentType

  @Column({ type: "enum", enum: ContentStatus, default: ContentStatus.DRAFT })
  status!: ContentStatus

  @Column({ default: "en" })
  language!: string

  @Column("uuid", { nullable: true })
  tutorialId?: string

  @Column("uuid", { nullable: true })
  stepId?: string

  @Column({ type: "json", nullable: true })
  mediaUrls?: {
    images?: string[]
    videos?: string[]
    audio?: string[]
  }

  @Column({ type: "json", nullable: true })
  interactiveElements?: {
    buttons?: Array<{ id: string; label: string; action: string }>
    inputs?: Array<{ id: string; type: string; validation: any }>
    hotspots?: Array<{ x: number; y: number; action: string }>
  }

  @Column({ type: "json", nullable: true })
  accessibility?: {
    altText?: string
    audioDescription?: string
    transcript?: string
    captions?: string
  }

  @Column({ type: "json", nullable: true })
  metadata?: {
    author?: string
    version?: string
    tags?: string[]
    difficulty?: string
    estimatedTime?: number
    quality?: "draft" | "reviewed" | "approved"
  }

  @Column({ nullable: true })
  publishedAt?: Date

  @Column({ nullable: true })
  archivedAt?: Date

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
