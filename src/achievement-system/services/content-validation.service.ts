import { Injectable } from "@nestjs/common"
import { ContentType } from "../entities" // Import ContentType from entities

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

@Injectable()
export class ContentValidationService {
  validateContentData(type: ContentType, contentData: Record<string, any>): ValidationResult {
    const errors: string[] = []

    switch (type) {
      case ContentType.BADGE:
        this.validateBadgeContent(contentData, errors)
        break
      case ContentType.AVATAR:
        this.validateAvatarContent(contentData, errors)
        break
      case ContentType.THEME:
        this.validateThemeContent(contentData, errors)
        break
      case ContentType.TITLE:
        this.validateTitleContent(contentData, errors)
        break
      case ContentType.CURRENCY:
        this.validateCurrencyContent(contentData, errors)
        break
      case ContentType.DISCOUNT:
        this.validateDiscountContent(contentData, errors)
        break
      case ContentType.EMOTE:
        this.validateEmoteContent(contentData, errors)
        break
      case ContentType.FEATURE:
        this.validateFeatureContent(contentData, errors)
        break
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  private validateBadgeContent(contentData: Record<string, any>, errors: string[]): void {
    if (!contentData.badgeColor) {
      errors.push("Badge must have a badgeColor")
    } else if (!this.isValidColor(contentData.badgeColor)) {
      errors.push("Badge color must be a valid hex color")
    }

    if (!contentData.icon) {
      errors.push("Badge must have an icon")
    }

    if (contentData.animation && typeof contentData.animation !== "boolean") {
      errors.push("Badge animation must be a boolean")
    }
  }

  private validateAvatarContent(contentData: Record<string, any>, errors: string[]): void {
    if (!contentData.frameStyle && !contentData.crownStyle) {
      errors.push("Avatar content must have either frameStyle or crownStyle")
    }

    if (contentData.gems && typeof contentData.gems !== "boolean") {
      errors.push("Avatar gems must be a boolean")
    }

    if (contentData.animation && typeof contentData.animation !== "boolean") {
      errors.push("Avatar animation must be a boolean")
    }
  }

  private validateThemeContent(contentData: Record<string, any>, errors: string[]): void {
    if (!contentData.themeName) {
      errors.push("Theme must have a themeName")
    }

    if (!contentData.primaryColor) {
      errors.push("Theme must have a primaryColor")
    } else if (!this.isValidColor(contentData.primaryColor)) {
      errors.push("Theme primaryColor must be a valid hex color")
    }

    if (contentData.secondaryColor && !this.isValidColor(contentData.secondaryColor)) {
      errors.push("Theme secondaryColor must be a valid hex color")
    }
  }

  private validateTitleContent(contentData: Record<string, any>, errors: string[]): void {
    if (!contentData.title) {
      errors.push("Title content must have a title")
    } else if (contentData.title.length > 50) {
      errors.push("Title must be 50 characters or less")
    }

    if (contentData.color && !this.isValidColor(contentData.color)) {
      errors.push("Title color must be a valid hex color")
    }
  }

  private validateCurrencyContent(contentData: Record<string, any>, errors: string[]): void {
    if (!contentData.amount) {
      errors.push("Currency content must have an amount")
    } else if (typeof contentData.amount !== "number" || contentData.amount <= 0) {
      errors.push("Currency amount must be a positive number")
    }

    if (!contentData.currencyType) {
      errors.push("Currency content must specify currencyType")
    }
  }

  private validateDiscountContent(contentData: Record<string, any>, errors: string[]): void {
    if (!contentData.percentage) {
      errors.push("Discount content must have a percentage")
    } else if (
      typeof contentData.percentage !== "number" ||
      contentData.percentage <= 0 ||
      contentData.percentage > 100
    ) {
      errors.push("Discount percentage must be between 1 and 100")
    }

    if (contentData.maxUses && (typeof contentData.maxUses !== "number" || contentData.maxUses <= 0)) {
      errors.push("Discount maxUses must be a positive number")
    }
  }

  private validateEmoteContent(contentData: Record<string, any>, errors: string[]): void {
    if (!contentData.emoteName) {
      errors.push("Emote content must have an emoteName")
    }

    if (!contentData.emoteUrl && !contentData.emoteData) {
      errors.push("Emote content must have either emoteUrl or emoteData")
    }
  }

  private validateFeatureContent(contentData: Record<string, any>, errors: string[]): void {
    if (!contentData.featureName) {
      errors.push("Feature content must have a featureName")
    }

    if (!contentData.featureKey) {
      errors.push("Feature content must have a featureKey")
    }

    if (
      contentData.expirationDays &&
      (typeof contentData.expirationDays !== "number" || contentData.expirationDays <= 0)
    ) {
      errors.push("Feature expirationDays must be a positive number")
    }
  }

  private isValidColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
  }
}
