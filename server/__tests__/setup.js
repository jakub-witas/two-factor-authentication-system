import { beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.clearAllMocks();
  
  process.env.JWT_SECRET = 'test-secret';
  process.env.AUTH_API_URL = 'http://test-auth-api';
});

global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};