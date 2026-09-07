import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockRedis = {
  setEx: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  set: vi.fn()
};

const createTempSecret = async (userId, method, secret, ttlSeconds = 300) => {
  const key = `tempSecret:${userId}:${method}`;
  const value = JSON.stringify({ userId, method, secret });
  await mockRedis.setEx(key, ttlSeconds, value);
  return key;
};

const verifyTempSecret = async (userId, method) => {
  const key = `tempSecret:${userId}:${method}`;
  const value = await mockRedis.get(key);
  if (!value) return null;
  await mockRedis.del(key);
  return JSON.parse(value);
};

const initHOTP = async (userId, ttlSeconds = 300) => {
  const key = `HOTP:${userId}:counter`;
  await mockRedis.setEx(key, ttlSeconds, '1');
  return 1;
};

const incrementHOTP = async (userId, ttlSeconds = 300) => {
  const key = `HOTP:${userId}:counter`;
  const counter = await mockRedis.incr(key);
  await mockRedis.expire(key, ttlSeconds);
  return counter;
};

const getHOTP = async (userId) => {
  const key = `HOTP:${userId}:counter`;
  const value = await mockRedis.get(key);
  return value ? parseInt(value) : null;
};

const deleteHOTP = async (userId) => {
  const key = `HOTP:${userId}:counter`;
  await mockRedis.del(key);
};

const storeHOTP = async (userId, counter, ttl = 300) => {
  const key = `HOTP:${userId}:${counter}`;
  await mockRedis.set(key, Date.now().toString(), { EX: ttl });
  return key;
};

const checkHOTP = async (userId, counter) => {
  const key = `HOTP:${userId}:${counter}`;
  const timestamp = await mockRedis.get(key);

  if (!timestamp) return null;

  await mockRedis.del(key);
  return timestamp;
};

describe('Temp Secret Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTempSecret', () => {
    it('should create temp secret with default TTL', async () => {
      const userId = 'user123';
      const method = 'email';
      const secret = 'abc123';
      
      mockRedis.setEx.mockResolvedValue('OK');

      const result = await createTempSecret(userId, method, secret);

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'tempSecret:user123:email',
        300,
        JSON.stringify({ userId: 'user123', method: 'email', secret: 'abc123' })
      );
      expect(result).toBe('tempSecret:user123:email');
    });

    it('should create temp secret with custom TTL', async () => {
      const userId = 'user456';
      const method = 'sms';
      const secret = 'def456';
      const ttl = 600;
      
      mockRedis.setEx.mockResolvedValue('OK');

      const result = await createTempSecret(userId, method, secret, ttl);

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'tempSecret:user456:sms',
        600,
        JSON.stringify({ userId: 'user456', method: 'sms', secret: 'def456' })
      );
      expect(result).toBe('tempSecret:user456:sms');
    });

    it('should handle Redis error', async () => {
      mockRedis.setEx.mockRejectedValue(new Error('Redis connection failed'));

      await expect(createTempSecret('user', 'method', 'secret')).rejects.toThrow('Redis connection failed');
    });
  });

  describe('verifyTempSecret', () => {
    it('should verify and delete existing temp secret', async () => {
      const userId = 'user123';
      const method = 'email';
      const storedData = { userId: 'user123', method: 'email', secret: 'abc123' };
      
      mockRedis.get.mockResolvedValue(JSON.stringify(storedData));
      mockRedis.del.mockResolvedValue(1);

      const result = await verifyTempSecret(userId, method);

      expect(mockRedis.get).toHaveBeenCalledWith('tempSecret:user123:email');
      expect(mockRedis.del).toHaveBeenCalledWith('tempSecret:user123:email');
      expect(result).toEqual(storedData);
    });

    it('should return null if temp secret does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await verifyTempSecret('user123', 'email');

      expect(mockRedis.get).toHaveBeenCalledWith('tempSecret:user123:email');
      expect(mockRedis.del).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null if temp secret is empty string', async () => {
      mockRedis.get.mockResolvedValue('');

      const result = await verifyTempSecret('user123', 'email');

      expect(result).toBeNull();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON gracefully', async () => {
      mockRedis.get.mockResolvedValue('invalid-json');
      mockRedis.del.mockResolvedValue(1);

      await expect(verifyTempSecret('user123', 'email')).rejects.toThrow();
      expect(mockRedis.del).toHaveBeenCalledWith('tempSecret:user123:email');
    });
  });
});

