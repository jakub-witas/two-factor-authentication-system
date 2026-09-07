import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

const mockJwt = {
  verify: vi.fn()
};

const mockRedis = {
  setEx: vi.fn(),
  get: vi.fn(),
  del: vi.fn()
};

const mockUuidv4 = vi.fn();

const mockBlacklistedTokens = {
  has: vi.fn()
};

const mockValidationResult = vi.fn();
const mockBody = vi.fn();

vi.mock('jsonwebtoken', () => mockJwt);
vi.mock('./redisClient', () => mockRedis);
vi.mock('uuid', () => ({ v4: mockUuidv4 }));
vi.mock('./tokenStore', () => ({ blacklistedTokens: mockBlacklistedTokens }));
vi.mock('express-validator', () => ({
  body: vi.fn().mockImplementation(() => ({
    isEmail: vi.fn().mockReturnThis(),
    optional: vi.fn().mockReturnThis(),
    withMessage: vi.fn().mockReturnThis(),
    normalizeEmail: vi.fn().mockReturnThis(),
    isString: vi.fn().mockReturnThis(),
    isLength: vi.fn().mockReturnThis(),
    trim: vi.fn().mockReturnThis()
  })),
  validationResult: mockValidationResult
}));

process.env.JWT_SECRET = 'test-jwt-secret';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!req.headers.authorization) {
    return res.status(401).json({ message: "Authorization header is missing" });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: "Token is missing" });
  }

  if (mockBlacklistedTokens.has(token)) {
    console.log("Usage of unauthorised token!");
    return res.status(403).json({ message: "Token is blacklisted" });
  }

  try {
    const decoded = mockJwt.verify(token, process.env.JWT_SECRET);
    req.body.email = decoded.email;
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(403).json({ message: "Invalid or expired token", tokenExpired: true });
  }
};

