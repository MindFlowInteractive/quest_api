import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm"
import { UnlockableContent } from "./unlockable-content.entity"

@Entity("user_unlocked_contents")
@Index(["userId", "contentId"], { unique: true })
export class UserUnlockedContent {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column("uuid")
  userId: string

  @Column("uuid")
  contentId: string

  @Column({ default: false })
  isEquipped: boolean

  @Column({ nullable: true })
  equippedAt: Date

  @Column("jsonb", { nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  unlockedAt: Date

  @ManyToOne(
    () => UnlockableContent,
    (content) => content.userUnlockedContents,
  )
  @JoinColumn({ name: "contentId" })
  content: UnlockableContent
}
