import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 12;

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
export function generateToken(
  payload: object,
  expiresIn: string | number = process.env.JWT_EXPIRES_IN || '7d'
): string {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

/**
 * Verify JWT token
 */
export function verifyToken<T = any>(token: string): T {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.verify(token, secret) as T;
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(payload: object): string {
  const secret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken<T = any>(token: string): T {
  const secret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
  return jwt.verify(token, secret) as T;
}

export default {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  generateRefreshToken,
  verifyRefreshToken,
};

