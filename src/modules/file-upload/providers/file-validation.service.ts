import { Injectable, Logger } from "@nestjs/common"
import * as crypto from "crypto"
import { fileTypeFromBuffer } from "file-type"
import { FileType } from "../entities/file.entity"

export interface ValidationResult {
  isValid: boolean
  fileType: FileType
  mimeType: string
  errors: string[]
  warnings: string[]
  securityFlags: string[]
}

export interface ValidationOptions {
  maxFileSize?: number
  allowedMimeTypes?: string[]
  allowedExtensions?: string[]
  scanForMalware?: boolean
  checkFileIntegrity?: boolean
}

@Injectable()
export class FileValidationService {
  private readonly logger = new Logger(FileValidationService.name)

  private readonly defaultMaxFileSize = 100 * 1024 * 1024 // 100MB
  private readonly dangerousExtensions = [
    ".exe",
    ".bat",
    ".cmd",
    ".com",
    ".pif",
    ".scr",
    ".vbs",
    ".js",
    ".jar",
    ".app",
    ".deb",
    ".pkg",
    ".dmg",
    ".msi",
    ".run",
  ]

  private readonly allowedMimeTypes = {
    [FileType.IMAGE]: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "image/bmp",
      "image/tiff",
    ],
    [FileType.VIDEO]: ["video/mp4", "video/avi", "video/mov", "video/wmv", "video/flv", "video/webm", "video/mkv"],
    [FileType.AUDIO]: ["audio/mp3", "audio/wav", "audio/flac", "audio/aac", "audio/ogg", "audio/wma", "audio/m4a"],
    [FileType.DOCUMENT]: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "text/csv",
      "application/rtf",
    ],
    [FileType.ARCHIVE]: [
      "application/zip",
      "application/x-rar-compressed",
      "application/x-7z-compressed",
      "application/x-tar",
      "application/gzip",
    ],
  }

  async validateFile(
    buffer: Buffer,
    originalName: string,
    declaredMimeType: string,
    options: ValidationOptions = {},
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      fileType: FileType.OTHER,
      mimeType: declaredMimeType,
      errors: [],
      warnings: [],
      securityFlags: [],
    }

    try {
      // Basic validations
      await this.validateFileSize(buffer, options.maxFileSize, result)
      await this.validateFileName(originalName, result)
      await this.detectActualFileType(buffer, declaredMimeType, result)
      await this.validateMimeType(result.mimeType, options.allowedMimeTypes, result)
      await this.performSecurityChecks(buffer, originalName, result)

      if (options.checkFileIntegrity) {
        await this.checkFileIntegrity(buffer, result)
      }

      if (options.scanForMalware) {
        await this.scanForMalware(buffer, result)
      }

      result.isValid = result.errors.length === 0
    } catch (error) {
      this.logger.error("File validation failed:", error)
      const errorMessage = (error instanceof Error) ? error.message : String(error)
      result.errors.push(`Validation error: ${errorMessage}`)
      result.isValid = false
    }

    return result
  }

  private async validateFileSize(buffer: Buffer, maxSize: number | undefined, result: ValidationResult): Promise<void> {
    const fileSize = buffer.length
    const limit = maxSize || this.defaultMaxFileSize

    if (fileSize === 0) {
      result.errors.push("File is empty")
      return
    }

    if (fileSize > limit) {
      result.errors.push(`File size ${fileSize} exceeds maximum allowed size ${limit}`)
      return
    }

    if (fileSize > 50 * 1024 * 1024) {
      // 50MB
      result.warnings.push("Large file size may impact performance")
    }
  }

  private async validateFileName(fileName: string, result: ValidationResult): Promise<void> {
    if (!fileName || fileName.trim().length === 0) {
      result.errors.push("File name is required")
      return
    }

    if (fileName.length > 255) {
      result.errors.push("File name is too long")
      return
    }

    // Check for dangerous file extensions
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf("."))
    if (this.dangerousExtensions.includes(extension)) {
      result.errors.push(`File extension ${extension} is not allowed for security reasons`)
      result.securityFlags.push("dangerous_extension")
      return
    }

    // Check for suspicious patterns
    if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
      result.errors.push("File name contains invalid characters")
      result.securityFlags.push("path_traversal_attempt")
      return
    }

    // Check for hidden files
    if (fileName.startsWith(".")) {
      result.warnings.push("Hidden file detected")
    }
  }

  private async detectActualFileType(
    buffer: Buffer,
    declaredMimeType: string,
    result: ValidationResult,
  ): Promise<void> {
    try {
      const detected = await fileTypeFromBuffer(buffer)

      if (detected) {
        result.mimeType = detected.mime

        // Check if declared MIME type matches detected type
        if (declaredMimeType !== detected.mime) {
          result.warnings.push(`Declared MIME type (${declaredMimeType}) differs from detected type (${detected.mime})`)
          result.securityFlags.push("mime_type_mismatch")
        }
      } else {
        // If we can't detect the file type, use the declared type but flag it
        result.warnings.push("Could not detect file type from content")
        result.securityFlags.push("undetectable_file_type")
      }

      // Determine file category
      result.fileType = this.categorizeFileType(result.mimeType)
    } catch (error) {
      result.warnings.push(
        `File type detection failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  private async validateMimeType(
    mimeType: string,
    allowedTypes: string[] | undefined,
    result: ValidationResult,
  ): Promise<void> {
    if (allowedTypes && allowedTypes.length > 0) {
      if (!allowedTypes.includes(mimeType)) {
        result.errors.push(`MIME type ${mimeType} is not allowed`)
        return
      }
    }

    // Check if MIME type is in our allowed categories
    const isAllowed = Object.values(this.allowedMimeTypes).flat().includes(mimeType)

    if (!isAllowed) {
      result.warnings.push(`MIME type ${mimeType} is not in the standard allowed list`)
    }
  }

  private async performSecurityChecks(buffer: Buffer, fileName: string, result: ValidationResult): Promise<void> {
    // Check for embedded scripts in images
    if (result.fileType === FileType.IMAGE) {
      const content = buffer.toString("utf8")
      if (content.includes("<script") || content.includes("javascript:")) {
        result.errors.push("Image contains embedded scripts")
        result.securityFlags.push("embedded_scripts")
      }
    }

    // Check for suspicious file headers
    const header = buffer.slice(0, 100).toString("hex")
    if (this.containsSuspiciousPatterns(header)) {
      result.warnings.push("File contains suspicious patterns")
      result.securityFlags.push("suspicious_patterns")
    }

    // Check for polyglot files (files that are valid in multiple formats)
    if (await this.isPolyglotFile(buffer)) {
      result.warnings.push("File appears to be a polyglot (valid in multiple formats)")
      result.securityFlags.push("polyglot_file")
    }
  }

  private async checkFileIntegrity(buffer: Buffer, result: ValidationResult): Promise<void> {
    try {
      // Generate checksums
      const md5 = crypto.createHash("md5").update(buffer).digest("hex")
      const sha256 = crypto.createHash("sha256").update(buffer).digest("hex")

      // Store checksums in metadata for later verification
      if (!result.warnings.find((w) => w.includes("checksums"))) {
        result.warnings.push(`Checksums generated: MD5=${md5.substring(0, 8)}..., SHA256=${sha256.substring(0, 8)}...`)
      }
    } catch (error) {
      result.warnings.push(
        `Integrity check failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  private async scanForMalware(buffer: Buffer, result: ValidationResult): Promise<void> {
    // This is a placeholder for malware scanning
    // In production, you would integrate with services like:
    // - ClamAV
    // - VirusTotal API
    // - AWS GuardDuty
    // - Microsoft Defender API

    try {
      // Simple signature-based detection for demonstration
      const signatures = [
        "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*", // EICAR test
      ]

      const content = buffer.toString("utf8")
      for (const signature of signatures) {
        if (content.includes(signature)) {
          result.errors.push("Malware signature detected")
          result.securityFlags.push("malware_detected")
          return
        }
      }

      result.warnings.push("Basic malware scan completed")
    } catch (error) {
      result.warnings.push(
        `Malware scan failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  private categorizeFileType(mimeType: string): FileType {
    for (const [category, types] of Object.entries(this.allowedMimeTypes)) {
      if (types.includes(mimeType)) {
        return category as FileType
      }
    }
    return FileType.OTHER
  }

  private containsSuspiciousPatterns(header: string): boolean {
    const suspiciousPatterns = [
      "4d5a", // PE executable
      "7f454c46", // ELF executable
      "cafebabe", // Java class file
      "feedface", // Mach-O executable
    ]

    return suspiciousPatterns.some((pattern) => header.toLowerCase().includes(pattern))
  }

  private async isPolyglotFile(buffer: Buffer): Promise<boolean> {
    // Check if file has multiple valid format signatures
    const header = buffer.slice(0, 20)
    let validFormats = 0

    // Check for common format signatures
    const signatures = [
      { format: "JPEG", signature: [0xff, 0xd8, 0xff] },
      { format: "PNG", signature: [0x89, 0x50, 0x4e, 0x47] },
      { format: "GIF", signature: [0x47, 0x49, 0x46, 0x38] },
      { format: "PDF", signature: [0x25, 0x50, 0x44, 0x46] },
      { format: "ZIP", signature: [0x50, 0x4b, 0x03, 0x04] },
    ]

    for (const { signature } of signatures) {
      if (this.matchesSignature(header, signature)) {
        validFormats++
      }
    }

    return validFormats > 1
  }

  private matchesSignature(buffer: Buffer, signature: number[]): boolean {
    if (buffer.length < signature.length) return false

    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) return false
    }

    return true
  }

  generateFileChecksum(buffer: Buffer, algorithm = "sha256"): string {
    return crypto.createHash(algorithm).update(buffer).digest("hex")
  }

  async validateFileIntegrity(buffer: Buffer, expectedChecksum: string, algorithm = "sha256"): Promise<boolean> {
    const actualChecksum = this.generateFileChecksum(buffer, algorithm)
    return actualChecksum === expectedChecksum
  }
}
