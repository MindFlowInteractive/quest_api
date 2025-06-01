import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  Req,
  Res,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { FileUploadService } from "../providers/file-upload.service";
import { FileSharingService } from "../providers/file-sharing.service";
import { FileAnalyticsService } from "../providers/file-analytics.service";
import { StorageService } from "../providers/storage.service";
import {
  BulkOperationDto,
  FileSearchDto,
  FileShareDto,
  FileUploadDto,
} from "../dto/file-upload.dto";
import { ShareType } from "../entities/file-share.entity";

@ApiTags("file-upload")
@Controller("file-upload")
export class FileUploadController {
  constructor(
    private readonly fileUploadService: FileUploadService,
    private readonly fileSharingService: FileSharingService,
    private readonly analyticsService: FileAnalyticsService,
    private readonly storageService: StorageService,
  ) {}

  @Post("upload")
  @ApiOperation({ summary: "Upload a single file" })
  @ApiConsumes("multipart/form-data")
  @ApiResponse({ status: 201, description: "File uploaded successfully" })
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: FileUploadDto,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException("File is required");
    }

    const userId = (req.headers["user-id"] as string) || "mock-user-id";

    const result = await this.fileUploadService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      userId,
      uploadDto,
      {
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
      },
    );

    return {
      success: true,
      message: "File uploaded successfully",
      data: {
        file: {
          id: result.file.id,
          originalName: result.file.originalName,
          fileName: result.file.fileName,
          size: result.file.size,
          mimeType: result.file.mimeType,
          fileType: result.file.fileType,
          publicUrl: result.file.publicUrl,
          thumbnailUrl: result.file.thumbnailUrl,
          status: result.file.status,
          createdAt: result.file.createdAt,
        },
        processingResult: result.processingResult,
      },
      warnings: result.warnings,
    };
  }

  @Post("upload/multiple")
  @ApiOperation({ summary: "Upload multiple files" })
  @ApiConsumes("multipart/form-data")
  @ApiResponse({ status: 201, description: "Files uploaded successfully" })
  @UseInterceptors(FilesInterceptor("files", 10))
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() uploadDto: FileUploadDto,
    @Req() req: Request,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException("At least one file is required");
    }

    const userId = (req.headers["user-id"] as string) || "mock-user-id";
    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await this.fileUploadService.uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype,
          userId,
          uploadDto,
          {
            userAgent: req.headers["user-agent"],
            ipAddress: req.ip,
          },
        );
        results.push(result);
      } catch (error) {
        errors.push({
          fileName: file.originalname,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      success: errors.length === 0,
      message: `${results.length} files uploaded successfully`,
      data: {
        uploaded: results.map((r) => ({
          id: r.file.id,
          originalName: r.file.originalName,
          size: r.file.size,
          status: r.file.status,
        })),
        errors,
      },
    };
  }

  @Get("presigned-url")
  @ApiOperation({ summary: "Get presigned URL for direct upload" })
  @ApiResponse({ status: 200, description: "Presigned URL generated successfully" })
  async getPresignedUploadUrl(
    @Query("fileName") fileName: string,
    @Query("contentType") contentType: string,
    @Query("contentLength") contentLength?: number,
    @Req() req?: Request,
  ) {
    const userId = (req?.headers["user-id"] as string) || "mock-user-id";

    const result = await this.storageService.getPresignedUploadUrl(fileName, userId, {
      contentType,
      contentLength,
      expiresIn: 3600, // 1 hour
    });

    return {
      success: true,
      data: result,
    };
  }

  @Get("files")
  @ApiOperation({ summary: "Get user files with search and pagination" })
  @ApiResponse({ status: 200, description: "Files retrieved successfully" })
  async getUserFiles(@Query() searchDto: FileSearchDto, @Req() req: Request) {
    const userId = (req.headers["user-id"] as string) || "mock-user-id";

    const result = await this.fileUploadService.getUserFiles(userId, searchDto);

    return {
      success: true,
      data: result,
    };
  }

  @Get("files/:fileId")
  @ApiOperation({ summary: "Get file details" })
  @ApiResponse({ status: 200, description: "File details retrieved successfully" })
  async getFile(@Param("fileId") fileId: string, @Req() req: Request) {
    const userId = (req.headers["user-id"] as string) || "mock-user-id";

    const file = await this.fileUploadService.getFile(fileId, userId);

    return {
      success: true,
      data: file,
    };
  }

  @Delete("files/:fileId")
  @ApiOperation({ summary: "Delete a file" })
  @ApiResponse({ status: 200, description: "File deleted successfully" })
  async deleteFile(@Param("fileId") fileId: string, @Req() req: Request) {
    const userId = (req.headers["user-id"] as string) || "mock-user-id";

    await this.fileUploadService.deleteFile(fileId, userId);

    return {
      success: true,
      message: "File deleted successfully",
    };
  }

  @Post("files/bulk")
  @ApiOperation({ summary: "Perform bulk operations on files" })
  @ApiResponse({ status: 200, description: "Bulk operation completed" })
  async bulkOperation(@Body() bulkDto: BulkOperationDto, @Req() req: Request) {
    const userId = (req.headers["user-id"] as string) || "mock-user-id";

    const result = await this.fileUploadService.bulkOperation(userId, bulkDto);

    return {
      success: result.failed === 0,
      message: `Bulk operation completed. Success: ${result.success}, Failed: ${result.failed}`,
      data: result,
    };
  }

  @Post("files/:fileId/share")
  @ApiOperation({ summary: "Create a file share" })
  @ApiResponse({ status: 201, description: "File share created successfully" })
  async createShare(
    @Param("fileId") fileId: string,
    @Body() shareDto: FileShareDto,
    @Req() req: Request,
  ) {
    const userId = (req.headers["user-id"] as string) || "mock-user-id";

    const result = await this.fileSharingService.createShare(
      fileId,
      userId,
      shareDto,
      ShareType.PUBLIC_LINK,
    );

    return {
      success: true,
      message: "File share created successfully",
      data: result,
    };
  }

  @Get("shared/:shareToken")
  @ApiOperation({ summary: "Access shared file" })
  @ApiResponse({ status: 200, description: "Shared file accessed successfully" })
  async getSharedFile(
    @Param("shareToken") shareToken: string, 
    @Query("password") password?: string
  ) {
    const { file, share } = await this.fileSharingService.getSharedFile(shareToken, password);

    return {
      success: true,
      data: {
        file: {
          id: file.id,
          originalName: file.originalName,
          size: file.size,
          mimeType: file.mimeType,
          fileType: file.fileType,
          thumbnailUrl: file.thumbnailUrl,
        },
        share: {
          shareType: share.shareType,
          expiresAt: share.expiresAt,
          permissions: share.permissions,
        },
      },
    };
  }

  @Get("shared/:shareToken/download")
  @ApiOperation({ summary: "Download shared file" })
  @ApiResponse({ status: 200, description: "File download initiated" })
  async downloadSharedFile(
    @Param("shareToken") shareToken: string,
    @Res() res: Response,
    @Req() req?: Request,
    @Query("password") password?: string,
  ) {
    const { file, downloadUrl } = await this.fileSharingService.downloadSharedFile(shareToken, password, {
      userAgent: req?.headers["user-agent"],
      ipAddress: req?.ip,
    });

    if (downloadUrl.startsWith("http")) {
      return res.redirect(downloadUrl);
    } else {
      return res.status(HttpStatus.OK).json({
        success: true,
        data: { downloadUrl },
      });
    }
  }

  @Get("shares")
  @ApiOperation({ summary: "Get user file shares" })
  @ApiResponse({ status: 200, description: "File shares retrieved successfully" })
  async getUserShares(@Req() req: Request) {
    const userId = (req.headers["user-id"] as string) || "mock-user-id";

    const shares = await this.fileSharingService.getUserShares(userId);

    return {
      success: true,
      data: shares,
    };
  }

  @Delete("shares/:shareId")
  @ApiOperation({ summary: "Delete a file share" })
  @ApiResponse({ status: 200, description: "File share deleted successfully" })
  async deleteShare(@Param("shareId") shareId: string, @Req() req: Request) {
    const userId = (req.headers["user-id"] as string) || "mock-user-id";

    // Note: If deleteShare method doesn't exist in FileSharingService, 
    // you need to implement it or use an alternative method
   
  }
}