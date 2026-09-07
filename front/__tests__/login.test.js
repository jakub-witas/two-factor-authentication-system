import { Alert } from 'react-native';
import { onSubmit, handleOTPAuth } from '../controllers/loginController';
import { 
  login, 
  checkBiometricAuthSupport, 
  handleBiometricLogin, 
  storeUserSession, 
  confirmBiometricLogin, 
  handleOTPlogin 
} from '../api/auth';

vi.mock('react-native', () => ({
  Alert: {
    alert: vi.fn(),
  },
}));

vi.mock('../api/auth', () => ({
  login: vi.fn(),
  checkBiometricAuthSupport: vi.fn(),
  handleBiometricLogin: vi.fn(),
  storeUserSession: vi.fn(),
  confirmBiometricLogin: vi.fn(),
  handleOTPlogin: vi.fn(),
}));

describe('onSubmit', () => {
  let mockSetLoading, mockSessionIdRef, mockSetMethod, mockSetShowModal, mockNavigate, mockSetPassword, mockSetEmail;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSetLoading = vi.fn();
    mockSessionIdRef = { current: null };
    mockSetMethod = vi.fn();
    mockSetShowModal = vi.fn();
    mockNavigate = vi.fn();
    mockSetPassword = vi.fn();
    mockSetEmail = vi.fn();
  });

  describe('Walidacja danych wejściowych', () => {
    test('powinien pokazać alert gdy email jest pusty', async () => {
      await onSubmit('', 'password123', mockSetLoading, mockSessionIdRef, mockSetMethod, mockSetShowModal, mockNavigate, mockSetPassword, mockSetEmail);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wypełnij wszystkie pola');
      expect(mockSetLoading).not.toHaveBeenCalled();
    });

    test('powinien pokazać alert gdy password jest pusty', async () => {
      await onSubmit('test@test.com', '', mockSetLoading, mockSessionIdRef, mockSetMethod, mockSetShowModal, mockNavigate, mockSetPassword, mockSetEmail);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wypełnij wszystkie pola');
      expect(mockSetLoading).not.toHaveBeenCalled();
    });

    test('powinien pokazać alert gdy oba pola są puste', async () => {
      await onSubmit('', '', mockSetLoading, mockSessionIdRef, mockSetMethod, mockSetShowModal, mockNavigate, mockSetPassword, mockSetEmail);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wypełnij wszystkie pola');
      expect(mockSetLoading).not.toHaveBeenCalled();
    });

    test('powinien pokazać alert gdy email jest null', async () => {
      await onSubmit(null, 'password123', mockSetLoading, mockSessionIdRef, mockSetMethod, mockSetShowModal, mockNavigate, mockSetPassword, mockSetEmail);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wypełnij wszystkie pola');
    });
  });

  describe('Obsługa błędów API', () => {
    test('powinien obsłużyć wyjątek podczas wywołania login', async () => {
      const error = new Error('Network error');
      login.mockRejectedValue(error);
      console.log = vi.fn();

      await onSubmit('test@test.com', 'password123', mockSetLoading, mockSessionIdRef, mockSetMethod, mockSetShowModal, mockNavigate, mockSetPassword, mockSetEmail);

      expect(console.log).toHaveBeenCalledWith(error);
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('Logowanie bez 2FA', () => {
    test('powinien nawigować do home gdy logowanie jest udane bez 2FA', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          requires2FA: false,
          token: 'valid-token'
        })
      };
      login.mockResolvedValue(mockResponse);
      storeUserSession.mockResolvedValue(true);

      await onSubmit('test@test.com', 'password123', mockSetLoading, mockSessionIdRef, mockSetMethod, mockSetShowModal, mockNavigate, mockSetPassword, mockSetEmail);

      expect(storeUserSession).toHaveBeenCalledWith('valid-token', null);
      expect(mockNavigate).toHaveBeenCalledWith('home');
    });

    test('powinien pokazać alert gdy storeUserSession zwraca false', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          requires2FA: false,
          token: 'valid-token'
        })
      };
      login.mockResolvedValue(mockResponse);
      storeUserSession.mockResolvedValue(false);

      await onSubmit('test@test.com', 'password123', mockSetLoading, mockSessionIdRef, mockSetMethod, mockSetShowModal, mockNavigate, mockSetPassword, mockSetEmail);

      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wystąpił błąd podczas logowania');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Logowanie z 2FA - Email', () => {
    test('powinien ustawić modal dla metody email', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          requires2FA: true,
          method: 'email',
          tempSessionId: 'temp-session-123'
        })
      };
      login.mockResolvedValue(mockResponse);

      await onSubmit('test@test.com', 'password123', mockSetLoading, mockSessionIdRef, mockSetMethod, mockSetShowModal, mockNavigate, mockSetPassword, mockSetEmail);

      expect(mockSessionIdRef.current).toBe('temp-session-123');
      expect(mockSetMethod).toHaveBeenCalledWith('email');
      expect(mockSetShowModal).toHaveBeenCalledWith(true);
    });
  });

  describe('Logowanie z 2FA - Google Authenticator', () => {
    test('powinien ustawić modal dla metody gauth', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          requires2FA: true,
          method: 'gauth',
          tempSessionId: 'temp-session-456'
        })
      };
      login.mockResolvedValue(mockResponse);

      await onSubmit('test@test.com', 'password123', mockSetLoading, mockSessionIdRef, mockSetMethod, mockSetShowModal, mockNavigate, mockSetPassword, mockSetEmail);

      expect(mockSessionIdRef.current).toBe('temp-session-456');
      expect(mockSetMethod).toHaveBeenCalledWith('gauth');
      expect(mockSetShowModal).toHaveBeenCalledWith(true);
    });
  });

  describe('Logowanie z 2FA - Biometrics', () => {
    test('powinien wywołać handleBiometricAuth dla metody biometrics', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          requires2FA: true,
          method: 'biometrics',
          tempSessionId: 'temp-session-bio'
        })
      };
      login.mockResolvedValue(mockResponse);
      
      checkBiometricAuthSupport.mockReturnValue(true);
      handleBiometricLogin.mockResolvedValue({ success: true });
      
      const mockBioResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ token: 'bio-token' })
      };
      confirmBiometricLogin.mockResolvedValue(mockBioResponse);
      storeUserSession.mockResolvedValue(true);

      await onSubmit('test@test.com', 'password123', mockSetLoading, mockSessionIdRef, mockSetMethod, mockSetShowModal, mockNavigate, mockSetPassword, mockSetEmail);

      expect(checkBiometricAuthSupport).toHaveBeenCalledWith('biometrics');
      expect(handleBiometricLogin).toHaveBeenCalled();
      expect(confirmBiometricLogin).toHaveBeenCalledWith('test@test.com', 'biometrics', 'temp-session-bio');
    });

    test('powinien pokazać alert gdy biometrics nie jest wspierany', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          requires2FA: true,
          method: 'biometrics',
          tempSessionId: 'temp-session-bio'
        })
      };
      login.mockResolvedValue(mockResponse);
      checkBiometricAuthSupport.mockReturnValue(false);

      await onSubmit('test@test.com', 'password123', mockSetLoading, mockSessionIdRef, mockSetMethod, mockSetShowModal, mockNavigate, mockSetPassword, mockSetEmail);

      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Uwierzytelnianie biometryczne nie jest dostępne na tym urządzeniu');
      expect(mockSetMethod).toHaveBeenCalledWith('');
      expect(mockSetShowModal).toHaveBeenCalledWith(false);
      expect(mockSetPassword).toHaveBeenCalledWith('');
      expect(mockSetEmail).toHaveBeenCalledWith('');
    });

    test('powinien obsłużyć niepowodzenie uwierzytelniania biometrycznego', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          requires2FA: true,
          method: 'biometrics',
          tempSessionId: 'temp-session-bio'
        })
      };
      login.mockResolvedValue(mockResponse);
      checkBiometricAuthSupport.mockReturnValue(true);
      handleBiometricLogin.mockResolvedValue({ success: false });

      await onSubmit('test@test.com', 'password123', mockSetLoading, mockSessionIdRef, mockSetMethod, mockSetShowModal, mockNavigate, mockSetPassword, mockSetEmail);

      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Uwierzytelnianie biometryczne nie powiodło się');
    });

    test('powinien obsłużyć błąd podczas uwierzytelniania biometrycznego', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          requires2FA: true,
          method: 'biometrics',
          tempSessionId: 'temp-session-bio'
        })
      };
      login.mockResolvedValue(mockResponse);
      checkBiometricAuthSupport.mockReturnValue(true);
      handleBiometricLogin.mockRejectedValue(new Error('Biometric error'));

      await onSubmit('test@test.com', 'password123', mockSetLoading, mockSessionIdRef, mockSetMethod, mockSetShowModal, mockNavigate, mockSetPassword, mockSetEmail);

      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wystąpił błąd podczas uwierzytelniania biometrycznego2');
    });
  });

  describe('Nieznana metoda 2FA', () => {
    test('powinien pokazać alert dla nieoczekiwanej metody uwierzytelnienia', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          requires2FA: true,
          method: 'unknown-method',
          tempSessionId: 'temp-session-unknown'
        })
      };
      login.mockResolvedValue(mockResponse);

      await onSubmit('test@test.com', 'password123', mockSetLoading, mockSessionIdRef, mockSetMethod, mockSetShowModal, mockNavigate, mockSetPassword, mockSetEmail);

      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Nieoczekiwana metoda uwierzytelnienia.');
    });
  });

  describe('Stan loading', () => {
    test('powinien prawidłowo zarządzać stanem loading', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          requires2FA: false,
          token: 'valid-token'
        })
      };
      login.mockResolvedValue(mockResponse);
      storeUserSession.mockResolvedValue(true);

      await onSubmit('test@test.com', 'password123', mockSetLoading, mockSessionIdRef, mockSetMethod, mockSetShowModal, mockNavigate, mockSetPassword, mockSetEmail);

      expect(mockSetLoading).toHaveBeenNthCalledWith(1, true);
      expect(mockSetLoading).toHaveBeenNthCalledWith(2, false);
    });
  });
});

