import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm"
import { FileEntity } from "./file.entity"
import { User } from "@/modules/data-system/entities/user.entity"

export enum ShareType {
  PUBLIC_LINK = "public_link",
  PRIVATE_LINK = "private_link",
  USER_SHARE = "user_share",
  SOCIAL_MEDIA = "social_media",
}

@Entity("file_shares")
@Index(["shareToken"])
@Index(["fileId", "shareType"])
export class FileShare {
  @PrimaryGeneratedColumn("uuid")
  id!: string

  @Column({ type: "enum", enum: ShareType })
  shareType!: ShareType

  @Column({ unique: true })
  shareToken!: string

  @Column({ nullable: true })
  password!: string

  @Column({ nullable: true })
  expiresAt!: Date

  @Column({ default: 0 })
  maxDownloads!: number

  @Column({ default: 0 })
  downloadCount!: number

  @Column({ default: true })
  isActive!: boolean

  @Column({ type: "json", nullable: true })
  permissions?: Record<string, boolean>

  @Column({ type: "json", nullable: true })
  socialMetadata?: Record<string, any>

  @ManyToOne(
    () => FileEntity,
    (file) => file.shares,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "fileId" })
  file!: FileEntity

  @Column("uuid")
  fileId!: string

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "sharedWithUserId" })
  sharedWithUser?: User

  @Column("uuid", { nullable: true })
  sharedWithUserId?: string

  @ManyToOne(() => User)
  @JoinColumn({ name: "sharedByUserId" })
  sharedByUser!: User

  @Column("uuid")
  sharedByUserId!: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
