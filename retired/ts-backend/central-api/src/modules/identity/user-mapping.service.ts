import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ExternalUserIdentity,
  PlatformUser,
  PlatformUserIdentity,
} from './identity-provider.adapter';

interface UserIdentityWithUser {
  id: string;
  userId: string;
  identityProvider: string;
  externalSubject: string;
  email: string | null;
  isPrimary: boolean;
  user: {
    id: string;
    email: string;
    displayName: string;
    status: string;
    locale: string | null;
    timezone: string | null;
  };
}

@Injectable()
export class UserMappingService {
  constructor(private readonly prisma: PrismaService) {}

  async lookup(identity: ExternalUserIdentity): Promise<{ user: PlatformUser; identity: PlatformUserIdentity } | null> {
    const record = await this.prisma.userIdentity.findUnique({
      where: {
        user_identities_provider_subject_unique: {
          identityProvider: identity.provider,
          externalSubject: identity.subject,
        },
      },
      include: { user: true },
    });

    if (!record) {
      return null;
    }

    return { user: this.toPlatformUser(record.user), identity: this.toPlatformUserIdentity(record) };
  }

  async createMapping(identity: ExternalUserIdentity): Promise<{ user: PlatformUser; identity: PlatformUserIdentity }> {
    const email: string | null = identity.email ?? null;
    const syntheticEmail = email ?? `${identity.subject}@${identity.provider.toLowerCase()}.invalid`;

    const record = await this.prisma.userIdentity.upsert({
      where: {
        user_identities_provider_subject_unique: {
          identityProvider: identity.provider,
          externalSubject: identity.subject,
        },
      },
      update: { email },
      create: {
        identityProvider: identity.provider,
        externalSubject: identity.subject,
        email,
        isPrimary: true,
        user: {
          create: {
            email: syntheticEmail,
            displayName: identity.name ?? 'New User',
            status: 'ACTIVE',
          },
        },
      },
      include: { user: true },
    });

    return { user: this.toPlatformUser(record.user), identity: this.toPlatformUserIdentity(record) };
  }

  private toPlatformUser(user: UserIdentityWithUser['user']): PlatformUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status as PlatformUser['status'],
      locale: user.locale,
      timezone: user.timezone,
    };
  }

  private toPlatformUserIdentity(record: UserIdentityWithUser): PlatformUserIdentity {
    return {
      id: record.id,
      userId: record.userId,
      identityProvider: record.identityProvider,
      externalSubject: record.externalSubject,
      email: record.email,
      isPrimary: record.isPrimary,
    };
  }
}