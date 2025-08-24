import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm"
import { Achievement } from "./achievement.entity"
import { UserUnlockedContent } from "./user-unlocked-content.entity"

export enum ContentType {
  BADGE = "badge",
  AVATAR = "avatar",
  THEME = "theme",
  FEATURE = "feature",
  DISCOUNT = "discount",
  TITLE = "title",
  EMOTE = "emote",
  CURRENCY = "currency",
}

@Entity("unlockable_contents")
export class UnlockableContent {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  name: string

  @Column("text")
  description: string

  @Column({
    type: "enum",
    enum: ContentType,
    default: ContentType.BADGE,
  })
  type: ContentType

  @Column("jsonb")
  contentData: Record<string, any>

  @Column({ nullable: true })
  imageUrl: string

  @Column("uuid", { nullable: true })
  achievementId: string

  @Column({ default: true })
  isActive: boolean

  @Column({ nullable: true })
  expiresAt: Date

  @Column({ default: 1 })
  sortOrder: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(
    () => Achievement,
    (achievement) => achievement.unlockableContents,
  )
  @JoinColumn({ name: "achievementId" })
  achievement: Achievement

  @OneToMany(
    () => UserUnlockedContent,
    (userContent) => userContent.content,
  )
  userUnlockedContents: UserUnlockedContent[]
}
