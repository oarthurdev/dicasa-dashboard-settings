import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';

// In a real app, this should come from an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Hardcoded user for testing purposes
const TEST_USER = {
  email: 'admin@example.com',
  // This is not the plaintext password, but its hashed version
  password: '$2a$10$S.UUkSj3NM9WQH1QX0rVpOnN.N1MO9aGJtXil97qnGOKMVFN6UBqe', // senha123
};

export const generateToken = (user: { email: string }) => {
  return jwt.sign(
    { email: user.email },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

export const authenticateUser = async (email: string, password: string) => {
  // In production, validate against database
  if (email !== TEST_USER.email) {
    return null;
  }
  
  const isValid = await bcrypt.compare(password, TEST_USER.password);
  if (!isValid) {
    return null;
  }
  
  return { email: TEST_USER.email };
};

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ message: 'Não autorizado: Token não fornecido' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Não autorizado: Token inválido' });
  }
};

// Generate hashed password for testings
// This function is exported for convenience but should not be used in production
export const generateHashedPassword = async (plainPassword: string) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
};