describe('handleOTPAuth', () => {
  let mockNavigate, mockSetMethod, mockSetShowModal, mockSetPassword, mockSetEmail;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate = vi.fn();
    mockSetMethod = vi.fn();
    mockSetShowModal = vi.fn();
    mockSetPassword = vi.fn();
    mockSetEmail = vi.fn();
  });

  describe('Udane uwierzytelnianie OTP', () => {
    test('powinien nawigować do home po udanym uwierzytelnieniu email OTP', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ token: 'otp-token' })
      };
      handleOTPlogin.mockResolvedValue(mockResponse);
      storeUserSession.mockResolvedValue(true);

      await handleOTPAuth('123456', 'temp-session-123', 'test@test.com', 'email', mockNavigate, mockSetMethod, mockSetShowModal, mockSetPassword, mockSetEmail);

      expect(handleOTPlogin).toHaveBeenCalledWith('email', 'test@test.com', 'temp-session-123', '123456');
      expect(storeUserSession).toHaveBeenCalledWith('otp-token', 'email');
      expect(mockNavigate).toHaveBeenCalledWith('home');
      expect(mockSetMethod).toHaveBeenCalledWith('');
      expect(mockSetShowModal).toHaveBeenCalledWith(false);
      expect(mockSetPassword).toHaveBeenCalledWith('');
      expect(mockSetEmail).toHaveBeenCalledWith('');
    });

    test('powinien nawigować do home po udanym uwierzytelnieniu gauth OTP', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ token: 'gauth-token' })
      };
      handleOTPlogin.mockResolvedValue(mockResponse);
      storeUserSession.mockResolvedValue(true);

      await handleOTPAuth('654321', 'temp-session-456', 'test@test.com', 'gauth', mockNavigate, mockSetMethod, mockSetShowModal, mockSetPassword, mockSetEmail);

      expect(handleOTPlogin).toHaveBeenCalledWith('gauth', 'test@test.com', 'temp-session-456', '654321');
      expect(storeUserSession).toHaveBeenCalledWith('gauth-token', 'gauth');
      expect(mockNavigate).toHaveBeenCalledWith('home');
    });
  });

  describe('Błędy uwierzytelniania OTP', () => {
    test('powinien pokazać alert dla nieprawidłowego kodu (status 401)', async () => {
      const mockResponse = {
        ok: false,
        status: 401
      };
      handleOTPlogin.mockResolvedValue(mockResponse);

      await handleOTPAuth('wrong-code', 'temp-session-123', 'test@test.com', 'email', mockNavigate, mockSetMethod, mockSetShowModal, mockSetPassword, mockSetEmail);

      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Nieprawidłowy kod');
      expect(mockNavigate).not.toHaveBeenCalled();
      
      expect(mockSetMethod).toHaveBeenCalledWith('');
      expect(mockSetShowModal).toHaveBeenCalledWith(false);
      expect(mockSetPassword).toHaveBeenCalledWith('');
      expect(mockSetEmail).toHaveBeenCalledWith('');
    });

    test('powinien pokazać alert dla innych błędów API', async () => {
      const mockResponse = {
        ok: false,
        status: 500
      };
      handleOTPlogin.mockResolvedValue(mockResponse);

      await handleOTPAuth('123456', 'temp-session-123', 'test@test.com', 'email', mockNavigate, mockSetMethod, mockSetShowModal, mockSetPassword, mockSetEmail);

      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wystąpił błąd podczas logowania');
    });

    test('powinien pokazać alert gdy storeUserSession zwraca false', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ token: 'otp-token' })
      };
      handleOTPlogin.mockResolvedValue(mockResponse);
      storeUserSession.mockResolvedValue(false);

      await handleOTPAuth('123456', 'temp-session-123', 'test@test.com', 'email', mockNavigate, mockSetMethod, mockSetShowModal, mockSetPassword, mockSetEmail);

      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wystąpił błąd podczas logowania');
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('powinien obsłużyć wyjątek podczas wywołania handleOTPlogin', async () => {
      const error = new Error('Network error');
      handleOTPlogin.mockRejectedValue(error);

      await handleOTPAuth('123456', 'temp-session-123', 'test@test.com', 'email', mockNavigate, mockSetMethod, mockSetShowModal, mockSetPassword, mockSetEmail);

      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wystąpił błąd podczas uwierzytelniania biometrycznego');

      expect(mockSetMethod).toHaveBeenCalledWith('');
      expect(mockSetShowModal).toHaveBeenCalledWith(false);
      expect(mockSetPassword).toHaveBeenCalledWith('');
      expect(mockSetEmail).toHaveBeenCalledWith('');
    });
  });

  describe('Cleanup funkcje', () => {
    test('powinien zawsze wyczyścić stan niezależnie od wyniku', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ token: 'otp-token' })
      };
      handleOTPlogin.mockResolvedValue(mockResponse);
      storeUserSession.mockResolvedValue(true);

      await handleOTPAuth('123456', 'temp-session-123', 'test@test.com', 'email', mockNavigate, mockSetMethod, mockSetShowModal, mockSetPassword, mockSetEmail);

      expect(mockSetMethod).toHaveBeenCalledWith('');
      expect(mockSetShowModal).toHaveBeenCalledWith(false);
      expect(mockSetPassword).toHaveBeenCalledWith('');
      expect(mockSetEmail).toHaveBeenCalledWith('');
    });

    test('powinien wyczyścić stan nawet gdy wystąpi błąd', async () => {
      handleOTPlogin.mockRejectedValue(new Error('Network error'));

      await handleOTPAuth('123456', 'temp-session-123', 'test@test.com', 'email', mockNavigate, mockSetMethod, mockSetShowModal, mockSetPassword, mockSetEmail);

      expect(mockSetMethod).toHaveBeenCalledWith('');
      expect(mockSetShowModal).toHaveBeenCalledWith(false);
      expect(mockSetPassword).toHaveBeenCalledWith('');
      expect(mockSetEmail).toHaveBeenCalledWith('');
    });
  });
});

