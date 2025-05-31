import { Injectable, Logger } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { TutorialContent, ContentStatus, ContentType } from "../entities/tutorial-content.entity"

export interface LocalizationData {
  language: string
  title: string
  content: string
  metadata?: {
    translator?: string
    reviewedBy?: string
    translationDate?: Date
    quality?: "draft" | "reviewed" | "approved"
  }
}

export interface AccessibilityOptions {
  screenReader: boolean
  highContrast: boolean
  largeText: boolean
  audioNarration: boolean
  subtitles: boolean
  signLanguage: boolean
  simplifiedLanguage: boolean
}

@Injectable()
export class TutorialLocalizationService {
  private readonly logger = new Logger(TutorialLocalizationService.name)

  private readonly supportedLanguages = ["en", "es", "fr", "de", "it", "pt", "ru", "zh", "ja", "ko", "ar", "hi"]

  private readonly rtlLanguages = ["ar", "he", "fa", "ur"];

  constructor(
    @InjectRepository(TutorialContent)
    private contentRepository: Repository<TutorialContent>,
  ) { }

  async getLocalizedContent(
    tutorialId: string,
    stepId: string,
    language: string,
    accessibilityOptions?: AccessibilityOptions,
  ): Promise<TutorialContent | null> {
    // Try to get content in requested language
    let content = await this.contentRepository.findOne({
      where: {
        tutorialId,
        stepId,
        language,
        status: ContentStatus.PUBLISHED,
      },
    })

    // Fallback to English if requested language not available
    if (!content && language !== "en") {
      content = await this.contentRepository.findOne({
        where: {
          tutorialId,
          stepId,
          language: "en",
          status: ContentStatus.PUBLISHED,
        },
      })
    }

    if (!content) {
      return null
    }

    // Apply accessibility modifications
    if (accessibilityOptions) {
      content = await this.applyAccessibilityOptions(content, accessibilityOptions)
    }

    return content
  }

  async createLocalizedContent(
    tutorialId: string,
    stepId: string,
    localizationData: LocalizationData,
  ): Promise<TutorialContent> {
    const content = this.contentRepository.create({
      tutorialId,
      stepId,
      title: localizationData.title,
      content: localizationData.content,
      language: localizationData.language,
      contentType: ContentType.TEXT,
      status: ContentStatus.DRAFT,
      metadata: localizationData.metadata,
    })

    return await this.contentRepository.save(content) as TutorialContent
  }

  async updateLocalizedContent(contentId: string, updates: Partial<LocalizationData>): Promise<TutorialContent> {
    const content = await this.contentRepository.findOne({ where: { id: contentId } })
    if (!content) {
      throw new Error("Content not found")
    }

    if (updates.title) content.title = updates.title
    if (updates.content) content.content = updates.content
    if (updates.metadata) {
      content.metadata = { ...content.metadata, ...updates.metadata }
    }

    return this.contentRepository.save(content)
  }

  async getAvailableLanguages(tutorialId: string): Promise<string[]> {
    const contents = await this.contentRepository.find({
      where: { tutorialId, status: ContentStatus.PUBLISHED },
      select: ["language"],
    })

    const languages = [...new Set(contents.map((c) => c.language))]
    return languages.sort()
  }

  async getTranslationProgress(tutorialId: string): Promise<
    Record<
      string,
      {
        totalSteps: number
        translatedSteps: number
        reviewedSteps: number
        publishedSteps: number
        completionPercentage: number
      }
    >
  > {
    const allContent = await this.contentRepository.find({
      where: { tutorialId },
    })

    const progress: Record<string, any> = {}

    // Get total steps count (from English content)
    const englishContent = allContent.filter((c) => c.language === "en")
    const totalSteps = englishContent.length

    for (const language of this.supportedLanguages) {
      const languageContent = allContent.filter((c) => c.language === language)

      const translatedSteps = languageContent.length
      const reviewedSteps = languageContent.filter(
        (c) => c.metadata?.quality === "reviewed" || c.metadata?.quality === "approved",
      ).length
      const publishedSteps = languageContent.filter((c) => c.status === ContentStatus.PUBLISHED).length

      const completionPercentage = totalSteps > 0 ? (publishedSteps / totalSteps) * 100 : 0

      progress[language] = {
        totalSteps,
        translatedSteps,
        reviewedSteps,
        publishedSteps,
        completionPercentage,
      }
    }

    return progress
  }

  async generateAccessibleContent(
    originalContent: string,
    accessibilityType: "simple_language" | "screen_reader" | "audio_description",
  ): Promise<string> {
    switch (accessibilityType) {
      case "simple_language":
        return this.simplifyLanguage(originalContent)
      case "screen_reader":
        return this.optimizeForScreenReader(originalContent)
      case "audio_description":
        return this.addAudioDescriptions(originalContent)
      default:
        return originalContent
    }
  }

