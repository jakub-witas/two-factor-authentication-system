import { vi } from 'vitest';

const mockRedis = {
  setEx: vi.fn().mockResolvedValue('OK'),
  get: vi.fn().mockResolvedValue(null),
  del: vi.fn().mockResolvedValue(1),
  incr: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(1),
  set: vi.fn().mockResolvedValue('OK'),
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  off: vi.fn(),
  quit: vi.fn().mockResolvedValue('OK')
};

vi.mock('../config/redisClient.js', () => ({
  default: mockRedis,
  __esModule: true
}));

vi.mock('otplib', () => ({
  hotp: {
    generate: vi.fn().mockReturnValue('123456'),
    verify: vi.fn().mockReturnValue(true)
  }
}));

global.mockRedis = mockRedis;