import { Injectable } from '@nestjs/common';
import { IStorageService } from './storage.interface';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File, subPath: string): Promise<string> {
    const filename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const destinationPath = path.join(this.uploadDir, subPath);
    
    if (!fs.existsSync(destinationPath)) {
      fs.mkdirSync(destinationPath, { recursive: true });
    }

    const fullPath = path.join(destinationPath, filename);
    fs.writeFileSync(fullPath, file.buffer);
    
    return `/uploads/${subPath}/${filename}`;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    // Basic protection against directory traversal
    if (fileUrl.includes('..')) return;
    
    // Convert URL path back to file system path
    const relativePath = fileUrl.replace(/^\/uploads\//, '');
    const filePath = path.join(this.uploadDir, relativePath);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
