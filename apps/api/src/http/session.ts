import type { Request, Response } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config';
import { SESSION, SESSION_COOKIE } from '../constants';
import type { UserRepository } from '../users/user.repository';

const userIdSchema = z.uuid();

/**
 * Anonymous sessions: the user id travels in a signed, httpOnly cookie. The signature (keyed by
 * `SESSION_SECRET`) means clients cannot forge or pick someone else's id.
 */
export class SessionManager {
  constructor(
    private readonly users: UserRepository,
    private readonly config: Pick<AppConfig, 'isProduction'>,
  ) {}

  /** The caller's user id, or null when the cookie is missing, tampered with or malformed. */
  getUserId(req: Request): string | null {
    const result = userIdSchema.safeParse(req.signedCookies[SESSION.COOKIE_NAME]);
    return result.success ? result.data : null;
  }

  /** Returns the caller's user id, creating the user and setting the cookie on first use. */
  async ensureUserId(req: Request, res: Response): Promise<string> {
    const existingId = this.getUserId(req);
    if (existingId !== null) {
      await this.users.ensureExists(existingId);
      return existingId;
    }
    const userId = await this.users.create();
    res.cookie(SESSION.COOKIE_NAME, userId, {
      signed: true,
      httpOnly: true,
      sameSite: SESSION_COOKIE.SAME_SITE,
      secure: this.config.isProduction,
      maxAge: SESSION.MAX_AGE_MS,
      path: SESSION_COOKIE.PATH,
    });
    return userId;
  }
}