describe('HOTP Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(1640995200000); 
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initHOTP', () => {
    it('should initialize HOTP counter with default TTL', async () => {
      const userId = 'user123';
      
      mockRedis.setEx.mockResolvedValue('OK');

      const result = await initHOTP(userId);

      expect(mockRedis.setEx).toHaveBeenCalledWith('HOTP:user123:counter', 300, '1');
      expect(result).toBe(1);
    });

    it('should initialize HOTP counter with custom TTL', async () => {
      const userId = 'user456';
      const ttl = 600;
      
      mockRedis.setEx.mockResolvedValue('OK');

      const result = await initHOTP(userId, ttl);

      expect(mockRedis.setEx).toHaveBeenCalledWith('HOTP:user456:counter', 600, '1');
      expect(result).toBe(1);
    });

    it('should handle Redis setEx error', async () => {
      mockRedis.setEx.mockRejectedValue(new Error('Redis setEx failed'));

      await expect(initHOTP('user123')).rejects.toThrow('Redis setEx failed');
    });
  });

  describe('incrementHOTP', () => {
    it('should increment HOTP counter and reset TTL', async () => {
      const userId = 'user123';
      
      mockRedis.incr.mockResolvedValue(2);
      mockRedis.expire.mockResolvedValue(1);

      const result = await incrementHOTP(userId);

      expect(mockRedis.incr).toHaveBeenCalledWith('HOTP:user123:counter');
      expect(mockRedis.expire).toHaveBeenCalledWith('HOTP:user123:counter', 300);
      expect(result).toBe(2);
    });

    it('should increment HOTP counter with custom TTL', async () => {
      const userId = 'user456';
      const ttl = 600;
      
      mockRedis.incr.mockResolvedValue(3);
      mockRedis.expire.mockResolvedValue(1);

      const result = await incrementHOTP(userId, ttl);

      expect(mockRedis.incr).toHaveBeenCalledWith('HOTP:user456:counter');
      expect(mockRedis.expire).toHaveBeenCalledWith('HOTP:user456:counter', 600);
      expect(result).toBe(3);
    });

    it('should handle Redis incr error', async () => {
      mockRedis.incr.mockRejectedValue(new Error('Redis incr failed'));

      await expect(incrementHOTP('user123')).rejects.toThrow('Redis incr failed');
    });

    it('should handle Redis expire error', async () => {
      mockRedis.incr.mockResolvedValue(2);
      mockRedis.expire.mockRejectedValue(new Error('Redis expire failed'));

      await expect(incrementHOTP('user123')).rejects.toThrow('Redis expire failed');
    });
  });

  describe('getHOTP', () => {
    it('should get HOTP counter value', async () => {
      const userId = 'user123';
      
      mockRedis.get.mockResolvedValue('5');

      const result = await getHOTP(userId);

      expect(mockRedis.get).toHaveBeenCalledWith('HOTP:user123:counter');
      expect(result).toBe(5);
    });

    it('should return null if HOTP counter does not exist', async () => {
      const userId = 'user123';
      
      mockRedis.get.mockResolvedValue(null);

      const result = await getHOTP(userId);

      expect(mockRedis.get).toHaveBeenCalledWith('HOTP:user123:counter');
      expect(result).toBeNull();
    });

    it('should return null if HOTP counter is empty string', async () => {
      mockRedis.get.mockResolvedValue('');

      const result = await getHOTP('user123');

      expect(result).toBeNull();
    });

    it('should handle non-numeric values', async () => {
      mockRedis.get.mockResolvedValue('not-a-number');

      const result = await getHOTP('user123');

      expect(result).toBeNaN();
    });

    it('should handle Redis get error', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis get failed'));

      await expect(getHOTP('user123')).rejects.toThrow('Redis get failed');
    });
  });

  describe('deleteHOTP', () => {
    it('should delete HOTP counter', async () => {
      const userId = 'user123';
      
      mockRedis.del.mockResolvedValue(1);

      await deleteHOTP(userId);

      expect(mockRedis.del).toHaveBeenCalledWith('HOTP:user123:counter');
    });

    it('should handle deletion of non-existent key', async () => {
      mockRedis.del.mockResolvedValue(0);

      await deleteHOTP('user123');

      expect(mockRedis.del).toHaveBeenCalledWith('HOTP:user123:counter');
    });

    it('should handle Redis delete error', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis delete failed'));

      await expect(deleteHOTP('user123')).rejects.toThrow('Redis delete failed');
    });
  });

  describe('storeHOTP', () => {
    it('should store HOTP with default TTL', async () => {
      const userId = 'user123';
      const counter = 5;
      
      mockRedis.set.mockResolvedValue('OK');

      const result = await storeHOTP(userId, counter);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'HOTP:user123:5', 
        '1640995200000', 
        { EX: 300 }
      );
      expect(result).toBe('HOTP:user123:5');
    });

    it('should store HOTP with custom TTL', async () => {
      const userId = 'user456';
      const counter = 3;
      const ttl = 600;
      
      mockRedis.set.mockResolvedValue('OK');

      const result = await storeHOTP(userId, counter, ttl);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'HOTP:user456:3', 
        '1640995200000', 
        { EX: 600 }
      );
      expect(result).toBe('HOTP:user456:3');
    });

    it('should handle Redis set error', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis set failed'));

      await expect(storeHOTP('user123', 5)).rejects.toThrow('Redis set failed');
    });
  });

  describe('checkHOTP', () => {
    it('should check and delete existing HOTP', async () => {
      const userId = 'user123';
      const counter = 5;
      const timestamp = '1640995200000';
      
      mockRedis.get.mockResolvedValue(timestamp);
      mockRedis.del.mockResolvedValue(1);

      const result = await checkHOTP(userId, counter);

      expect(mockRedis.get).toHaveBeenCalledWith('HOTP:user123:5');
      expect(mockRedis.del).toHaveBeenCalledWith('HOTP:user123:5');
      expect(result).toBe(timestamp);
    });

    it('should return null if HOTP does not exist', async () => {
      const userId = 'user123';
      const counter = 5;
      
      mockRedis.get.mockResolvedValue(null);

      const result = await checkHOTP(userId, counter);

      expect(mockRedis.get).toHaveBeenCalledWith('HOTP:user123:5');
      expect(mockRedis.del).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null if HOTP is empty string', async () => {
      mockRedis.get.mockResolvedValue('');

      const result = await checkHOTP('user123', 5);

      expect(result).toBeNull();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle Redis errors during get', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis get failed'));

      await expect(checkHOTP('user123', 5)).rejects.toThrow('Redis get failed');
    });

    it('should handle Redis errors during delete', async () => {
      mockRedis.get.mockResolvedValue('1640995200000');
      mockRedis.del.mockRejectedValue(new Error('Redis delete failed'));

      await expect(checkHOTP('user123', 5)).rejects.toThrow('Redis delete failed');
    });
  });
});

