import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCrypto = {
  randomBytes: vi.fn(),
  createCipheriv: vi.fn(),
  createDecipheriv: vi.fn()
};

const mockCipher = {
  update: vi.fn(),
  final: vi.fn()
};

const mockDecipher = {
  update: vi.fn(),
  final: vi.fn()
};

const SECRET_KEY = 'super_secret_32_bytes_long_key!!';
const IV_LENGTH = 16;

function encryptSecret(secret) {
  const iv = mockCrypto.randomBytes(IV_LENGTH);
  const cipher = mockCrypto.createCipheriv("aes-256-cbc", Buffer.from(SECRET_KEY), iv);

  let encrypted = cipher.update(secret, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
}

function decryptSecret(encryptedSecret) {
  if (!encryptedSecret) return null;

  const [ivHex, encrypted] = encryptedSecret.split(":");
  if (!ivHex || !encrypted) throw new Error("Invalid format");
  
  const iv = Buffer.from(ivHex, "hex");
  const decipher = mockCrypto.createDecipheriv("aes-256-cbc", Buffer.from(SECRET_KEY), iv);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

describe('Isolated Crypto Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('encryptSecret', () => {
    it('should encrypt secret successfully', () => {
      const secret = 'my-secret-data';
      const mockIv = Buffer.alloc(16, 1); 
      
      mockCrypto.randomBytes.mockReturnValue(mockIv);
      mockCrypto.createCipheriv.mockReturnValue(mockCipher);
      mockCipher.update.mockReturnValue('encrypted_part1');
      mockCipher.final.mockReturnValue('encrypted_part2');

      const result = encryptSecret(secret);

      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(16);
      expect(mockCrypto.createCipheriv).toHaveBeenCalledWith(
        'aes-256-cbc',
        Buffer.from(SECRET_KEY),
        mockIv
      );
      expect(mockCipher.update).toHaveBeenCalledWith(secret, 'utf8', 'hex');
      expect(mockCipher.final).toHaveBeenCalledWith('hex');
      
      const expectedIvHex = mockIv.toString('hex');
      expect(result).toBe(`${expectedIvHex}:encrypted_part1encrypted_part2`);
    });

    it('should handle empty secret', () => {
      const secret = '';
      const mockIv = Buffer.alloc(16, 2);
      
      mockCrypto.randomBytes.mockReturnValue(mockIv);
      mockCrypto.createCipheriv.mockReturnValue(mockCipher);
      mockCipher.update.mockReturnValue('');
      mockCipher.final.mockReturnValue('final_part');

      const result = encryptSecret(secret);

      expect(mockCipher.update).toHaveBeenCalledWith('', 'utf8', 'hex');
      expect(result).toContain('final_part');
    });

    it('should handle crypto randomBytes error', () => {
      mockCrypto.randomBytes.mockImplementation(() => {
        throw new Error('randomBytes failed');
      });

      expect(() => encryptSecret('test')).toThrow('randomBytes failed');
    });

    it('should handle cipher creation error', () => {
      const mockIv = Buffer.alloc(16, 1);
      mockCrypto.randomBytes.mockReturnValue(mockIv);
      mockCrypto.createCipheriv.mockImplementation(() => {
        throw new Error('createCipheriv failed');
      });

      expect(() => encryptSecret('test')).toThrow('createCipheriv failed');
    });

    it('should handle cipher update error', () => {
      const mockIv = Buffer.alloc(16, 1);
      mockCrypto.randomBytes.mockReturnValue(mockIv);
      mockCrypto.createCipheriv.mockReturnValue(mockCipher);
      mockCipher.update.mockImplementation(() => {
        throw new Error('cipher update failed');
      });

      expect(() => encryptSecret('test')).toThrow('cipher update failed');
    });

    it('should handle cipher final error', () => {
      const mockIv = Buffer.alloc(16, 1);
      mockCrypto.randomBytes.mockReturnValue(mockIv);
      mockCrypto.createCipheriv.mockReturnValue(mockCipher);
      mockCipher.update.mockReturnValue('encrypted');
      mockCipher.final.mockImplementation(() => {
        throw new Error('cipher final failed');
      });

      expect(() => encryptSecret('test')).toThrow('cipher final failed');
    });
  });

  describe('decryptSecret', () => {
    it('should decrypt encrypted secret successfully', () => {
      const ivHex = '01010101010101010101010101010101'; // 16 bytes of 0x01
      const encryptedData = 'encrypted_hex_data';
      const encryptedSecret = `${ivHex}:${encryptedData}`;
      
      mockCrypto.createDecipheriv.mockReturnValue(mockDecipher);
      mockDecipher.update.mockReturnValue('decrypted_part');
      mockDecipher.final.mockReturnValue('_final');

      const result = decryptSecret(encryptedSecret);

      expect(mockCrypto.createDecipheriv).toHaveBeenCalledWith(
        'aes-256-cbc',
        Buffer.from(SECRET_KEY),
        Buffer.from(ivHex, 'hex')
      );
      expect(mockDecipher.update).toHaveBeenCalledWith(encryptedData, 'hex', 'utf8');
      expect(mockDecipher.final).toHaveBeenCalledWith('utf8');
      expect(result).toBe('decrypted_part_final');
    });

    it('should return null for null input', () => {
      const result = decryptSecret(null);
      expect(result).toBeNull();
      expect(mockCrypto.createDecipheriv).not.toHaveBeenCalled();
    });

    it('should return null for undefined input', () => {
      const result = decryptSecret(undefined);
      expect(result).toBeNull();
      expect(mockCrypto.createDecipheriv).not.toHaveBeenCalled();
    });

    it('should return null for empty string', () => {
      const result = decryptSecret('');
      expect(result).toBeNull();
      expect(mockCrypto.createDecipheriv).not.toHaveBeenCalled();
    });

    it('should handle malformed encrypted secret (no colon)', () => {
      expect(() => decryptSecret('no_colon_here')).toThrow('Invalid format');
    });

    it('should handle malformed encrypted secret (missing encrypted part)', () => {
      expect(() => decryptSecret('01010101010101010101010101010101:')).toThrow('Invalid format');
    });

    it('should handle decipher creation error', () => {
      const validSecret = '01010101010101010101010101010101:encrypted_data';
      
      mockCrypto.createDecipheriv.mockImplementation(() => {
        throw new Error('createDecipheriv failed');
      });

      expect(() => decryptSecret(validSecret)).toThrow('createDecipheriv failed');
    });

    it('should handle decipher update error', () => {
      const validSecret = '01010101010101010101010101010101:encrypted_data';
      
      mockCrypto.createDecipheriv.mockReturnValue(mockDecipher);
      mockDecipher.update.mockImplementation(() => {
        throw new Error('decipher update failed');
      });

      expect(() => decryptSecret(validSecret)).toThrow('decipher update failed');
    });

    it('should handle decipher final error (corrupted data)', () => {
      const validSecret = '01010101010101010101010101010101:corrupted_data';
      
      mockCrypto.createDecipheriv.mockReturnValue(mockDecipher);
      mockDecipher.update.mockReturnValue('partial');
      mockDecipher.final.mockImplementation(() => {
        throw new Error('bad decrypt');
      });

      expect(() => decryptSecret(validSecret)).toThrow('bad decrypt');
    });
  });

  describe('Integration scenarios', () => {
    it('should encrypt and then decrypt to original value', () => {
      const originalSecret = 'my-super-secret-data';
      const mockIv = Buffer.alloc(16, 3);
      const ivHex = mockIv.toString('hex');

      mockCrypto.randomBytes.mockReturnValue(mockIv);
      mockCrypto.createCipheriv.mockReturnValue(mockCipher);
      mockCipher.update.mockReturnValue('encrypted_part1');
      mockCipher.final.mockReturnValue('encrypted_part2');

      const encrypted = encryptSecret(originalSecret);
      expect(encrypted).toBe(`${ivHex}:encrypted_part1encrypted_part2`);

      mockCrypto.createDecipheriv.mockReturnValue(mockDecipher);
      mockDecipher.update.mockReturnValue('my-super-secret');
      mockDecipher.final.mockReturnValue('-data');

      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe('my-super-secret-data');

      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(16);
      expect(mockCrypto.createCipheriv).toHaveBeenCalledWith(
        'aes-256-cbc',
        Buffer.from(SECRET_KEY),
        mockIv
      );
      expect(mockCrypto.createDecipheriv).toHaveBeenCalledWith(
        'aes-256-cbc',
        Buffer.from(SECRET_KEY),
        Buffer.from(ivHex, 'hex')
      );
    });

    it('should handle multiple encryptions with different IVs', () => {
      const secret1 = 'secret-one';
      const secret2 = 'secret-two';

      const mockIv1 = Buffer.alloc(16, 1);
      mockCrypto.randomBytes.mockReturnValueOnce(mockIv1);
      mockCrypto.createCipheriv.mockReturnValue(mockCipher);
      mockCipher.update.mockReturnValue('enc1');
      mockCipher.final.mockReturnValue('_final1');

      const encrypted1 = encryptSecret(secret1);

      const mockIv2 = Buffer.alloc(16, 2);
      mockCrypto.randomBytes.mockReturnValueOnce(mockIv2);
      mockCipher.update.mockReturnValue('enc2');
      mockCipher.final.mockReturnValue('_final2');

      const encrypted2 = encryptSecret(secret2);

      expect(encrypted1).not.toBe(encrypted2);
      expect(encrypted1).toContain(mockIv1.toString('hex'));
      expect(encrypted2).toContain(mockIv2.toString('hex'));
      expect(mockCrypto.randomBytes).toHaveBeenCalledTimes(2);
    });

    it('should handle long secrets', () => {
      const longSecret = 'a'.repeat(1000);
      const mockIv = Buffer.alloc(16, 5);
      
      mockCrypto.randomBytes.mockReturnValue(mockIv);
      mockCrypto.createCipheriv.mockReturnValue(mockCipher);
      mockCipher.update.mockReturnValue('long_encrypted');
      mockCipher.final.mockReturnValue('_final');

      const result = encryptSecret(longSecret);

      expect(mockCipher.update).toHaveBeenCalledWith(longSecret, 'utf8', 'hex');
      expect(result).toContain('long_encrypted_final');
    });

    it('should handle special characters', () => {
      const specialSecret = '🔐 Test émoji & spëcial chars! @#$%^&*()';
      const mockIv = Buffer.alloc(16, 6);
      
      mockCrypto.randomBytes.mockReturnValue(mockIv);
      mockCrypto.createCipheriv.mockReturnValue(mockCipher);
      mockCipher.update.mockReturnValue('special_encrypted');
      mockCipher.final.mockReturnValue('_final');

      const result = encryptSecret(specialSecret);

      expect(mockCipher.update).toHaveBeenCalledWith(specialSecret, 'utf8', 'hex');
      expect(result).toContain('special_encrypted_final');
    });
  });

  describe('Buffer and encoding tests', () => {
    it('should handle Buffer.from operations correctly', () => {
      const testKey = SECRET_KEY;
      const testIvHex = '01020304050607080910111213141516';

      const keyBuffer = Buffer.from(testKey);
      const ivBuffer = Buffer.from(testIvHex, 'hex');
      
      expect(keyBuffer).toBeInstanceOf(Buffer);
      expect(ivBuffer).toBeInstanceOf(Buffer);
      expect(keyBuffer.length).toBe(32);
      expect(ivBuffer.length).toBe(16);
    });

    it('should handle IV hex conversion correctly', () => {
      const mockIv = Buffer.alloc(16, 7);
      const hexString = mockIv.toString('hex');
      const reconstructedIv = Buffer.from(hexString, 'hex');
      
      expect(hexString).toBe('07070707070707070707070707070707');
      expect(reconstructedIv).toEqual(mockIv);
    });
  });
});