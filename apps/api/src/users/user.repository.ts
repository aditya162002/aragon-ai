import type { PrismaClient } from '../db';

/** Persistence for anonymous uploaders. A user row exists only to own images. */
export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Creates a new anonymous user and returns its id. */
  async create(): Promise<string> {
    const user = await this.prisma.user.create({ data: {}, select: { id: true } });
    return user.id;
  }

  /** Idempotently (re)creates the user, so a valid cookie that outlived a database reset keeps working. */
  async ensureExists(id: string): Promise<void> {
    await this.prisma.user.upsert({ where: { id }, create: { id }, update: {}, select: { id: true } });
  }
}
