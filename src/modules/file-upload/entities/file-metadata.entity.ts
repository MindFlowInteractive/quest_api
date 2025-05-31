import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm"
import { FileEntity } from "./file.entity"

@Entity("file_metadata")
export class FileMetadata {
  @PrimaryGeneratedColumn("uuid")
  id!: string

  @Column()
  key!: string

  @Column("text")
  value!: string

  @Column({ nullable: true })
  category!: string

  @ManyToOne(
    () => FileEntity,
    (file) => file.metadata,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "fileId" })
  file!: FileEntity

  @Column("uuid")
  fileId!: string

  @CreateDateColumn()
  createdAt!: Date
}
