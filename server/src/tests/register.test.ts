
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput } from '../schema';
import { register } from '../handlers/register';
import { eq } from 'drizzle-orm';

const testInput: RegisterInput = {
  email: 'test@example.com',
  password: 'password123'
};

describe('register', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new user with hashed password', async () => {
    const result = await register(testInput);

    // Verify response structure
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');

    // Verify user was saved to database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'test@example.com'))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].password_hash).toBeDefined();
    expect(users[0].password_hash).not.toEqual('password123'); // Should be hashed
  });

  it('should hash the password correctly', async () => {
    await register(testInput);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'test@example.com'))
      .execute();

    const user = users[0];
    const isPasswordValid = await Bun.password.verify('password123', user.password_hash);
    expect(isPasswordValid).toBe(true);

    const isWrongPasswordValid = await Bun.password.verify('wrongpassword', user.password_hash);
    expect(isWrongPasswordValid).toBe(false);
  });

  it('should generate a valid token', async () => {
    const result = await register(testInput);

    // Verify token can be decoded
    const decoded = JSON.parse(Buffer.from(result.token, 'base64').toString());
    expect(decoded.userId).toEqual(result.user.id);
    expect(decoded.email).toEqual('test@example.com');
    expect(decoded.exp).toBeDefined(); // Should have expiration
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000)); // Should be in the future
  });

  it('should throw error if email already exists', async () => {
    // Create first user
    await register(testInput);

    // Try to create another user with same email
    await expect(register(testInput)).rejects.toThrow(/already exists/i);
  });

  it('should not return password hash in response', async () => {
    const result = await register(testInput);

    // Verify password_hash is not included in user object
    expect('password_hash' in result.user).toBe(false);
  });

  it('should create users with different IDs', async () => {
    const firstResult = await register(testInput);
    
    const secondInput: RegisterInput = {
      email: 'test2@example.com',
      password: 'password456'
    };
    const secondResult = await register(secondInput);

    expect(firstResult.user.id).not.toEqual(secondResult.user.id);
    expect(firstResult.user.email).toEqual('test@example.com');
    expect(secondResult.user.email).toEqual('test2@example.com');
  });
});
