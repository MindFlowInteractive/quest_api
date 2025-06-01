import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

export enum HelpType {
  TOOLTIP = "tooltip",
  MODAL = "modal",
  SIDEBAR = "sidebar",
  OVERLAY = "overlay",
  INLINE = "inline",
}

export enum TriggerType {
  HOVER = "hover",
  CLICK = "click",
  FOCUS = "focus",
  AUTOMATIC = "automatic",
  MANUAL = "manual",
}

@Entity("contextual_help")
@Index(["gameContext", "isActive"])
@Index(["helpType", "triggerType"])
export class ContextualHelp {
  @PrimaryGeneratedColumn("uuid")
  id!: string

  @Column()
  title!: string

  @Column("text")
  content!: string

  @Column({ type: "enum", enum: HelpType })
  helpType!: HelpType

  @Column({ type: "enum", enum: TriggerType })
  triggerType!: TriggerType

  @Column()
  gameContext!: string // e.g., 'puzzle_solving', 'menu_navigation', 'settings'

  @Column({ nullable: true })
  targetElement?: string // CSS selector or element ID

  @Column({ type: "json", nullable: true })
  displayConditions?: {
    userLevel?: string
    completedTutorials?: string[]
    gameState?: Record<string, any>
    timeInGame?: number
  }

  @Column({ type: "json", nullable: true })
  positioning?: {
    placement?: "top" | "bottom" | "left" | "right"
    offset?: { x: number; y: number }
    arrow?: boolean
  }

  @Column({ type: "json", nullable: true })
  styling?: {
    theme?: string
    customCss?: string
    animation?: string
  }

  @Column({ default: 0 })
  priority!: number

  @Column({ default: true })
  isActive!: boolean

  @Column({ default: false })
  isDismissible!: boolean

  @Column({ default: 0 })
  maxDisplayCount!: number // 0 = unlimited

  @Column({ type: "json", nullable: true })
  localization?: Record<
    string,
    {
      title?: string
      content?: string
    }
  >

  @Column({ type: "json", nullable: true })
  analytics?: {
    displayCount?: number
    clickCount?: number
    dismissCount?: number
    averageViewTime?: number
  }

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
