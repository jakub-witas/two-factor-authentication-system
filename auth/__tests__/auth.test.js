import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

const mockAuth = {
  findOne: vi.fn(),
  create: vi.fn(),
  destroy: vi.fn(),
  update: vi.fn()
};

const mockAuthenticator = {
  generateSecret: vi.fn(),
  check: vi.fn(),
  keyuri: vi.fn()
};

const mockHotp = {
  generate: vi.fn(),
  check: vi.fn()
};

const mockSend2FACodeEmail = vi.fn();
const mockEncryptSecret = vi.fn();
const mockDecryptSecret = vi.fn();

const mockHelpers = {
  createTempSecret: vi.fn(),
  verifyTempSecret: vi.fn(),
  initHOTP: vi.fn(),
  deleteHOTP: vi.fn(),
  incrementHOTP: vi.fn(),
  getHOTP: vi.fn(),
  storeHOTP: vi.fn(),
  checkHOTP: vi.fn()
};

vi.mock('../models/models', () => ({
  Auth: mockAuth
}));

vi.mock('otplib', () => ({
  authenticator: mockAuthenticator,
  hotp: mockHotp
}));

vi.mock('../config/mailService', () => mockSend2FACodeEmail);

vi.mock('../config/crypto', () => ({
  encryptSecret: mockEncryptSecret,
  decryptSecret: mockDecryptSecret
}));

vi.mock('../config/helpers', () => mockHelpers);