describe('Edge Cases and Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle undefined userId parameters', async () => {
    mockRedis.setEx.mockResolvedValue('OK');

    const result = await createTempSecret(undefined, 'email', 'secret');

    expect(mockRedis.setEx).toHaveBeenCalledWith(
      'tempSecret:undefined:email',
      300,
      JSON.stringify({ userId: undefined, method: 'email', secret: 'secret' })
    );
    expect(result).toBe('tempSecret:undefined:email');
  });

  it('should handle null values in temp secret creation', async () => {
    mockRedis.setEx.mockResolvedValue('OK');

    const result = await createTempSecret(null, null, null);

    expect(mockRedis.setEx).toHaveBeenCalledWith(
      'tempSecret:null:null',
      300,
      JSON.stringify({ userId: null, method: null, secret: null })
    );
  });

  it('should handle concurrent HOTP operations', async () => {
    const userId = 'user123';

    mockRedis.incr.mockResolvedValueOnce(2);
    mockRedis.expire.mockResolvedValue(1);
    mockRedis.incr.mockResolvedValueOnce(3);

    const [result1, result2] = await Promise.all([
      incrementHOTP(userId),
      incrementHOTP(userId)
    ]);

    expect(result1).toBe(2);
    expect(result2).toBe(3);
    expect(mockRedis.incr).toHaveBeenCalledTimes(2);
    expect(mockRedis.expire).toHaveBeenCalledTimes(2);
  });
});

describe('Integration scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle complete HOTP flow', async () => {
    const userId = 'user123';

    mockRedis.setEx.mockResolvedValue('OK');
    await initHOTP(userId);

    mockRedis.incr.mockResolvedValue(2);
    mockRedis.expire.mockResolvedValue(1);
    const counter = await incrementHOTP(userId);

    mockRedis.set.mockResolvedValue('OK');
    vi.spyOn(Date, 'now').mockReturnValue(1640995200000);
    await storeHOTP(userId, counter);

    mockRedis.get.mockResolvedValue('1640995200000');
    mockRedis.del.mockResolvedValue(1);
    const timestamp = await checkHOTP(userId, counter);
    
    expect(counter).toBe(2);
    expect(timestamp).toBe('1640995200000');

    expect(mockRedis.setEx).toHaveBeenCalledTimes(1);
    expect(mockRedis.incr).toHaveBeenCalledTimes(1);
    expect(mockRedis.expire).toHaveBeenCalledTimes(1);
    expect(mockRedis.set).toHaveBeenCalledTimes(1);
    expect(mockRedis.get).toHaveBeenCalledTimes(1);
    expect(mockRedis.del).toHaveBeenCalledTimes(1);
  });

  it('should handle complete temp secret flow', async () => {
    const userId = 'user123';
    const method = 'email';
    const secret = 'secret123';

    mockRedis.setEx.mockResolvedValue('OK');
    const key = await createTempSecret(userId, method, secret);

    mockRedis.get.mockResolvedValue(JSON.stringify({ userId, method, secret }));
    mockRedis.del.mockResolvedValue(1);
    const verified = await verifyTempSecret(userId, method);
    
    expect(key).toBe('tempSecret:user123:email');
    expect(verified).toEqual({ userId, method, secret });

    expect(mockRedis.setEx).toHaveBeenCalledTimes(1);
    expect(mockRedis.get).toHaveBeenCalledTimes(1);
    expect(mockRedis.del).toHaveBeenCalledTimes(1);
  });

  it('should handle failed temp secret verification after creation', async () => {
    const userId = 'user123';
    const method = 'email';
    const secret = 'secret123';

    mockRedis.setEx.mockResolvedValue('OK');
    await createTempSecret(userId, method, secret);

    mockRedis.get.mockResolvedValue(null);
    const verified = await verifyTempSecret(userId, method);
    
    expect(verified).toBeNull();
    expect(mockRedis.del).not.toHaveBeenCalled();
  });
});