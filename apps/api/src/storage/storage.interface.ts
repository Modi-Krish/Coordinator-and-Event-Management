export const STORAGE_SERVICE = 'STORAGE_SERVICE';

export interface IStorageService {
  uploadFile(file: Express.Multer.File, path: string): Promise<string>;
  deleteFile(fileUrl: string): Promise<void>;
}