const createMockRouter = () => {
  const router = express.Router();
  
  router.post("/checkexists", async (req, res) => {
    try {
      const { id, email } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const exists = await mockAuth.findOne({ where: { user_id: id } });

      if (!exists) return res.status(401).json(false);

      if (exists.method === 'email') {
        const decryptedSecret = mockDecryptSecret(exists.secret);
        const emailCode = mockHotp.generate(decryptedSecret, exists.counter);

        await mockHelpers.storeHOTP(exists.user_id, exists.counter);

        const success = await mockSend2FACodeEmail(email, emailCode);

        if (!success) {
          return res.status(400).json({ message: "Failed sending email" });
        }
      }
      return res.status(200).json({ method: exists.method });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  router.post("/confirmOTPcode", async (req, res) => {
    try {
      const { id, code } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const exists = await mockAuth.findOne({ where: { user_id: id } });

      if (!exists) return res.status(401).json(false);

      const decryptedSecret = mockDecryptSecret(exists.secret);
      let isValid;

      if (exists.method === 'email') {
        const timestamp = await mockHelpers.checkHOTP(id, exists.counter);

        if (!timestamp) {
          await exists.increment('counter');
          return res.status(401).json({ message: "Code expired or invalid" });
        }

        isValid = mockHotp.check(code, decryptedSecret, exists.counter);
      }
      else isValid = mockAuthenticator.check(code, decryptedSecret, { window: 1 });

      if (!isValid) {
        return res.status(401).json({ error: "Invalid 2FA code." });
      }

      if (isValid && exists.method === 'email') {
        await exists.increment('counter');
      }

      return res.status(200).json(true);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  router.delete("/remove", async (req, res) => {
    try {
      const id = req.body.id;

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const exists = await mockAuth.findOne({ where: { user_id: id } });

      if (exists) await mockAuth.destroy({ where: { user_id: id } })

      return res.status(200).json({ message: "Authentication removed" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  router.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  router.post("/enable", async (req, res) => {
    try {
      const { id, method, email } = req.body;

      const numericId = Number(id);
      if (!numericId) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const exists = await mockAuth.findOne({ where: { user_id: id } });

      switch (method) {
        case 'biometrics': {
          if (!exists) {
            await mockAuth.create({
              user_id: id,
              method: method
            });
          } else {
            await exists.update({
              method: method,
              secret: null,
            })
          }

          return res.status(200).json({ requiresCode: false });
        }
        case 'email': {
          const secret = mockAuthenticator.generateSecret();
          await mockHelpers.createTempSecret(id, method, secret, 300);
          const counter = await mockHelpers.initHOTP(id, 300);

          const emailCode = mockHotp.generate(secret, counter);
          const success = await mockSend2FACodeEmail(email, emailCode);

          if (!success) {
            return res.status(400).json({ message: "Failed sending email" });
          }

          if (!exists) {
            await mockAuth.create({
              user_id: id,
              method: method,
            });
          } else {
            await exists.update({
              method: method,
              secret: null,
            })
          }

          return res.status(200).json({ requiresCode: true });
        }
        case 'gauth': {
          const secret = mockAuthenticator.generateSecret();
          await mockHelpers.createTempSecret(id, method, secret, 300);
          const otpAuth = mockAuthenticator.keyuri(email, "PracaMagisterska", secret);

          if (!exists) {
            await mockAuth.create({
              user_id: id,
              method: method,
            });
          } else {
            await exists.update({
              method: method,
              secret: null,
              counter: null
            })
          }

          return res.status(200).json({ requiresCode: true, otpAuth });
        }
        default: {
          return res.status(400).json({ message: "Unknown method" });
        }
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Server error" });
    }
  });

  router.post("/confirm", async (req, res) => {
    try {
      const { id, code } = req.body;

      const numericId = Number(id);
      if (!numericId) return res.status(400).json({ message: "Invalid user ID" });

      const exists = await mockAuth.findOne({ where: { user_id: id } });

      if (!exists) {
        return res.status(400).json({
          message: "User with this email address was not found or have no pending 2fa request.",
        });
      }

      const tempSecretData = await mockHelpers.verifyTempSecret(id, exists.method);
      if (!tempSecretData) {
        return res.status(400).json({ message: "No pending 2FA request or code expired" });
      }

      let isValid;
      if (exists.method === 'email') {
        let counter = await mockHelpers.getHOTP(id);
        if (!counter) return res.status(401).json({ message: "Code expired or invalid" });

        isValid = mockHotp.check(code, tempSecretData.secret, counter);
      }
      else if ((exists.method === 'gauth')) isValid = mockAuthenticator.check(code, tempSecretData.secret, { window: 1 });
      else return res.status(400).json({ message: "Method not recognised" });


      if (!isValid) {
        return res.status(401).json({ message: "Invalid 2FA code." });
      } else if (isValid && exists.method === 'email') {
        await mockHelpers.incrementHOTP(id);
      }

      await mockAuth.update(
        {
          secret: await mockEncryptSecret(tempSecretData.secret),
          counter: exists.method === "email" ? await mockHelpers.getHOTP(id) : null
        },
        { where: { id: exists.id } }
      );

      if (exists.method === 'email') {
        await mockHelpers.deleteHOTP(id);
      }

      return res.status(200).json({ success: true, message: "2FA enabled successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Server error" });
    }
  });

  return router;
};

describe('Router uwierzytelniania 2FA', () => {
  let app;
  let authRouter;

  beforeEach(() => {
    Object.values(mockAuth).forEach(mock => mock.mockReset());
    Object.values(mockAuthenticator).forEach(mock => mock.mockReset());
    Object.values(mockHotp).forEach(mock => mock.mockReset());
    Object.values(mockHelpers).forEach(mock => mock.mockReset());
    mockSend2FACodeEmail.mockReset();
    mockEncryptSecret.mockReset();
    mockDecryptSecret.mockReset();

    app = express();
    app.use(express.json());

    authRouter = createMockRouter();
    app.use('/auth', authRouter);
  });

  describe('POST /checkexists', () => {
    it('powinien zwrócić błąd dla nieprawidłowego ID użytkownika', async () => {
      const response = await request(app)
        .post('/auth/checkexists')
        .send({ id: 'nieprawidlowe-id', email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid user ID');
    });

    it('powinien zwrócić 401 gdy użytkownik nie istnieje', async () => {
      mockAuth.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/checkexists')
        .send({ id: '123', email: 'test@example.com' });

      expect(response.status).toBe(401);
      expect(response.body).toBe(false);
    });

    it('powinien zwrócić metodę uwierzytelniania dla metody gauth', async () => {
      mockAuth.findOne.mockResolvedValue({
        user_id: '123',
        method: 'gauth',
        secret: 'zaszyfrowany-sekret'
      });

      const response = await request(app)
        .post('/auth/checkexists')
        .send({ id: '123', email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.method).toBe('gauth');
    });

    it('powinien wysłać kod email dla metody email', async () => {
      mockAuth.findOne.mockResolvedValue({
        user_id: '123',
        method: 'email',
        secret: 'zaszyfrowany-sekret',
        counter: 5
      });

      mockDecryptSecret.mockReturnValue('odszyfrowany-sekret');
      mockHotp.generate.mockReturnValue('123456');
      mockSend2FACodeEmail.mockResolvedValue(true);
      mockHelpers.storeHOTP.mockResolvedValue();

      const response = await request(app)
        .post('/auth/checkexists')
        .send({ id: '123', email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.method).toBe('email');
      expect(mockSend2FACodeEmail).toHaveBeenCalledWith('test@example.com', '123456');
    });

    it('powinien zwrócić błąd gdy wysyłanie email nie powiedzie się', async () => {
      mockAuth.findOne.mockResolvedValue({
        user_id: '123',
        method: 'email',
        secret: 'zaszyfrowany-sekret',
        counter: 5
      });

      mockDecryptSecret.mockReturnValue('odszyfrowany-sekret');
      mockHotp.generate.mockReturnValue('123456');
      mockSend2FACodeEmail.mockResolvedValue(false);

      const response = await request(app)
        .post('/auth/checkexists')
        .send({ id: '123', email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Failed sending email');
    });
  });

  describe('POST /confirmOTPcode', () => {
    it('powinien zwrócić błąd dla nieprawidłowego ID użytkownika', async () => {
      const response = await request(app)
        .post('/auth/confirmOTPcode')
        .send({ id: 'nieprawidlowe-id', code: '123456' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid user ID');
    });

    it('powinien zwrócić 401 gdy użytkownik nie istnieje', async () => {
      mockAuth.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/confirmOTPcode')
        .send({ id: '123', code: '123456' });

      expect(response.status).toBe(401);
      expect(response.body).toBe(false);
    });

    it('powinien zweryfikować kod TOTP dla metody gauth', async () => {
      mockAuth.findOne.mockResolvedValue({
        user_id: '123',
        method: 'gauth',
        secret: 'zaszyfrowany-sekret'
      });

      mockDecryptSecret.mockReturnValue('odszyfrowany-sekret');
      mockAuthenticator.check.mockReturnValue(true);

      const response = await request(app)
        .post('/auth/confirmOTPcode')
        .send({ id: '123', code: '123456' });

      expect(response.status).toBe(200);
      expect(response.body).toBe(true);
    });

    it('powinien zwrócić błąd dla nieprawidłowego kodu', async () => {
      mockAuth.findOne.mockResolvedValue({
        user_id: '123',
        method: 'gauth',
        secret: 'zaszyfrowany-sekret'
      });

      mockDecryptSecret.mockReturnValue('odszyfrowany-sekret');
      mockAuthenticator.check.mockReturnValue(false);

      const response = await request(app)
        .post('/auth/confirmOTPcode')
        .send({ id: '123', code: '123456' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid 2FA code.');
    });
  });

  describe('DELETE /remove', () => {
    it('powinien zwrócić błąd dla nieprawidłowego ID użytkownika', async () => {
      const response = await request(app)
        .delete('/auth/remove')
        .send({ id: 'nieprawidlowe-id' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid user ID');
    });

    it('powinien usunąć uwierzytelnianie gdy użytkownik istnieje', async () => {
      mockAuth.findOne.mockResolvedValue({ user_id: '123' });
      mockAuth.destroy.mockResolvedValue();

      const response = await request(app)
        .delete('/auth/remove')
        .send({ id: '123' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Authentication removed');
    });
  });

  describe('GET /health', () => {
    it('powinien zwrócić status zdrowia', async () => {
      const response = await request(app).get('/auth/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('POST /enable', () => {
    it('powinien zwrócić błąd dla nieprawidłowego ID użytkownika', async () => {
      const response = await request(app)
        .post('/auth/enable')
        .send({ id: '0', method: 'biometrics', email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid user ID');
    });

    it('powinien włączyć uwierzytelnianie biometryczne', async () => {
      mockAuth.findOne.mockResolvedValue(null);
      mockAuth.create.mockResolvedValue();

      const response = await request(app)
        .post('/auth/enable')
        .send({ id: '123', method: 'biometrics', email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.requiresCode).toBe(false);
    });

    it('powinien zwrócić błąd dla nieznanej metody', async () => {
      const response = await request(app)
        .post('/auth/enable')
        .send({ id: '123', method: 'nieznana-metoda', email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Unknown method');
    });
  });

  describe('POST /confirm', () => {
    it('powinien zwrócić błąd dla nieprawidłowego ID użytkownika', async () => {
      const response = await request(app)
        .post('/auth/confirm')
        .send({ id: '0', code: '123456' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid user ID');
    });

    it('powinien zwrócić błąd gdy użytkownik nie istnieje', async () => {
      mockAuth.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/confirm')
        .send({ id: '123', code: '123456' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('User with this email address was not found or have no pending 2fa request.');
    });
  });
});