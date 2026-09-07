import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  handleToggle,
  confirm2FASettings,
  handleCancel,
  handlePasswordConfirmation,
  onConfirmCode,
  handleChangePassword,
  handleChangeEmail,
  handleDeleteAccount
} from '../controllers/settingsController';
import * as authApi from '../api/auth';

vi.mock('react-native', () => ({
  Alert: {
    alert: vi.fn()
  }
}));

vi.mock('expo-secure-store', () => ({
  deleteItemAsync: vi.fn(),
  setItemAsync: vi.fn()
}));

vi.mock('../api/auth', () => ({
  remove2fa: vi.fn(),
  enable2fa: vi.fn(),
  sendConfirmCode: vi.fn(),
  changeEmail: vi.fn(),
  changePassword: vi.fn(),
  deleteAccount: vi.fn(),
  clearUserSession: vi.fn()
}));

describe('Settings Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleToggle', () => {
    it('should show biometrics alert when biometrics is disabled', () => {
      const setSelected2FA = vi.fn();
      
      handleToggle('biometrics', true, setSelected2FA);
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Biometria niedostępna',
        'Skonfiguruj Face ID / Touch ID / odcisk palca w ustawieniach urządzenia.'
      );
      expect(setSelected2FA).not.toHaveBeenCalled();
    });

    it('should return early when method is disabled and not biometrics', () => {
      const setSelected2FA = vi.fn();
      
      handleToggle('sms', true, setSelected2FA);
      
      expect(Alert.alert).not.toHaveBeenCalled();
      expect(setSelected2FA).not.toHaveBeenCalled();
    });

    it('should toggle method when not disabled', () => {
      const setSelected2FA = vi.fn();
      
      handleToggle('sms', false, setSelected2FA);
      
      expect(setSelected2FA).toHaveBeenCalledWith(expect.any(Function));

      const toggleFunction = setSelected2FA.mock.calls[0][0];
      expect(toggleFunction('sms')).toBeNull();
      expect(toggleFunction('other')).toBe('sms');
    });
  });

  describe('confirm2FASettings', () => {
    it('should show alert when no method is selected', () => {
      const setIsDisabling = vi.fn();
      const setShowPasswordModal = vi.fn();
      
      confirm2FASettings(null, null, setIsDisabling, setShowPasswordModal);
      
      expect(Alert.alert).toHaveBeenCalledWith('Informacja', 'Wybierz przynajmniej jedną metodę 2FA');
      expect(setShowPasswordModal).not.toHaveBeenCalled();
    });

    it('should show alert when same method is already active', () => {
      const setIsDisabling = vi.fn();
      const setShowPasswordModal = vi.fn();
      
      confirm2FASettings('sms', 'sms', setIsDisabling, setShowPasswordModal);
      
      expect(Alert.alert).toHaveBeenCalledWith('Informacja', 'Wybrana metoda jest już aktywna');
      expect(setShowPasswordModal).not.toHaveBeenCalled();
    });

    it('should set disabling mode when removing 2FA', () => {
      const setIsDisabling = vi.fn();
      const setShowPasswordModal = vi.fn();
      
      confirm2FASettings('sms', null, setIsDisabling, setShowPasswordModal);
      
      expect(setIsDisabling).toHaveBeenCalledWith(true);
      expect(setShowPasswordModal).toHaveBeenCalledWith(true);
    });

    it('should set enabling mode when adding 2FA', () => {
      const setIsDisabling = vi.fn();
      const setShowPasswordModal = vi.fn();
      
      confirm2FASettings(null, 'sms', setIsDisabling, setShowPasswordModal);
      
      expect(setIsDisabling).toHaveBeenCalledWith(false);
      expect(setShowPasswordModal).toHaveBeenCalledWith(true);
    });
  });

  describe('handleCancel', () => {
    const mockSetters = {
      setSavedMethod: vi.fn(),
      setSelected2FA: vi.fn(),
      setConfirmPassword: vi.fn(),
      setShowGoogleModal: vi.fn()
    };
    const navigate = vi.fn();

    beforeEach(() => {
      Object.values(mockSetters).forEach(setter => setter.mockClear());
      navigate.mockClear();
    });

    it('should show alert for empty password', async () => {
      await handleCancel('', navigate, ...Object.values(mockSetters));
      
      expect(Alert.alert).toHaveBeenCalledWith('Informacja', 'Hasło nie może być puste');
      expect(authApi.remove2fa).not.toHaveBeenCalled();
    });

    it('should show alert for invalid password', async () => {
      authApi.remove2fa.mockResolvedValue('invalid password');
      
      await handleCancel('password', navigate, ...Object.values(mockSetters));
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Niepoprawne hasło');
    });

    it('should handle session expiry', async () => {
      authApi.remove2fa.mockResolvedValue({ status: 403 });
      
      await handleCancel('password', navigate, ...Object.values(mockSetters));
      
      expect(Alert.alert).toHaveBeenCalledWith('Sesja wygasła', 'Prosimy o ponowne zalogowanie');
      expect(authApi.clearUserSession).toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith('login');
    });

    it('should handle operation failure', async () => {
      authApi.remove2fa.mockResolvedValue(false);
      
      await handleCancel('password', navigate, ...Object.values(mockSetters));
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Operacja zakończona niepowodzeniem');
    });

    it('should handle successful removal', async () => {
      authApi.remove2fa.mockResolvedValue(true);
      
      await handleCancel('password', navigate, ...Object.values(mockSetters));
      
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('selected2FA');
      expect(mockSetters.setSavedMethod).toHaveBeenCalledWith(null);
      expect(mockSetters.setSelected2FA).toHaveBeenCalledWith(null);
    });

    it('should handle errors and cleanup', async () => {
      authApi.remove2fa.mockRejectedValue(new Error('Network error'));
      
      await handleCancel('password', navigate, ...Object.values(mockSetters));
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Nie udało się usunąć ustawień');
      expect(mockSetters.setConfirmPassword).toHaveBeenCalledWith('');
      expect(mockSetters.setShowGoogleModal).toHaveBeenCalledWith(false);
    });
  });

  describe('handlePasswordConfirmation', () => {
    const mockSetters = {
      setSavedMethod: vi.fn(),
      setSelected2FA: vi.fn(),
      setGeneratedSecret: vi.fn(),
      setShowGoogleModal: vi.fn(),
      setShowPasswordModal: vi.fn(),
      setConfirmPassword: vi.fn()
    };
    const navigate = vi.fn();

    beforeEach(() => {
      Object.values(mockSetters).forEach(setter => setter.mockClear());
      navigate.mockClear();
    });

    it('should show alert for empty password', async () => {
      await handlePasswordConfirmation('', false, navigate, ...Object.values(mockSetters), 'sms');
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Podaj hasło');
    });

    describe('disabling 2FA', () => {
      it('should successfully disable 2FA', async () => {
        authApi.remove2fa.mockResolvedValue(true);
        
        await handlePasswordConfirmation('password', true, navigate, ...Object.values(mockSetters), 'sms');
        
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('selected2FA');
        expect(mockSetters.setSavedMethod).toHaveBeenCalledWith(null);
        expect(mockSetters.setSelected2FA).toHaveBeenCalledWith(null);
        expect(Alert.alert).toHaveBeenCalledWith('Sukces', 'Uwierzytelnianie dwuskładnikowe zostało wyłączone');
      });
    });

    describe('enabling 2FA', () => {
      it('should handle successful 2FA enable without code requirement', async () => {
        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue({
            requiresCode: false
          })
        };
        authApi.enable2fa.mockResolvedValue(mockResponse);
        
        await handlePasswordConfirmation('password', false, navigate, ...Object.values(mockSetters), 'biometrics');
        
        expect(Alert.alert).toHaveBeenCalledWith('Sukces', 'Ustawienia 2FA zostały zapisane');
      });

      it('should handle session expiry during enable', async () => {
        const mockResponse = {
          ok: false,
          status: 403,
          json: vi.fn().mockResolvedValue({})
        };
        authApi.enable2fa.mockResolvedValue(mockResponse);
        
        await handlePasswordConfirmation('password', false, navigate, ...Object.values(mockSetters), 'sms');
        
        expect(Alert.alert).toHaveBeenCalledWith('Sesja wygasła', 'Prosimy o ponowne zalogowanie');
        expect(authApi.clearUserSession).toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith('login');
      });

      it('should handle enable failure', async () => {
        const mockResponse = {
          ok: false,
          status: 400,
          json: vi.fn().mockResolvedValue({})
        };
        authApi.enable2fa.mockResolvedValue(mockResponse);
        const savedMethod = 'existing';
        
        await handlePasswordConfirmation('password', false, navigate, mockSetters.setSavedMethod, mockSetters.setSelected2FA, 'sms', mockSetters.setGeneratedSecret, mockSetters.setShowGoogleModal, mockSetters.setShowPasswordModal, mockSetters.setConfirmPassword, savedMethod);
        
        expect(mockSetters.setShowPasswordModal).toHaveBeenCalledWith(false);
        expect(mockSetters.setConfirmPassword).toHaveBeenCalledWith('');
        expect(mockSetters.setSelected2FA).toHaveBeenCalledWith('existing');
        expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Nie udało się zapisać ustawień 2FA');
      });
    });

    it('should handle errors', async () => {
      authApi.remove2fa.mockRejectedValue(new Error('Network error'));
      
      await handlePasswordConfirmation('password', true, navigate, ...Object.values(mockSetters), 'sms');
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Nie udało się zapisać ustawień 2FA');
    });
  });

  describe('onConfirmCode', () => {
    const mockSetters = {
      setSavedMethod: vi.fn(),
      setShowGoogleModal: vi.fn(),
      setConfirmPassword: vi.fn()
    };
    const navigate = vi.fn();

    beforeEach(() => {
      Object.values(mockSetters).forEach(setter => setter.mockClear());
      navigate.mockClear();
    });

    it('should show alert for empty code', async () => {
      await onConfirmCode('', navigate, ...Object.values(mockSetters), 'totp');
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wprowadź kod');
    });

    it('should show alert for whitespace-only code', async () => {
      await onConfirmCode('   ', navigate, ...Object.values(mockSetters), 'totp');
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wprowadź kod');
    });

    it('should handle invalid code', async () => {
      authApi.sendConfirmCode.mockResolvedValue({ status: 401 });
      
      await onConfirmCode('123456', navigate, ...Object.values(mockSetters), 'totp');
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Nieprawidłowy kod');
    });

    it('should handle session expiry', async () => {
      authApi.sendConfirmCode.mockResolvedValue({ status: 403 });
      
      await onConfirmCode('123456', navigate, ...Object.values(mockSetters), 'totp');
      
      expect(Alert.alert).toHaveBeenCalledWith('Sesja wygasła', 'Prosimy o ponowne zalogowanie');
      expect(authApi.clearUserSession).toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith('login');
    });

    it('should handle successful code confirmation', async () => {
      authApi.sendConfirmCode.mockResolvedValue({ ok: true });
      
      await onConfirmCode('123456', navigate, ...Object.values(mockSetters), 'totp');
      
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('selected2FA', 'totp');
      expect(mockSetters.setSavedMethod).toHaveBeenCalledWith('totp');
      expect(mockSetters.setShowGoogleModal).toHaveBeenCalledWith(false);
      expect(mockSetters.setConfirmPassword).toHaveBeenCalledWith('');
      expect(Alert.alert).toHaveBeenCalledWith('Sukces', 'Ustawienia 2FA zostały zapisane');
    });

    it('should handle other errors', async () => {
      authApi.sendConfirmCode.mockResolvedValue({ ok: false, status: 500 });
      
      await onConfirmCode('123456', navigate, ...Object.values(mockSetters), 'totp');
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wystąpił błąd');
    });

    it('should handle network errors', async () => {
      authApi.sendConfirmCode.mockRejectedValue(new Error('Network error'));
      
      await onConfirmCode('123456', navigate, ...Object.values(mockSetters), 'totp');
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Nie udało się połączyć z serwerem');
    });
  });

  describe('handleChangePassword', () => {
    const mockSetters = {
      setOldPassword: vi.fn(),
      setNewPassword: vi.fn(),
      setShowChangePasswordModal: vi.fn()
    };
    const navigate = vi.fn();

    beforeEach(() => {
      Object.values(mockSetters).forEach(setter => setter.mockClear());
      navigate.mockClear();
    });

    it('should show alert for missing fields', async () => {
      await handleChangePassword('', 'newpass', ...Object.values(mockSetters), navigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wszystkie pola muszą być wypełnione');
    });

    it('should handle successful password change', async () => {
      authApi.changePassword.mockResolvedValue({ ok: true });
      
      await handleChangePassword('oldpass', 'newpass', ...Object.values(mockSetters), navigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Sukces', 'Hasło zostało zmienione');
      expect(mockSetters.setOldPassword).toHaveBeenCalledWith('');
      expect(mockSetters.setNewPassword).toHaveBeenCalledWith('');
      expect(mockSetters.setShowChangePasswordModal).toHaveBeenCalledWith(false);
    });

    it('should handle session expiry', async () => {
      authApi.changePassword.mockResolvedValue({ ok: false, status: 403 });
      
      await handleChangePassword('oldpass', 'newpass', ...Object.values(mockSetters), navigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Sesja wygasła', 'Prosimy o ponowne zalogowanie');
      expect(authApi.clearUserSession).toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith('login');
    });

    it('should handle change failure', async () => {
      authApi.changePassword.mockResolvedValue({ ok: false, status: 400 });
      
      await handleChangePassword('oldpass', 'newpass', ...Object.values(mockSetters), navigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Nie udało się zmienić hasła');
    });

    it('should handle errors', async () => {
      authApi.changePassword.mockRejectedValue(new Error('Network error'));
      
      await handleChangePassword('oldpass', 'newpass', ...Object.values(mockSetters), navigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wystąpił błąd podczas zmiany hasła');
    });
  });

  describe('handleChangeEmail', () => {
    const mockSetters = {
      setConfirmPasswordEmail: vi.fn(),
      setNewEmail: vi.fn(),
      setShowChangeEmailModal: vi.fn()
    };
    const navigate = vi.fn();

    beforeEach(() => {
      Object.values(mockSetters).forEach(setter => setter.mockClear());
      navigate.mockClear();
    });

    it('should show alert for missing fields', async () => {
      await handleChangeEmail('', 'new@email.com', ...Object.values(mockSetters), navigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wszystkie pola muszą być wypełnione');
    });

    it('should handle successful email change', async () => {
      authApi.changeEmail.mockResolvedValue({ ok: true });
      
      await handleChangeEmail('password', 'new@email.com', ...Object.values(mockSetters), navigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Sukces', 'Email został zmieniony');
      expect(mockSetters.setConfirmPasswordEmail).toHaveBeenCalledWith('');
      expect(mockSetters.setNewEmail).toHaveBeenCalledWith('');
      expect(mockSetters.setShowChangeEmailModal).toHaveBeenCalledWith(false);
    });

    it('should handle session expiry', async () => {
      authApi.changeEmail.mockResolvedValue({ ok: false, status: 403 });
      
      await handleChangeEmail('password', 'new@email.com', ...Object.values(mockSetters), navigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Sesja wygasła', 'Prosimy o ponowne zalogowanie');
      expect(authApi.clearUserSession).toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith('login');
    });

    it('should handle change failure', async () => {
      authApi.changeEmail.mockResolvedValue({ ok: false, status: 400 });
      
      await handleChangeEmail('password', 'new@email.com', ...Object.values(mockSetters), navigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Nie udało się zmienić emaila');
    });

    it('should handle errors', async () => {
      authApi.changeEmail.mockRejectedValue(new Error('Network error'));
      
      await handleChangeEmail('password', 'new@email.com', ...Object.values(mockSetters), navigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wystąpił błąd podczas zmiany emaila');
    });
  });

  describe('handleDeleteAccount', () => {
    const mockSetters = {
      setDeletePassword: vi.fn(),
      setShowDeleteModal: vi.fn()
    };
    const navigate = vi.fn();

    beforeEach(() => {
      Object.values(mockSetters).forEach(setter => setter.mockClear());
      navigate.mockClear();
    });

    it('should show alert for missing password', async () => {
      await handleDeleteAccount('', ...Object.values(mockSetters), navigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Podaj hasło aby usunąć konto');
    });

    it('should handle successful account deletion', async () => {
      authApi.deleteAccount.mockResolvedValue(true);
      
      await handleDeleteAccount('password', ...Object.values(mockSetters), navigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Sukces', 'Konto zostało usunięte');
      expect(mockSetters.setDeletePassword).toHaveBeenCalledWith('');
      expect(mockSetters.setShowDeleteModal).toHaveBeenCalledWith(false);
      expect(authApi.clearUserSession).toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith('welcome');
    });

    it('should handle session expiry', async () => {
      authApi.deleteAccount.mockResolvedValue({ status: 403 });
      
      await handleDeleteAccount('password', ...Object.values(mockSetters), navigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Sesja wygasła', 'Prosimy o ponowne zalogowanie');
      expect(authApi.clearUserSession).toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith('login');
    });

    it('should handle deletion failure', async () => {
      authApi.deleteAccount.mockResolvedValue(false);
      
      await handleDeleteAccount('password', ...Object.values(mockSetters), navigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Nie udało się usunąć konta');
    });

    it('should handle errors', async () => {
      authApi.deleteAccount.mockRejectedValue(new Error('Network error'));
      
      await handleDeleteAccount('password', ...Object.values(mockSetters), navigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wystąpił błąd podczas usuwania konta');
    });
  });
});