import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs/promises';
import { FileType } from '../entities/file.entity';
import type { FileProcessingOptionsDto } from '../dto/file-upload.dto';

export interface ProcessingResult {
  success: boolean;
  processedBuffer?: Buffer;
  thumbnailBuffer?: Buffer;
  metadata?: Record<string, any>;
  variants?: Record<string, Buffer>;
  error?: string;
}

export interface ImageVariant {
  name: string;
  width: number;
  height?: number;
  quality?: number;
  format?: string;
}

@Injectable()
export class MediaProcessingService {
  private readonly logger = new Logger(MediaProcessingService.name);

  private readonly imageVariants: ImageVariant[] = [
    { name: 'thumbnail', width: 150, height: 150, quality: 80 },
    { name: 'small', width: 400, quality: 85 },
    { name: 'medium', width: 800, quality: 85 },
    { name: 'large', width: 1200, quality: 90 },
  ];

  async processFile(
    buffer: Buffer,
    mimeType: string,
    fileType: FileType,
    options: FileProcessingOptionsDto = {},
  ): Promise<ProcessingResult> {
    try {
      switch (fileType) {
        case FileType.IMAGE:
          return await this.processImage(buffer, mimeType, options);
        case FileType.VIDEO:
          return await this.processVideo(buffer, mimeType, options);
        case FileType.AUDIO:
          return await this.processAudio(buffer, mimeType, options);
        case FileType.DOCUMENT:
          return await this.processDocument(buffer, mimeType, options);
        default:
          return { success: true, processedBuffer: buffer };
      }
    } catch (error) {
      this.logger.error('File processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async processImage(
    buffer: Buffer,
    mimeType: string,
    options: FileProcessingOptionsDto,
  ): Promise<ProcessingResult> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      let processedImage = image;

      // Apply transformations
      if (options.maxWidth || options.maxHeight) {
        processedImage = processedImage.resize(
          options.maxWidth,
          options.maxHeight,
          {
            fit: 'inside',
            withoutEnlargement: true,
          },
        );
      }

      // Set output format
      const outputFormat =
        options.outputFormat || this.getOptimalImageFormat(mimeType);
      if (outputFormat === 'jpeg') {
        processedImage = processedImage.jpeg({
          quality: options.quality || 85,
          progressive: options.progressive !== false,
        });
      } else if (outputFormat === 'png') {
        processedImage = processedImage.png({
          quality: options.quality || 85,
          progressive: options.progressive !== false,
        });
      } else if (outputFormat === 'webp') {
        processedImage = processedImage.webp({
          quality: options.quality || 85,
        });
      }

      const processedBuffer = await processedImage.toBuffer();

      // Generate thumbnail
      const thumbnailBuffer = await sharp(buffer)
        .resize(300, 300, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Generate variants
      const variants: Record<string, Buffer> = {};
      for (const variant of this.imageVariants) {
        try {
          let variantImage = sharp(buffer).resize(
            variant.width,
            variant.height,
            {
              fit: variant.height ? 'cover' : 'inside',
              withoutEnlargement: true,
            },
          );

          if (variant.format === 'webp') {
            variantImage = variantImage.webp({
              quality: variant.quality || 85,
            });
          } else {
            variantImage = variantImage.jpeg({
              quality: variant.quality || 85,
            });
          }

          variants[variant.name] = await variantImage.toBuffer();
        } catch (error) {
          this.logger.warn(
            `Failed to generate variant ${variant.name}:`,
            error,
          );
        }
      }

      return {
        success: true,
        processedBuffer,
        thumbnailBuffer,
        variants,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          channels: metadata.channels,
          density: metadata.density,
          hasAlpha: metadata.hasAlpha,
          orientation: metadata.orientation,
        },
      };
    } catch (error) {
      this.logger.error('Image processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async processVideo(
    buffer: Buffer,
    mimeType: string,
    options: FileProcessingOptionsDto,
  ): Promise<ProcessingResult> {
    try {
      // Save buffer to temporary file for ffmpeg processing
      const tempInputPath = `/tmp/input_${Date.now()}.${this.getExtensionFromMimeType(mimeType)}`;
      const tempOutputPath = `/tmp/output_${Date.now()}.mp4`;
      const tempThumbnailPath = `/tmp/thumb_${Date.now()}.jpg`;

      await fs.writeFile(tempInputPath, buffer);

      // Process video
      const processedBuffer = await new Promise<Buffer>((resolve, reject) => {
        ffmpeg(tempInputPath)
          .outputOptions([
            '-c:v libx264',
            '-preset medium',
            '-crf 23',
            '-c:a aac',
            '-b:a 128k',
            '-movflags +faststart',
          ])
          .output(tempOutputPath)
          .on('end', async () => {
            try {
              const processed = await fs.readFile(tempOutputPath);
              resolve(processed);
            } catch (error) {
              reject(error);
            }
          })
          .on('error', reject)
          .run();
      });

      // Generate thumbnail
      const thumbnailBuffer = await new Promise<Buffer>((resolve, reject) => {
        ffmpeg(tempInputPath)
          .screenshots({
            count: 1,
            folder: '/tmp',
            filename: path.basename(tempThumbnailPath),
            size: '300x300',
          })
          .on('end', async () => {
            try {
              const thumbnail = await fs.readFile(tempThumbnailPath);
              resolve(thumbnail);
            } catch (error) {
              reject(error);
            }
          })
          .on('error', reject);
      });

      // Get video metadata
      const metadata = await new Promise<any>((resolve, reject) => {
        ffmpeg.ffprobe(tempInputPath, (err: Error | null, metadata: any) => {
          if (err) reject(err);
          else resolve(metadata);
        });
      });

      // Cleanup temp files
      await Promise.all([
        fs.unlink(tempInputPath).catch(() => {}),
        fs.unlink(tempOutputPath).catch(() => {}),
        fs.unlink(tempThumbnailPath).catch(() => {}),
      ]);

      return {
        success: true,
        processedBuffer,
        thumbnailBuffer,
        metadata: {
          duration: metadata.format?.duration,
          bitrate: metadata.format?.bit_rate,
          size: metadata.format?.size,
          streams: metadata.streams?.map((stream: any) => ({
            codec_type: stream.codec_type,
            codec_name: stream.codec_name,
            width: stream.width,
            height: stream.height,
            duration: stream.duration,
          })),
        },
      };
    } catch (error) {
      this.logger.error('Video processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async processAudio(
    buffer: Buffer,
    mimeType: string,
    options: FileProcessingOptionsDto,
  ): Promise<ProcessingResult> {
    try {
      const tempInputPath = `/tmp/audio_input_${Date.now()}.${this.getExtensionFromMimeType(mimeType)}`;
      const tempOutputPath = `/tmp/audio_output_${Date.now()}.mp3`;

      await fs.writeFile(tempInputPath, buffer);

      // Process audio
      const processedBuffer = await new Promise<Buffer>((resolve, reject) => {
        ffmpeg(tempInputPath)
          .audioCodec('mp3')
          .audioBitrate('128k')
          .output(tempOutputPath)
          .on('end', async () => {
            try {
              const processed = await fs.readFile(tempOutputPath);
              resolve(processed);
            } catch (error) {
              reject(error);
            }
          })
          .on('error', reject)
          .run();
      });

      // Get audio metadata
      const metadata = await new Promise<any>((resolve, reject) => {
        ffmpeg.ffprobe(tempInputPath, (err: Error | null, metadata: any) => {
          if (err) reject(err);
          else resolve(metadata);
        });
      });

      // Cleanup temp files
      await Promise.all([
        fs.unlink(tempInputPath).catch(() => {}),
        fs.unlink(tempOutputPath).catch(() => {}),
      ]);

      return {
        success: true,
        processedBuffer,
        metadata: {
          duration: metadata.format?.duration,
          bitrate: metadata.format?.bit_rate,
          size: metadata.format?.size,
          codec: metadata.streams?.[0]?.codec_name,
          sampleRate: metadata.streams?.[0]?.sample_rate,
          channels: metadata.streams?.[0]?.channels,
        },
      };
    } catch (error) {
      this.logger.error('Audio processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async processDocument(
    buffer: Buffer,
    mimeType: string,
    options: FileProcessingOptionsDto,
  ): Promise<ProcessingResult> {
    // For now, just return the original buffer
    // In the future, you could add PDF processing, text extraction, etc.
    return {
      success: true,
      processedBuffer: buffer,
      metadata: {
        size: buffer.length,
        mimeType,
      },
    };
  }

  private getOptimalImageFormat(mimeType: string): string {
    if (mimeType.includes('png')) return 'png';
    if (mimeType.includes('webp')) return 'webp';
    return 'jpeg';
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'video/mp4': 'mp4',
      'video/avi': 'avi',
      'video/mov': 'mov',
      'video/wmv': 'wmv',
      'audio/mp3': 'mp3',
      'audio/wav': 'wav',
      'audio/flac': 'flac',
      'audio/aac': 'aac',
    };

    return mimeToExt[mimeType] || 'bin';
  }
}
