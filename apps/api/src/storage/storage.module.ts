import { Module } from '@nestjs/common';
import { STORAGE_SERVICE } from './storage.interface';
import { LocalStorageService } from './local-storage.service';

@Module({
  providers: [
    {
      provide: STORAGE_SERVICE,
      useClass: LocalStorageService, // We can swap this with S3StorageService later based on process.env.NODE_ENV
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
