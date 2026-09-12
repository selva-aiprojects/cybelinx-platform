import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    this.logger.log('PrismaService initialised (database connection is lazy)');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('PrismaService shutting down');
    await this.$disconnect();
  }
}