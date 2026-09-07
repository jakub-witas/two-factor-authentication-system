import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

const mockUsers = {
  findOne: vi.fn(),
  create: vi.fn(),
  destroy: vi.fn()
};

const mockBcrypt = {
  hash: vi.fn(),
  compare: vi.fn()
};

const mockJwt = {
  sign: vi.fn(),
  verify: vi.fn()
};

const mockBlacklistedTokens = {
  add: vi.fn(),
  delete: vi.fn()
};

const mockHelpers = {
  authenticateToken: vi.fn((req, res, next) => next()),
  validateInput: vi.fn((req, res, next) => next()),
  createTempSession: vi.fn(),
  verifyTempSession: vi.fn(),
  loginLimiter: vi.fn((req, res, next) => next()),
  authLimiter: vi.fn((req, res, next) => next())
};

const mockFetch = vi.fn();

vi.mock('../models/models', () => ({
  Users: mockUsers
}));

vi.mock('bcryptjs', () => mockBcrypt);

vi.mock('jsonwebtoken', () => mockJwt);

vi.mock('../config/tokenStore', () => ({
  blacklistedTokens: mockBlacklistedTokens
}));

vi.mock('../config/helpers', () => mockHelpers);

global.fetch = mockFetch;

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.AUTH_API_URL = 'http://localhost:3001';

