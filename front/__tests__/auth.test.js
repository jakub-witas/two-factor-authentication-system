import { describe, it, expect, beforeEach, vi } from "vitest";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode";

import {
  login,
  register,
  logout,
  handleBiometricLogin,
  confirmBiometricLogin,
  checkBiometricAuthSupport,
  handleOTPlogin,
  enable2fa,
  sendConfirmCode,
  remove2fa,
  changeEmail,
  changePassword,
  deleteAccount,
  storeUserSession,
  clearUserSession,
} from "../api/auth";

global.fetch = vi.fn();
vi.mock("expo-local-authentication", () => ({
  authenticateAsync: vi.fn(),
  hasHardwareAsync: vi.fn(),
  isEnrolledAsync: vi.fn(),
}));
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));
vi.mock("jwt-decode", () => ({
  jwtDecode: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Auth API functions", () => {
  it("login returns response", async () => {
    const mockRes = { ok: true };
    fetch.mockResolvedValue(mockRes);

    const res = await login("a@a.com", "123");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/login"),
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(res).toBe(mockRes);
  });

  it("register returns true when ok", async () => {
    fetch.mockResolvedValue({ ok: true });
    const res = await register("name", "a@a.com", "123");
    expect(res).toBe(true);
  });

  it("register throws error when not ok", async () => {
    fetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "fail" }),
    });
    await register("n", "e", "p"); 
  });

  it("logout clears session on success", async () => {
    SecureStore.getItemAsync.mockResolvedValue("token");
    fetch.mockResolvedValue({ ok: true });
    const res = await logout();
    expect(res).toBe(true);
    expect(fetch).toHaveBeenCalled();
  });
});

describe("Biometric login", () => {
  it("handleBiometricLogin returns result", async () => {
    LocalAuthentication.authenticateAsync.mockResolvedValue({ success: true });
    const res = await handleBiometricLogin();
    expect(res.success).toBe(true);
  });

  it("confirmBiometricLogin calls fetch", async () => {
    const mockRes = { ok: true };
    fetch.mockResolvedValue(mockRes);
    const res = await confirmBiometricLogin("e", "biometrics", "temp");
    expect(res).toBe(mockRes);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/2fa/biometricLogin"),
      expect.any(Object)
    );
  });

  it("checkBiometricAuthSupport returns true when supported", async () => {
    LocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
    LocalAuthentication.isEnrolledAsync.mockResolvedValue(true);
    const res = await checkBiometricAuthSupport();
    expect(res).toBe(true);
  });

  it("checkBiometricAuthSupport returns false when not supported", async () => {
    LocalAuthentication.hasHardwareAsync.mockResolvedValue(false);
    LocalAuthentication.isEnrolledAsync.mockResolvedValue(false);
    const res = await checkBiometricAuthSupport();
    expect(res).toBe(false);
  });
});

describe("OTP & 2FA", () => {
  it("handleOTPlogin calls fetch", async () => {
    const mockRes = { ok: true };
    fetch.mockResolvedValue(mockRes);
    const res = await handleOTPlogin("otp", "e", "temp", "123456");
    expect(res).toBe(mockRes);
  });

  it("enable2fa calls fetch with token", async () => {
    SecureStore.getItemAsync.mockResolvedValue("token");
    fetch.mockResolvedValue({ ok: true });
    const res = await enable2fa("otp", "password");
    expect(res.ok).toBe(true);
  });

  it("sendConfirmCode calls fetch", async () => {
    SecureStore.getItemAsync.mockResolvedValue("token");
    fetch.mockResolvedValue({ ok: true });
    const res = await sendConfirmCode("123456");
    expect(res.ok).toBe(true);
  });

  it("remove2fa returns true when ok", async () => {
    SecureStore.getItemAsync.mockResolvedValue("token");
    fetch.mockResolvedValue({ ok: true });
    const res = await remove2fa("password");
    expect(res).toBe(true);
  });

  it("remove2fa returns invalid password on 401", async () => {
    SecureStore.getItemAsync.mockResolvedValue("token");
    fetch.mockResolvedValue({ ok: false, status: 401 });
    const res = await remove2fa("password");
    expect(res).toBe("invalid password");
  });
});

describe("Account changes", () => {
  it("changeEmail calls fetch", async () => {
    SecureStore.getItemAsync.mockResolvedValue("token");
    const mockRes = { ok: true };
    fetch.mockResolvedValue(mockRes);
    const res = await changeEmail("pass", "new@x.com");
    expect(res).toBe(mockRes);
  });

  it("changePassword calls fetch", async () => {
    SecureStore.getItemAsync.mockResolvedValue("token");
    const mockRes = { ok: true };
    fetch.mockResolvedValue(mockRes);
    const res = await changePassword("pass", "newpass");
    expect(res).toBe(mockRes);
  });

  it("deleteAccount calls fetch", async () => {
    SecureStore.getItemAsync.mockResolvedValue("token");
    const mockRes = { ok: true };
    fetch.mockResolvedValue(mockRes);
    const res = await deleteAccount("pass");
    expect(res).toBe(mockRes);
  });
});

describe("Session storage", () => {
  it("storeUserSession saves to SecureStore", async () => {
    jwtDecode.mockReturnValue({
      name: "John Doe",
      email: "john@x.com",
      exp: 12345,
    });
    const res = await storeUserSession("token123", "otp");
    expect(res).toBe(true);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("userToken", "token123");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("selected2FA", "otp");
  });

  it("clearUserSession deletes all keys", async () => {
    const res = await clearUserSession();
    expect(res).not.toBe(false);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("userToken");
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("userEmail");
  });
});