  async validateTranslation(
    originalContent: string,
    translatedContent: string,
    targetLanguage: string,
  ): Promise<{
    isValid: boolean
    issues: string[]
    suggestions: string[]
    quality: "poor" | "fair" | "good" | "excellent"
  }> {
    const issues: string[] = []
    const suggestions: string[] = []

    // Check length difference
    const lengthRatio = translatedContent.length / originalContent.length
    if (lengthRatio < 0.5 || lengthRatio > 2.0) {
      issues.push("Translation length significantly differs from original")
    }

    // Check for untranslated placeholders
    const placeholderRegex = /\{[^}]+\}/g
    const originalPlaceholders = originalContent.match(placeholderRegex) || []
    const translatedPlaceholders = translatedContent.match(placeholderRegex) || []

    if (originalPlaceholders.length !== translatedPlaceholders.length) {
      issues.push("Placeholder count mismatch between original and translation")
    }

    // Check for HTML tags preservation
    const htmlTagRegex = /<[^>]+>/g
    const originalTags = originalContent.match(htmlTagRegex) || []
    const translatedTags = translatedContent.match(htmlTagRegex) || []

    if (originalTags.length !== translatedTags.length) {
      issues.push("HTML tag count mismatch")
    }

    // Language-specific checks
    if (this.rtlLanguages.includes(targetLanguage)) {
      suggestions.push("Consider RTL layout adjustments")
    }

    // Determine quality
    let quality: "poor" | "fair" | "good" | "excellent" = "excellent"
    if (issues.length > 3) quality = "poor"
    else if (issues.length > 1) quality = "fair"
    else if (issues.length > 0) quality = "good"

    return {
      isValid: issues.length === 0,
      issues,
      suggestions,
      quality,
    }
  }

  async exportTranslationPackage(
    tutorialId: string,
    language: string,
  ): Promise<{
    filename: string
    content: string
    format: "json" | "csv" | "xliff"
  }> {
    const contents = await this.contentRepository.find({
      where: { tutorialId, language },
      order: { stepId: "ASC" },
    })

    const translationData = contents.map((content) => ({
      stepId: content.stepId,
      title: content.title,
      content: content.content,
      status: content.status,
      metadata: content.metadata,
    }))

    const filename = `tutorial_${tutorialId}_${language}.json`
    const content = JSON.stringify(translationData, null, 2)

    return {
      filename,
      content,
      format: "json",
    }
  }

  async importTranslationPackage(
    tutorialId: string,
    language: string,
    packageContent: string,
    format: "json" | "csv" | "xliff" = "json",
  ): Promise<{
    imported: number
    errors: string[]
  }> {
    const errors: string[] = []
    let imported = 0

    try {
      let translationData: any[]

      if (format === "json") {
        translationData = JSON.parse(packageContent)
      } else {
        throw new Error(`Format ${format} not yet supported`)
      }

      for (const item of translationData) {
        try {
          await this.createLocalizedContent(tutorialId, item.stepId, {
            language,
            title: item.title,
            content: item.content,
            metadata: item.metadata,
          })
          imported++
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          errors.push(`Failed to import step ${item.stepId}: ${errorMsg}`)
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`Failed to parse translation package: ${message}`)
    }

    return { imported, errors }
  }

  private async applyAccessibilityOptions(
    content: TutorialContent,
    options: AccessibilityOptions,
  ): Promise<TutorialContent> {
    const modifiedContent = { ...content }

    if (options.simplifiedLanguage) {
      modifiedContent.content = await this.generateAccessibleContent(content.content, "simple_language")
    }

    if (options.screenReader) {
      modifiedContent.content = await this.generateAccessibleContent(content.content, "screen_reader")
    }

    // Add accessibility metadata
    if (!modifiedContent.accessibility) {
      modifiedContent.accessibility = {}
    }

    if (options.audioNarration && content.mediaUrls?.audio) {
      modifiedContent.accessibility.audioDescription = content.mediaUrls.audio[0]
    }

    if (options.subtitles) {
      modifiedContent.accessibility.captions = "Available"
    }

    return modifiedContent
  }

  private simplifyLanguage(content: string): string {
    // Basic language simplification
    return content
      .replace(/\b(utilize|utilization)\b/gi, "use")
      .replace(/\b(demonstrate)\b/gi, "show")
      .replace(/\b(accomplish)\b/gi, "do")
      .replace(/\b(subsequently)\b/gi, "then")
      .replace(/\b(approximately)\b/gi, "about")
      .replace(/\b(commence)\b/gi, "start")
      .replace(/\b(terminate)\b/gi, "end")
  }

  private optimizeForScreenReader(content: string): string {
    // Add screen reader optimizations
    return content
      .replace(/<img([^>]*?)>/gi, '<img$1 role="img">')
      .replace(/<button([^>]*?)>/gi, '<button$1 role="button">')
      .replace(/\b(click here)\b/gi, "select this button")
      .replace(/\b(see below)\b/gi, "described next")
  }

  private addAudioDescriptions(content: string): string {
    // Add audio description markers
    return content.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, "$& [Audio description: Image showing tutorial step]")
  }
}