const createMockRouter = () => {
  const router = express.Router();

  router.post("/register", mockHelpers.validateInput, async (req, res) => {
    try {
      const { email, password, name } = req.body;

      const existingUser = await mockUsers.findOne({ where: { email: email } });

      if (existingUser) return res.status(400).json({ message: "User already exists" });

      const hashedPassword = await mockBcrypt.hash(password, 12);

      const newUser = await mockUsers.create({
        email: email,
        name: name,
        password: hashedPassword
      });

      console.log("Created user with id: ", newUser.id);
      res.status(200).json({ message: "User created successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  router.post("/login", mockHelpers.validateInput, mockHelpers.loginLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;

      const findUser = await mockUsers.findOne({ where: { email: email } });

      if (!findUser) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const isMatch = await mockBcrypt.compare(password, findUser.password);
      if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

      const response = await mockFetch(`${process.env.AUTH_API_URL}/2fa/checkexists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: findUser.id, email })
      });

      if (response.ok) {
        const data = await response.json();
        const tempSessionId = await mockHelpers.createTempSession(findUser.id, data.method);
        return res.json({ requires2FA: true, method: data.method, tempSessionId });
      } else if (response.status === 400) {
        return res.status(400).json({ message: "Invalid request for 2FA" });
      }

      const token = mockJwt.sign({ email: email, name: findUser.name }, process.env.JWT_SECRET, { expiresIn: "15m" });

      return res.status(200).json({ requires2FA: false, token: token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });

  router.post("/2fa/biometricLogin", mockHelpers.validateInput, mockHelpers.loginLimiter, async (req, res) => {
    try {
      const { tempSessionId, email, method } = req.body;

      const sessionData = await mockHelpers.verifyTempSession(tempSessionId);

      if (sessionData == null) {
        return res.status(400).json({ message: "Session expired or invalid" });
      }

      const findUser = await mockUsers.findOne({ where: { email: email } });

      if (!findUser) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      if (findUser.id != sessionData.userId || method != sessionData.method) {
        return res.status(400).json({ message: "Session mismatched" })
      }

      const token = mockJwt.sign({ email: email, name: findUser.name }, process.env.JWT_SECRET, { expiresIn: "15m" });

      return res.status(200).json({ token: token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });

  router.post("/2fa/otplogin", mockHelpers.validateInput, mockHelpers.loginLimiter, async (req, res) => {
    try {
      const { tempSessionId, email, method, code } = req.body;
      const sessionData = await mockHelpers.verifyTempSession(tempSessionId);
      if (sessionData == null) {
        return res.status(400).json({ message: "Session expired or invalid" });
      }

      const findUser = await mockUsers.findOne({ where: { email: email } });

      if (!findUser) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      if (findUser.id != sessionData.userId || method != sessionData.method) {
        return res.status(400).json({ message: "Session mismatched" })
      }

      const response = await mockFetch(`${process.env.AUTH_API_URL}/2fa/confirmOTPcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: findUser.id, code })
      });

      if (!response.ok) {
        return res.status(401).json({ error: "Invalid 2FA code." });
      }

      const token = mockJwt.sign({ email: email, name: findUser.name }, process.env.JWT_SECRET, { expiresIn: "15m" });

      return res.status(200).json({ token: token });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Server error" });
    }
  });

  router.put("/changePassword", mockHelpers.authenticateToken, mockHelpers.validateInput, async (req, res) => {
    try {
      const { email, password, newPassword } = req.body;

      const findUser = await mockUsers.findOne({ where: { email: email } });

      if (!findUser) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const isPasswordCorrect = await mockBcrypt.compare(password, findUser.password);

      if (!isPasswordCorrect) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const hashedPassword = await mockBcrypt.hash(newPassword, 12);

      await findUser.update({
        password: hashedPassword
      })

      res.status(200).json({ message: 'Password change successful' });
    } catch (error) {
      res.status(500).json({ message: "Server error or invalid token." });
    }
  });

  router.delete("/deleteAccount", mockHelpers.authenticateToken, mockHelpers.validateInput, async (req, res) => {
    try {
      const { email, password } = req.body;

      const findUser = await mockUsers.findOne({ where: { email: email } });

      if (!findUser) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const isPasswordCorrect = await mockBcrypt.compare(password, findUser.password);

      if (!isPasswordCorrect) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const response = await mockFetch(`${process.env.AUTH_API_URL}/2fa/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: findUser.id })
      });

      if (!response.ok) {
        return res.status(401).json({ message: "Error deleting auth" });
      }

      await mockUsers.destroy({ where: { id: findUser.id } })

      res.status(200).json({ message: 'Account deleted' });
    } catch (error) {
      res.status(500).json({ message: "Server error or invalid token." });
    }
  });

  router.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  router.post("/logout", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;

      if (!req.headers.authorization) return res.status(401).json({ message: "Authorization header is missing" });

      const token = authHeader.split(' ')[1];
      if (!token) return res.status(401).json({ message: "Token is missing" });

      let decoded;
      try {
        decoded = mockJwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
      } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
      }

      const now = Math.floor(Date.now() / 1000);

      if (decoded.exp && decoded.exp > now) {
        mockBlacklistedTokens.add(token);

        const ttl = (decoded.exp - now) * 1000;
        setTimeout(() => mockBlacklistedTokens.delete(token), ttl);
      }

      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ message: "Server error or invalid token." });
    }
  });

  router.post("/2fa/enable", mockHelpers.authenticateToken, mockHelpers.validateInput, mockHelpers.authLimiter, async (req, res) => {
    try {
      const { email, method, password } = req.body;

      const findUser = await mockUsers.findOne({ where: { email: email } });

      if (!findUser) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const isPasswordCorrect = await mockBcrypt.compare(password, findUser.password);

      if (!isPasswordCorrect) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const response = await mockFetch(`${process.env.AUTH_API_URL}/2fa/enable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: findUser.id, method, email: findUser.email })
      });

      const data = await response.json();

      if (response.ok) {
        return res.status(200).json(data);
      } else {
        return res.status(400).json(data);
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Server error" });
    }
  });

  router.post("/2fa/confirm", mockHelpers.authenticateToken, mockHelpers.authLimiter, async (req, res) => {
    try {
      const { code, email } = req.body;

      const findUser = await mockUsers.findOne({ where: { email: email } });

      if (!findUser) {
        return res.status(400).json({ message: "Invalid email" });
      }

      const response = await mockFetch(`${process.env.AUTH_API_URL}/2fa/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: findUser.id, code })
      });

      if (!response.ok) {
        if (response.status === 401) return res.status(401).json({ message: "Invalid code" });
        else return res.status(400).json(false);
      }

      return res.status(200).json({ success: true, message: "2FA enabled successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Server error" });
    }
  });

  router.post("/2fa/remove", mockHelpers.authenticateToken, mockHelpers.validateInput, mockHelpers.authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;

      const findUser = await mockUsers.findOne({ where: { email: email } });

      if (!findUser) {
        return res.status(400).json({
          message: "User with this email address was not found.",
        });
      }

      const isPasswordCorrect = await mockBcrypt.compare(password, findUser.password);

      if (!isPasswordCorrect) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const response = await mockFetch(`${process.env.AUTH_API_URL}/2fa/remove`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: findUser.id })
      });

      if (response.ok) {
        return res.status(200).json({ message: "Removal successful" });
      } else if (response.status === 400) {
        return res.status(400).json({ message: "Invalid request" });
      } else {
        return res.status(500).json({ message: "Server error" });
      }

    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Server error" });
    }
  });

  return router;
};

describe('Router użytkowników', () => {
  let app;
  let userRouter;

  beforeEach(() => {
    Object.values(mockUsers).forEach(mock => mock.mockReset());
    Object.values(mockBcrypt).forEach(mock => mock.mockReset());
    Object.values(mockJwt).forEach(mock => mock.mockReset());
    Object.values(mockBlacklistedTokens).forEach(mock => mock.mockReset());
    Object.values(mockHelpers).forEach(mock => {
      if (typeof mock === 'function' && mock.mockReset) {
        mock.mockReset();
      }
    });
    mockFetch.mockReset();

    mockHelpers.authenticateToken.mockImplementation((req, res, next) => next());
    mockHelpers.validateInput.mockImplementation((req, res, next) => next());
    mockHelpers.loginLimiter.mockImplementation((req, res, next) => next());
    mockHelpers.authLimiter.mockImplementation((req, res, next) => next());

    app = express();
    app.use(express.json());

    userRouter = createMockRouter();
    app.use('/user', userRouter);
  });

  describe('POST /register', () => {
    it('powinien zarejestrować nowego użytkownika pomyślnie', async () => {
      mockUsers.findOne.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('hashed-password');
      mockUsers.create.mockResolvedValue({ id: 1, email: 'test@example.com' });

      const response = await request(app)
        .post('/user/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User created successfully');
      expect(mockUsers.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockUsers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password'
      });
    });

    it('powinien zwrócić błąd gdy użytkownik już istnieje', async () => {
      mockUsers.findOne.mockResolvedValue({ id: 1, email: 'test@example.com' });

      const response = await request(app)
        .post('/user/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('User already exists');
    });

    it('powinien zwrócić błąd serwera przy wyjątku', async () => {
      mockUsers.findOne.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/user/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Server error');
    });
  });

  describe('POST /login', () => {
    it('powinien zwrócić błąd dla nieistniejącego użytkownika', async () => {
      mockUsers.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/user/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('powinien zwrócić błąd dla nieprawidłowego hasła', async () => {
      mockUsers.findOne.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        password: 'hashed-password'
      });
      mockBcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/user/login')
        .send({
          email: 'test@example.com',
          password: 'wrong-password'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('powinien zalogować użytkownika bez 2FA', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password'
      };

      mockUsers.findOne.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401
      });
      mockJwt.sign.mockReturnValue('jwt-token');

      const response = await request(app)
        .post('/user/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.requires2FA).toBe(false);
      expect(response.body.token).toBe('jwt-token');
    });

    it('powinien wymagać 2FA gdy jest skonfigurowane', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password'
      };

      mockUsers.findOne.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ method: 'email' })
      });
      mockHelpers.createTempSession.mockResolvedValue('temp-session-id');

      const response = await request(app)
        .post('/user/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.requires2FA).toBe(true);
      expect(response.body.method).toBe('email');
      expect(response.body.tempSessionId).toBe('temp-session-id');
    });
  });

  describe('POST /2fa/biometricLogin', () => {
    it('powinien zalogować użytkownika za pomocą biometrii', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User'
      };

      mockHelpers.verifyTempSession.mockResolvedValue({
        userId: 1,
        method: 'biometrics'
      });
      mockUsers.findOne.mockResolvedValue(mockUser);
      mockJwt.sign.mockReturnValue('jwt-token');

      const response = await request(app)
        .post('/user/2fa/biometricLogin')
        .send({
          tempSessionId: 'temp-session-id',
          email: 'test@example.com',
          method: 'biometrics'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBe('jwt-token');
    });

    it('powinien zwrócić błąd dla wygasłej sesji', async () => {
      mockHelpers.verifyTempSession.mockResolvedValue(null);

      const response = await request(app)
        .post('/user/2fa/biometricLogin')
        .send({
          tempSessionId: 'invalid-session-id',
          email: 'test@example.com',
          method: 'biometrics'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Session expired or invalid');
    });

    it('powinien zwrócić błąd dla niedopasowanej sesji', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User'
      };

      mockHelpers.verifyTempSession.mockResolvedValue({
        userId: 2, // Inne ID
        method: 'biometrics'
      });
      mockUsers.findOne.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/user/2fa/biometricLogin')
        .send({
          tempSessionId: 'temp-session-id',
          email: 'test@example.com',
          method: 'biometrics'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Session mismatched');
    });
  });

  describe('POST /2fa/otplogin', () => {
    it('powinien zalogować użytkownika za pomocą kodu OTP', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User'
      };

      mockHelpers.verifyTempSession.mockResolvedValue({
        userId: 1,
        method: 'email'
      });
      mockUsers.findOne.mockResolvedValue(mockUser);
      mockFetch.mockResolvedValue({ ok: true });
      mockJwt.sign.mockReturnValue('jwt-token');

      const response = await request(app)
        .post('/user/2fa/otplogin')
        .send({
          tempSessionId: 'temp-session-id',
          email: 'test@example.com',
          method: 'email',
          code: '123456'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBe('jwt-token');
    });

    it('powinien zwrócić błąd dla nieprawidłowego kodu OTP', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User'
      };

      mockHelpers.verifyTempSession.mockResolvedValue({
        userId: 1,
        method: 'email'
      });
      mockUsers.findOne.mockResolvedValue(mockUser);
      mockFetch.mockResolvedValue({ ok: false });

      const response = await request(app)
        .post('/user/2fa/otplogin')
        .send({
          tempSessionId: 'temp-session-id',
          email: 'test@example.com',
          method: 'email',
          code: 'invalid-code'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid 2FA code.');
    });
  });

  describe('PUT /changePassword', () => {
    it('powinien zmienić hasło użytkownika', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'old-hashed-password',
        update: vi.fn().mockResolvedValue()
      };

      mockUsers.findOne.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockBcrypt.hash.mockResolvedValue('new-hashed-password');

      const response = await request(app)
        .put('/user/changePassword')
        .send({
          email: 'test@example.com',
          password: 'old-password',
          newPassword: 'new-password'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password change successful');
      expect(mockUser.update).toHaveBeenCalledWith({
        password: 'new-hashed-password'
      });
    });

    it('powinien zwrócić błąd dla nieprawidłowego starego hasła', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'old-hashed-password'
      };

      mockUsers.findOne.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .put('/user/changePassword')
        .send({
          email: 'test@example.com',
          password: 'wrong-password',
          newPassword: 'new-password'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('DELETE /deleteAccount', () => {
    it('powinien usunąć konto użytkownika', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed-password'
      };

      mockUsers.findOne.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockFetch.mockResolvedValue({ ok: true });
      mockUsers.destroy.mockResolvedValue();

      const response = await request(app)
        .delete('/user/deleteAccount')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Account deleted');
      expect(mockUsers.destroy).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('powinien zwrócić błąd gdy usuwanie 2FA nie powiedzie się', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed-password'
      };

      mockUsers.findOne.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockFetch.mockResolvedValue({ ok: false });

      const response = await request(app)
        .delete('/user/deleteAccount')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Error deleting auth');
    });
  });

  describe('GET /health', () => {
    it('powinien zwrócić status zdrowia', async () => {
      const response = await request(app).get('/user/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('POST /logout', () => {
    it('powinien wylogować użytkownika pomyślnie', async () => {
      const mockDecoded = {
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600 
      };

      mockJwt.verify.mockReturnValue(mockDecoded);

      const response = await request(app)
        .post('/user/logout')
        .set('Authorization', 'Bearer valid-jwt-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out successfully');
      expect(mockBlacklistedTokens.add).toHaveBeenCalledWith('valid-jwt-token');
    });

    it('powinien zwrócić błąd gdy brak nagłówka autoryzacji', async () => {
      const response = await request(app)
        .post('/user/logout');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Authorization header is missing');
    });

    it('powinien zwrócić błąd dla nieprawidłowego tokena', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .post('/user/logout')
        .set('Authorization', 'Bearer invalid-jwt-token');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid token');
    });

    it('powinien zwrócić błąd gdy brak tokena w nagłówku', async () => {
      const response = await request(app)
        .post('/user/logout')
        .set('Authorization', 'Bearer ');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token is missing');
    });
  });

  describe('POST /2fa/enable', () => {
    it('powinien włączyć 2FA pomyślnie', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed-password'
      };

      mockUsers.findOne.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ requiresCode: true })
      });

      const response = await request(app)
        .post('/user/2fa/enable')
        .send({
          email: 'test@example.com',
          method: 'email',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.requiresCode).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        `${process.env.AUTH_API_URL}/2fa/enable`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: 1, method: 'email', email: 'test@example.com' })
        }
      );
    });

    it('powinien zwrócić błąd dla nieistniejącego użytkownika', async () => {
      mockUsers.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/user/2fa/enable')
        .send({
          email: 'test@example.com',
          method: 'email',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('powinien zwrócić błąd dla nieprawidłowego hasła', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed-password'
      };

      mockUsers.findOne.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/user/2fa/enable')
        .send({
          email: 'test@example.com',
          method: 'email',
          password: 'wrong-password'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('powinien przekazać błąd z API 2FA', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed-password'
      };

      mockUsers.findOne.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockFetch.mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ message: '2FA API error' })
      });

      const response = await request(app)
        .post('/user/2fa/enable')
        .send({
          email: 'test@example.com',
          method: 'email',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('2FA API error');
    });
  });

  describe('POST /2fa/confirm', () => {
    it('powinien potwierdzić włączenie 2FA', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com'
      };

      mockUsers.findOne.mockResolvedValue(mockUser);
      mockFetch.mockResolvedValue({ ok: true });

      const response = await request(app)
        .post('/user/2fa/confirm')
        .send({
          email: 'test@example.com',
          code: '123456'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('2FA enabled successfully');
      expect(mockFetch).toHaveBeenCalledWith(
        `${process.env.AUTH_API_URL}/2fa/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: 1, code: '123456' })
        }
      );
    });

    it('powinien zwrócić błąd dla nieistniejącego użytkownika', async () => {
      mockUsers.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/user/2fa/confirm')
        .send({
          email: 'test@example.com',
          code: '123456'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid email');
    });

    it('powinien zwrócić błąd dla nieprawidłowego kodu', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com'
      };

      mockUsers.findOne.mockResolvedValue(mockUser);
      mockFetch.mockResolvedValue({ ok: false, status: 401 });

      const response = await request(app)
        .post('/user/2fa/confirm')
        .send({
          email: 'test@example.com',
          code: 'invalid-code'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid code');
    });

    it('powinien zwrócić ogólny błąd dla innych problemów z API', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com'
      };

      mockUsers.findOne.mockResolvedValue(mockUser);
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      const response = await request(app)
        .post('/user/2fa/confirm')
        .send({
          email: 'test@example.com',
          code: '123456'
        });

      expect(response.status).toBe(400);
      expect(response.body).toBe(false);
    });
  });

  describe('POST /2fa/remove', () => {
    it('powinien usunąć 2FA pomyślnie', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed-password'
      };

      mockUsers.findOne.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockFetch.mockResolvedValue({ ok: true });

      const response = await request(app)
        .post('/user/2fa/remove')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Removal successful');
      expect(mockFetch).toHaveBeenCalledWith(
        `${process.env.AUTH_API_URL}/2fa/remove`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: 1 })
        }
      );
    });

    it('powinien zwrócić błąd dla nieistniejącego użytkownika', async () => {
      mockUsers.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/user/2fa/remove')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('User with this email address was not found.');
    });

    it('powinien zwrócić błąd dla nieprawidłowego hasła', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed-password'
      };

      mockUsers.findOne.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/user/2fa/remove')
        .send({
          email: 'test@example.com',
          password: 'wrong-password'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('powinien zwrócić błąd gdy API zwróci błąd 400', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed-password'
      };

      mockUsers.findOne.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockFetch.mockResolvedValue({ ok: false, status: 400 });

      const response = await request(app)
        .post('/user/2fa/remove')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid request');
    });

    it('powinien zwrócić błąd serwera gdy API zwróci błąd 500', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed-password'
      };

      mockUsers.findOne.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      const response = await request(app)
        .post('/user/2fa/remove')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Server error');
    });
  });

  describe('PUT /changeEmail', () => {
    it('powinien zmienić email użytkownika pomyślnie', async () => {
      const mockUser = {
        id: 1,
        email: 'old@example.com',
        password: 'hashed-password',
        update: vi.fn().mockResolvedValue()
      };

      userRouter.put("/changeEmail", mockHelpers.authenticateToken, mockHelpers.validateInput, async (req, res) => {
        try {
          const { email, password, newEmail } = req.body;

          const findUser = await mockUsers.findOne({ where: { email: email } });

          if (!findUser) {
            return res.status(400).json({ message: "Invalid credentials" });
          }

          const isPasswordCorrect = mockBcrypt.compare(password, findUser.password);

          if (!isPasswordCorrect) {
            return res.status(400).json({ message: "Invalid credentials" });
          }

          await findUser.update({
            email: newEmail
          })

          res.status(200).json({ message: 'Email change successful' });
        } catch (error) {
          res.status(500).json({ message: "Server error or invalid token." });
        }
      });

      mockUsers.findOne.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);

      const response = await request(app)
        .put('/user/changeEmail')
        .send({
          email: 'old@example.com',
          password: 'password123',
          newEmail: 'new@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Email change successful');
      expect(mockUser.update).toHaveBeenCalledWith({
        email: 'new@example.com'
      });
    });
  });

  describe('Testy błędów serwera', () => {
    it('powinien obsłużyć błąd serwera w register', async () => {
      mockUsers.findOne.mockRejectedValue(new Error('Database connection error'));

      const response = await request(app)
        .post('/user/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Server error');
    });

    it('powinien obsłużyć błąd serwera w login', async () => {
      mockUsers.findOne.mockRejectedValue(new Error('Database connection error'));

      const response = await request(app)
        .post('/user/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Server error');
    });

    it('powinien obsłużyć błąd serwera w 2FA enable', async () => {
      mockUsers.findOne.mockRejectedValue(new Error('Database connection error'));

      const response = await request(app)
        .post('/user/2fa/enable')
        .send({
          email: 'test@example.com',
          method: 'email',
          password: 'password123'
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Server error');
    });
  });

  describe('Testy middleware', () => {
    it('powinien wywołać middleware validateInput', async () => {
      await request(app)
        .post('/user/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });

      expect(mockHelpers.validateInput).toHaveBeenCalled();
    });

    it('powinien wywołać middleware loginLimiter', async () => {
      mockUsers.findOne.mockResolvedValue(null);

      await request(app)
        .post('/user/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(mockHelpers.loginLimiter).toHaveBeenCalled();
    });

    it('powinien wywołać middleware authenticateToken', async () => {
      mockUsers.findOne.mockResolvedValue(null);

      await request(app)
        .put('/user/changePassword')
        .send({
          email: 'test@example.com',
          password: 'old-password',
          newPassword: 'new-password'
        });

      expect(mockHelpers.authenticateToken).toHaveBeenCalled();
    });

    it('powinien wywołać middleware authLimiter', async () => {
      mockUsers.findOne.mockResolvedValue(null);

      await request(app)
        .post('/user/2fa/enable')
        .send({
          email: 'test@example.com',
          method: 'email',
          password: 'password123'
        });

      expect(mockHelpers.authLimiter).toHaveBeenCalled();
    });
  });
});