describe('Edge cases i testy integracyjne', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('powinien obsłużyć null response z API', async () => {
    login.mockResolvedValue(null);
    
    const mockSetLoading = vi.fn();
    const mockSessionIdRef = { current: null };
    const mockSetMethod = vi.fn();
    const mockSetShowModal = vi.fn();
    const mockNavigate = vi.fn();
    const mockSetPassword = vi.fn();
    const mockSetEmail = vi.fn();

    await onSubmit('test@test.com', 'password123', mockSetLoading, mockSessionIdRef, mockSetMethod, mockSetShowModal, mockNavigate, mockSetPassword, mockSetEmail);

    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });

  test('powinien obsłużyć response bez metody json', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
    };
    login.mockResolvedValue(mockResponse);
    
    const mockSetLoading = vi.fn();
    const mockSessionIdRef = { current: null };
    const mockSetMethod = vi.fn();
    const mockSetShowModal = vi.fn();
    const mockNavigate = vi.fn();
    const mockSetPassword = vi.fn();
    const mockSetEmail = vi.fn();

    await onSubmit('test@test.com', 'password123', mockSetLoading, mockSessionIdRef, mockSetMethod, mockSetShowModal, mockNavigate, mockSetPassword, mockSetEmail);

    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });

  test('powinien obsłużyć pusty kod OTP', async () => {
    const mockNavigate = vi.fn();
    const mockSetMethod = vi.fn();
    const mockSetShowModal = vi.fn();
    const mockSetPassword = vi.fn();
    const mockSetEmail = vi.fn();

    await handleOTPAuth('', 'temp-session-123', 'test@test.com', 'email', mockNavigate, mockSetMethod, mockSetShowModal, mockSetPassword, mockSetEmail);

    expect(handleOTPlogin).toHaveBeenCalledWith('email', 'test@test.com', 'temp-session-123', '');
    expect(mockSetMethod).toHaveBeenCalledWith('');
    expect(mockSetShowModal).toHaveBeenCalledWith(false);
  });

  test('powinien obsłużyć bardzo długi kod OTP', async () => {
    const longCode = '1'.repeat(1000);
    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ token: 'valid-token' })
    };
    handleOTPlogin.mockResolvedValue(mockResponse);
    storeUserSession.mockResolvedValue(true);

    const mockNavigate = vi.fn();
    const mockSetMethod = vi.fn();
    const mockSetShowModal = vi.fn();
    const mockSetPassword = vi.fn();
    const mockSetEmail = vi.fn();

    await handleOTPAuth(longCode, 'temp-session-123', 'test@test.com', 'email', mockNavigate, mockSetMethod, mockSetShowModal, mockSetPassword, mockSetEmail);

    expect(handleOTPlogin).toHaveBeenCalledWith('email', 'test@test.com', 'temp-session-123', longCode);
    expect(mockNavigate).toHaveBeenCalledWith('home');
  });
});