
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';

export async function register(input: RegisterInput): Promise<AuthResponse> {
  try {
    // Check if user already exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUser.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash the password using Bun's built-in password hashing
    const password_hash = await Bun.password.hash(input.password);

    // Create new user
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash: password_hash
      })
      .returning()
      .execute();

    const user = result[0];

    // Generate simple token (in production, use proper JWT library)
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };
    const token = `${Buffer.from(JSON.stringify(tokenPayload)).toString('base64')}`;

    return {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token: token
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
}
