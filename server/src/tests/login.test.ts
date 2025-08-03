
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login } from '../handlers/login';

const testUser = {
  email: 'test@example.com',
  password: 'testpassword123'
};

const testLoginInput: LoginInput = {
  email: testUser.email,
  password: testUser.password
};

describe('login', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login user with valid credentials', async () => {
    // Create test user with hashed password
    const hashedPassword = await Bun.password.hash(testUser.password);
    const insertResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: hashedPassword
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Login
    const result = await login(testLoginInput);

    // Verify response structure
    expect(result.user.id).toEqual(createdUser.id);
    expect(result.user.email).toEqual(testUser.email);
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');

    // Verify token contains user info
    const decoded = JSON.parse(atob(result.token));
    expect(decoded.userId).toEqual(createdUser.id);
    expect(decoded.email).toEqual(testUser.email);
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'somepassword'
    };

    expect(login(nonExistentInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should throw error for invalid password', async () => {
    // Create test user
    const hashedPassword = await Bun.password.hash(testUser.password);
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: hashedPassword
      })
      .execute();

    const invalidPasswordInput: LoginInput = {
      email: testUser.email,
      password: 'wrongpassword'
    };

    expect(login(invalidPasswordInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should not return password hash in response', async () => {
    // Create test user
    const hashedPassword = await Bun.password.hash(testUser.password);
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: hashedPassword
      })
      .execute();

    const result = await login(testLoginInput);

    // Verify password hash is not included
    expect((result.user as any).password_hash).toBeUndefined();
  });

  it('should verify password correctly with Bun password API', async () => {
    const password = 'test123';
    const hashedPassword = await Bun.password.hash(password);
    
    // Create user with hashed password
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: hashedPassword
      })
      .execute();

    const loginInput: LoginInput = {
      email: testUser.email,
      password: password
    };

    const result = await login(loginInput);
    expect(result.user.email).toEqual(testUser.email);
    expect(result.token).toBeDefined();
  });
});
