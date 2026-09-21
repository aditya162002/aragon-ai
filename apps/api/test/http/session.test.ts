import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { SESSION } from '../../src/constants';
import { SessionManager } from '../../src/http/session';
import type { UserRepository } from '../../src/users/user.repository';
import { TEST_CONFIG, USER_ID } from './test-doubles';

const SESSION_URL = '/session';
const OTHER_USER_ID = '9a4d7c1e-3b2f-4e8a-b6c5-d4e3f2a1b0c9';

/** A real Express app + cookie-parser around the SessionManager; only the repository is mocked. */
function createSessionApp({ isProduction = false } = {}) {
  const users = {
    create: vi.fn<UserRepository['create']>().mockResolvedValue(USER_ID),
    ensureExists: vi.fn<UserRepository['ensureExists']>().mockResolvedValue(),
  } satisfies Pick<UserRepository, keyof UserRepository>;
  const sessions = new SessionManager(users as unknown as UserRepository, { isProduction });

  const app = express();
  app.use(cookieParser(TEST_CONFIG.sessionSecret));
  app.post(SESSION_URL, async (req, res) => {
    res.json({ userId: await sessions.ensureUserId(req, res) });
  });
  app.get(SESSION_URL, (req, res) => {
    res.json({ userId: sessions.getUserId(req) });
  });
  return { app, users };
}

function sessionCookieOf(response: request.Response): string | undefined {
  const cookies: string[] = [response.headers['set-cookie'] ?? []].flat();
  return cookies.find((cookie) => cookie.startsWith(`${SESSION.COOKIE_NAME}=`));
}

describe('SessionManager', () => {
  it('creates a user and sets a signed, httpOnly, SameSite=Lax cookie on first use', async () => {
    const { app, users } = createSessionApp();

    const response = await request(app).post(SESSION_URL);

    expect(response.body).toEqual({ userId: USER_ID });
    expect(users.create).toHaveBeenCalledTimes(1);
    const cookie = sessionCookieOf(response);
    expect(cookie).toContain(`${SESSION.COOKIE_NAME}=s%3A${USER_ID}.`);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).not.toMatch(/Secure/);
  });

  it('reuses the cookie on later requests instead of creating another user', async () => {
    const { app, users } = createSessionApp();
    const agent = request.agent(app);

    await agent.post(SESSION_URL);
    const second = await agent.post(SESSION_URL);

    expect(second.body).toEqual({ userId: USER_ID });
    expect(sessionCookieOf(second)).toBeUndefined();
    expect(users.create).toHaveBeenCalledTimes(1);
    expect(users.ensureExists).toHaveBeenCalledWith(USER_ID);
  });

  it('marks the cookie Secure in production', async () => {
    const { app } = createSessionApp({ isProduction: true });

    const response = await request(app).post(SESSION_URL);

    expect(sessionCookieOf(response)).toMatch(/Secure/);
  });

  it("ignores missing and unsigned cookies, and a signed cookie edited to another user's id", async () => {
    const { app } = createSessionApp();
    const signed = sessionCookieOf(await request(app).post(SESSION_URL)) ?? '';
    const tampered = signed.split(';')[0].replace(USER_ID, OTHER_USER_ID);

    const missing = await request(app).get(SESSION_URL);
    const unsigned = await request(app).get(SESSION_URL).set('Cookie', `${SESSION.COOKIE_NAME}=${USER_ID}`);
    const forged = await request(app).get(SESSION_URL).set('Cookie', tampered);
    const valid = await request(app).get(SESSION_URL).set('Cookie', signed.split(';')[0]);

    expect(missing.body.userId).toBeNull();
    expect(unsigned.body.userId).toBeNull();
    expect(forged.body.userId).toBeNull();
    expect(valid.body.userId).toBe(USER_ID);
  });
});