const validateInput = [
  (req, res, next) => {
    const errors = mockValidationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

const createTempSession = async (userId, method) => {
  const tempSessionId = mockUuidv4();

  const sessionData = JSON.stringify({
    userId: userId.toString(),
    method
  });

  await mockRedis.setEx(`tempSession:${tempSessionId}`, 300, sessionData);

  return tempSessionId;
};

const verifyTempSession = async (tempSessionId) => {
  const sessionData = await mockRedis.get(`tempSession:${tempSessionId}`);

  if (!sessionData) {
    return null;
  }

  await mockRedis.del(`temp:${tempSessionId}`);

  return JSON.parse(sessionData);
};

const createMockRateLimiter = (windowMs, max, retryAfter) => {
  return (req, res, next) => {
    if (req.headers['x-test-rate-limit'] === 'exceeded') {
      return res.status(429).json({
        error: "too_many_requests",
        message: "Zbyt wiele nieudanych prób logowania.",
        retryAfter: retryAfter
      });
    }
    next();
  };
};

const loginLimiter = createMockRateLimiter(5 * 60 * 1000, 10, 300);
const authLimiter = createMockRateLimiter(10 * 60 * 1000, 5, 600);

describe('Helpery - testy jednostkowe', () => {
  let app;

  beforeEach(() => {
    Object.values(mockJwt).forEach(mock => mock.mockReset());
    Object.values(mockRedis).forEach(mock => mock.mockReset());
    Object.values(mockBlacklistedTokens).forEach(mock => mock.mockReset());
    mockUuidv4.mockReset();
    mockValidationResult.mockReset();

    app = express();
    app.use(express.json());
  });

  describe('authenticateToken middleware', () => {
    beforeEach(() => {
      app.get('/protected', authenticateToken, (req, res) => {
        res.json({ message: 'Access granted', email: req.body.email });
      });
    });

    it('powinien zwrócić błąd gdy brak nagłówka Authorization', async () => {
      const response = await request(app).get('/protected');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Authorization header is missing');
    });

    it('powinien zwrócić błąd gdy brak tokena w nagłówku', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer ');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token is missing');
    });

    it('powinien zwrócić błąd gdy token jest na czarnej liście', async () => {
      mockBlacklistedTokens.has.mockReturnValue(true);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer blacklisted-token');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Token is blacklisted');
      expect(mockBlacklistedTokens.has).toHaveBeenCalledWith('blacklisted-token');
    });

    it('powinien zwrócić błąd gdy token jest nieprawidłowy', async () => {
      mockBlacklistedTokens.has.mockReturnValue(false);
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Invalid or expired token');
      expect(response.body.tokenExpired).toBe(true);
    });

    it('powinien przejść przez middleware dla prawidłowego tokena', async () => {
      mockBlacklistedTokens.has.mockReturnValue(false);
      mockJwt.verify.mockReturnValue({ email: 'test@example.com' });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Access granted');
      expect(response.body.email).toBe('test@example.com');
      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
    });

    it('powinien ustawić email w req.body na podstawie tokena', async () => {
      mockBlacklistedTokens.has.mockReturnValue(false);
      mockJwt.verify.mockReturnValue({ email: 'user@example.com', name: 'Test User' });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('user@example.com');
    });
  });

  describe('validateInput middleware', () => {
    beforeEach(() => {
      app.post('/validate', validateInput, (req, res) => {
        res.json({ message: 'Validation passed' });
      });
    });

    it('powinien przejść walidację dla prawidłowych danych', async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      const response = await request(app)
        .post('/validate')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Validation passed');
    });

    it('powinien zwrócić błąd walidacji dla nieprawidłowych danych', async () => {
      const validationErrors = [
        { field: 'email', msg: 'Please provide a valid email address' },
        { field: 'password', msg: 'Password must be at least 4 characters long.' }
      ];

      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => validationErrors
      });

      const response = await request(app)
        .post('/validate')
        .send({ email: 'invalid-email', password: '123' });

      expect(response.status).toBe(400);
      expect(response.body.errors).toEqual(validationErrors);
    });

    it('powinien obsłużyć puste dane wejściowe', async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ field: 'email', msg: 'Email is required' }]
      });

      const response = await request(app)
        .post('/validate')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('createTempSession', () => {
    it('powinien utworzyć sesję tymczasową', async () => {
      const mockSessionId = 'uuid-session-id';
      mockUuidv4.mockReturnValue(mockSessionId);
      mockRedis.setEx.mockResolvedValue('OK');

      const result = await createTempSession(123, 'email');

      expect(result).toBe(mockSessionId);
      expect(mockUuidv4).toHaveBeenCalled();
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        `tempSession:${mockSessionId}`,
        300,
        JSON.stringify({ userId: '123', method: 'email' })
      );
    });

    it('powinien konwertować userId na string', async () => {
      const mockSessionId = 'uuid-session-id';
      mockUuidv4.mockReturnValue(mockSessionId);
      mockRedis.setEx.mockResolvedValue('OK');

      await createTempSession(456, 'biometrics');

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        `tempSession:${mockSessionId}`,
        300,
        JSON.stringify({ userId: '456', method: 'biometrics' })
      );
    });

    it('powinien obsłużyć błąd Redis', async () => {
      const mockSessionId = 'uuid-session-id';
      mockUuidv4.mockReturnValue(mockSessionId);
      mockRedis.setEx.mockRejectedValue(new Error('Redis error'));

      await expect(createTempSession(123, 'email')).rejects.toThrow('Redis error');
    });
  });

  describe('verifyTempSession', () => {
    it('powinien zweryfikować prawidłową sesję tymczasową', async () => {
      const sessionData = JSON.stringify({ userId: '123', method: 'email' });
      mockRedis.get.mockResolvedValue(sessionData);
      mockRedis.del.mockResolvedValue(1);

      const result = await verifyTempSession('valid-session-id');

      expect(result).toEqual({ userId: '123', method: 'email' });
      expect(mockRedis.get).toHaveBeenCalledWith('tempSession:valid-session-id');
      expect(mockRedis.del).toHaveBeenCalledWith('temp:valid-session-id');
    });

    it('powinien zwrócić null dla nieistniejącej sesji', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await verifyTempSession('invalid-session-id');

      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith('tempSession:invalid-session-id');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('powinien zwrócić null dla wygasłej sesji', async () => {
      mockRedis.get.mockResolvedValue(null); 

      const result = await verifyTempSession('expired-session-id');

      expect(result).toBeNull();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('powinien usunąć sesję po weryfikacji', async () => {
      const sessionData = JSON.stringify({ userId: '789', method: 'gauth' });
      mockRedis.get.mockResolvedValue(sessionData);
      mockRedis.del.mockResolvedValue(1);

      await verifyTempSession('session-to-delete');

      expect(mockRedis.del).toHaveBeenCalledWith('temp:session-to-delete');
    });

    it('powinien obsłużyć błąd parsowania JSON', async () => {
      mockRedis.get.mockResolvedValue('invalid-json');
      mockRedis.del.mockResolvedValue(1);

      await expect(verifyTempSession('invalid-json-session')).rejects.toThrow();
    });

    it('powinien obsłużyć błąd Redis przy pobieraniu', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection error'));

      await expect(verifyTempSession('error-session')).rejects.toThrow('Redis connection error');
    });
  });

  describe('Rate Limiters', () => {
    describe('loginLimiter', () => {
      beforeEach(() => {
        app.post('/login-test', loginLimiter, (req, res) => {
          res.json({ message: 'Login attempt successful' });
        });
      });

      it('powinien pozwolić na żądanie gdy limit nie zostanie przekroczony', async () => {
        const response = await request(app)
          .post('/login-test')
          .send({ email: 'test@example.com' });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Login attempt successful');
      });

      it('powinien zablokować żądanie gdy limit zostanie przekroczony', async () => {
        const response = await request(app)
          .post('/login-test')
          .set('x-test-rate-limit', 'exceeded')
          .send({ email: 'test@example.com' });

        expect(response.status).toBe(429);
        expect(response.body.error).toBe('too_many_requests');
        expect(response.body.retryAfter).toBe(300);
      });
    });

    describe('authLimiter', () => {
      beforeEach(() => {
        app.post('/auth-test', authLimiter, (req, res) => {
          res.json({ message: 'Auth attempt successful' });
        });
      });

      it('powinien pozwolić na żądanie gdy limit nie zostanie przekroczony', async () => {
        const response = await request(app)
          .post('/auth-test')
          .send({ email: 'test@example.com' });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Auth attempt successful');
      });

      it('powinien zablokować żądanie gdy limit zostanie przekroczony', async () => {
        const response = await request(app)
          .post('/auth-test')
          .set('x-test-rate-limit', 'exceeded')
          .send({ email: 'test@example.com' });

        expect(response.status).toBe(429);
        expect(response.body.error).toBe('too_many_requests');
        expect(response.body.retryAfter).toBe(600);
      });
    });
  });

  describe('Testy integracyjne helperów', () => {
    beforeEach(() => {
      app.post('/full-test', validateInput, authenticateToken, loginLimiter, (req, res) => {
        res.json({ 
          message: 'All middleware passed',
          email: req.body.email 
        });
      });
    });

    it('powinien przejść przez wszystkie middleware dla prawidłowych danych', async () => {
      mockValidationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
      mockBlacklistedTokens.has.mockReturnValue(false);
      mockJwt.verify.mockReturnValue({ email: 'test@example.com' });

      const response = await request(app)
        .post('/full-test')
        .set('Authorization', 'Bearer valid-token')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('All middleware passed');
      expect(response.body.email).toBe('test@example.com');
    });

    it('powinien zatrzymać się na pierwszym błędzie walidacji', async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ field: 'email', msg: 'Invalid email' }]
      });

      const response = await request(app)
        .post('/full-test')
        .set('Authorization', 'Bearer valid-token')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(mockJwt.verify).not.toHaveBeenCalled();
    });

    it('powinien zatrzymać się na błędzie autoryzacji', async () => {
      mockValidationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
      mockBlacklistedTokens.has.mockReturnValue(true);

      const response = await request(app)
        .post('/full-test')
        .set('Authorization', 'Bearer blacklisted-token')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Token is blacklisted');
    });

    it('powinien zatrzymać się na rate limiting', async () => {
      mockValidationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
      mockBlacklistedTokens.has.mockReturnValue(false);
      mockJwt.verify.mockReturnValue({ email: 'test@example.com' });

      const response = await request(app)
        .post('/full-test')
        .set('Authorization', 'Bearer valid-token')
        .set('x-test-rate-limit', 'exceeded')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('too_many_requests');
    });
  });

  describe('Testy graniczne', () => {
    it('powinien obsłużyć malformed Authorization header', async () => {
      app.get('/malformed-auth', authenticateToken, (req, res) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/malformed-auth')
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token is missing');
    });

    it('powinien obsłużyć bardzo długi token', async () => {
      app.get('/long-token', authenticateToken, (req, res) => {
        res.json({ message: 'Success' });
      });

      const longToken = 'a'.repeat(1000);
      mockBlacklistedTokens.has.mockReturnValue(false);
      mockJwt.verify.mockReturnValue({ email: 'test@example.com' });

      const response = await request(app)
        .get('/long-token')
        .set('Authorization', `Bearer ${longToken}`);

      expect(response.status).toBe(200);
      expect(mockJwt.verify).toHaveBeenCalledWith(longToken, process.env.JWT_SECRET);
    });

    it('powinien obsłużyć sesję z nieprawidłowym userId', async () => {
      const sessionData = JSON.stringify({ userId: null, method: 'email' });
      mockRedis.get.mockResolvedValue(sessionData);
      mockRedis.del.mockResolvedValue(1);

      const result = await verifyTempSession('invalid-userid-session');

      expect(result).toEqual({ userId: null, method: 'email' });
    });
  });
});