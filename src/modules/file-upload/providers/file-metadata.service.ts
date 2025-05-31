import { Injectable, Logger } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { FileMetadata } from "../entities/file-metadata.entity"

@Injectable()
export class FileMetadataService {
  private readonly logger = new Logger(FileMetadataService.name);

  constructor(
    @InjectRepository(FileMetadata)
    private readonly metadataRepository: Repository<FileMetadata>,
  ) {}

  async saveMetadata(fileId: string, metadata: Record<string, any>, category?: string): Promise<void> {
    const metadataEntries = Object.entries(metadata).map(([key, value]) =>
      this.metadataRepository.create({
        fileId,
        key,
        value: typeof value === "string" ? value : JSON.stringify(value),
        category,
      }),
    )

    await this.metadataRepository.save(metadataEntries)
  }

  async getMetadata(fileId: string, category?: string): Promise<Record<string, any>> {
    const whereCondition: any = { fileId }
    if (category) {
      whereCondition.category = category
    }

    const metadataEntries = await this.metadataRepository.find({
      where: whereCondition,
    })

    const metadata: Record<string, any> = {}
    metadataEntries.forEach((entry) => {
      try {
        metadata[entry.key] = JSON.parse(entry.value)
      } catch {
        metadata[entry.key] = entry.value
      }
    })

    return metadata
  }

  async updateMetadata(fileId: string, key: string, value: any, category?: string): Promise<void> {
    const existing = await this.metadataRepository.findOne({
      where: { fileId, key, category },
    })

    if (existing) {
      existing.value = typeof value === "string" ? value : JSON.stringify(value)
      await this.metadataRepository.save(existing)
    } else {
      await this.saveMetadata(fileId, { [key]: value }, category)
    }
  }

  async deleteMetadata(fileId: string, key?: string, category?: string): Promise<void> {
    const whereCondition: any = { fileId }
    if (key) whereCondition.key = key
    if (category) whereCondition.category = category

    await this.metadataRepository.delete(whereCondition)
  }
}
