import { Alert } from 'react-native';
import { onSubmit } from '../controllers/registerController';
import { register } from '../api/auth';

vi.mock('react-native', () => ({
  Alert: {
    alert: vi.fn(),
  },
}));

vi.mock('../api/auth', () => ({
  register: vi.fn(),
}));

describe('onSubmit - Register', () => {
  let mockSetLoading, mockNavigate;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSetLoading = vi.fn();
    mockNavigate = vi.fn();
  });

  describe('Walidacja danych wejściowych', () => {
    test('powinien pokazać alert gdy name jest pusty', async () => {
      await onSubmit('', 'test@test.com', 'password123', 'password123', mockSetLoading, mockNavigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wypełnij wszystkie pola');
      expect(mockSetLoading).not.toHaveBeenCalled();
    });

    test('powinien pokazać alert gdy email jest pusty', async () => {
      await onSubmit('John Doe', '', 'password123', 'password123', mockSetLoading, mockNavigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wypełnij wszystkie pola');
      expect(mockSetLoading).not.toHaveBeenCalled();
    });

    test('powinien pokazać alert gdy password jest pusty', async () => {
      await onSubmit('John Doe', 'test@test.com', '', 'password123', mockSetLoading, mockNavigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wypełnij wszystkie pola');
      expect(mockSetLoading).not.toHaveBeenCalled();
    });

    test('powinien pokazać alert gdy confirmPassword jest pusty', async () => {
      await onSubmit('John Doe', 'test@test.com', 'password123', '', mockSetLoading, mockNavigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wypełnij wszystkie pola');
      expect(mockSetLoading).not.toHaveBeenCalled();
    });

    test('powinien pokazać alert gdy wszystkie pola są puste', async () => {
      await onSubmit('', '', '', '', mockSetLoading, mockNavigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wypełnij wszystkie pola');
      expect(mockSetLoading).not.toHaveBeenCalled();
    });

    test('powinien pokazać alert gdy name jest null', async () => {
      await onSubmit(null, 'test@test.com', 'password123', 'password123', mockSetLoading, mockNavigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wypełnij wszystkie pola');
      expect(mockSetLoading).not.toHaveBeenCalled();
    });

    test('powinien pokazać alert gdy email jest undefined', async () => {
      await onSubmit('John Doe', undefined, 'password123', 'password123', mockSetLoading, mockNavigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wypełnij wszystkie pola');
      expect(mockSetLoading).not.toHaveBeenCalled();
    });

    test('powinien pokazać alert gdy pola są tylko spacjami', async () => {
      await onSubmit('   ', '   ', '   ', '   ', mockSetLoading, mockNavigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wypełnij wszystkie pola');
      expect(mockSetLoading).not.toHaveBeenCalled();
    });
  });

  describe('Walidacja haseł', () => {
    test('powinien pokazać alert gdy hasła nie są identyczne', async () => {
      await onSubmit('John Doe', 'test@test.com', 'password123', 'password456', mockSetLoading, mockNavigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Hasła nie są identyczne');
      expect(mockSetLoading).not.toHaveBeenCalled();
    });

    test('powinien pokazać alert gdy hasła różnią się wielkością liter', async () => {
      await onSubmit('John Doe', 'test@test.com', 'Password123', 'password123', mockSetLoading, mockNavigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Hasła nie są identyczne');
      expect(mockSetLoading).not.toHaveBeenCalled();
    });

    test('powinien pokazać alert gdy hasło ma dodatkowe spacje', async () => {
      await onSubmit('John Doe', 'test@test.com', 'password123', 'password123 ', mockSetLoading, mockNavigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Hasła nie są identyczne');
      expect(mockSetLoading).not.toHaveBeenCalled();
    });

    test('powinien przejść walidację gdy hasła są identyczne', async () => {
      register.mockResolvedValue(true);
      
      await onSubmit('John Doe', 'test@test.com', 'password123', 'password123', mockSetLoading, mockNavigate);
      
      expect(Alert.alert).not.toHaveBeenCalledWith('Błąd', 'Hasła nie są identyczne');
      expect(mockSetLoading).toHaveBeenCalledWith(true);
    });

    test('powinien przejść walidację dla pustych ale identycznych haseł (które i tak nie przejdą walidacji pól)', async () => {
      await onSubmit('John Doe', 'test@test.com', '', '', mockSetLoading, mockNavigate);
      
      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Wypełnij wszystkie pola');
      expect(Alert.alert).not.toHaveBeenCalledWith('Błąd', 'Hasła nie są identyczne');
    });
  });

  describe('Udana rejestracja', () => {
    test('powinien pokazać sukces i nawigować do logowania', async () => {
      register.mockResolvedValue(true);

      await onSubmit('John Doe', 'test@test.com', 'password123', 'password123', mockSetLoading, mockNavigate);

      expect(mockSetLoading).toHaveBeenCalledWith(true);
      expect(register).toHaveBeenCalledWith('John Doe', 'test@test.com', 'password123');
      expect(Alert.alert).toHaveBeenCalledWith('Sukces', 'Konto utworzone, możesz się teraz zalogować');
      expect(mockNavigate).toHaveBeenCalledWith('login');
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    test('powinien obsłużyć truthy response z register', async () => {
      register.mockResolvedValue({ success: true, id: 123 });

      await onSubmit('Jane Doe', 'jane@test.com', 'securepass', 'securepass', mockSetLoading, mockNavigate);

      expect(Alert.alert).toHaveBeenCalledWith('Sukces', 'Konto utworzone, możesz się teraz zalogować');
      expect(mockNavigate).toHaveBeenCalledWith('login');
    });

    test('powinien obsłużyć string response z register', async () => {
      register.mockResolvedValue('success');

      await onSubmit('Bob Smith', 'bob@test.com', 'mypassword', 'mypassword', mockSetLoading, mockNavigate);

      expect(Alert.alert).toHaveBeenCalledWith('Sukces', 'Konto utworzone, możesz się teraz zalogować');
      expect(mockNavigate).toHaveBeenCalledWith('login');
    });
  });

  describe('Nieudana rejestracja', () => {
    test('powinien obsłużyć falsy response z register (false)', async () => {
      register.mockResolvedValue(false);

      await onSubmit('John Doe', 'test@test.com', 'password123', 'password123', mockSetLoading, mockNavigate);

      expect(mockSetLoading).toHaveBeenCalledWith(true);
      expect(register).toHaveBeenCalledWith('John Doe', 'test@test.com', 'password123');
      expect(Alert.alert).not.toHaveBeenCalledWith('Sukces', expect.any(String));
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    test('powinien obsłużyć null response z register', async () => {
      register.mockResolvedValue(null);

      await onSubmit('John Doe', 'test@test.com', 'password123', 'password123', mockSetLoading, mockNavigate);

      expect(Alert.alert).not.toHaveBeenCalledWith('Sukces', expect.any(String));
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    test('powinien obsłużyć undefined response z register', async () => {
      register.mockResolvedValue(undefined);

      await onSubmit('John Doe', 'test@test.com', 'password123', 'password123', mockSetLoading, mockNavigate);

      expect(Alert.alert).not.toHaveBeenCalledWith('Sukces', expect.any(String));
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    test('powinien obsłużyć pusty string response z register', async () => {
      register.mockResolvedValue('');

      await onSubmit('John Doe', 'test@test.com', 'password123', 'password123', mockSetLoading, mockNavigate);

      expect(Alert.alert).not.toHaveBeenCalledWith('Sukces', expect.any(String));
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    test('powinien obsłużyć zero response z register', async () => {
      register.mockResolvedValue(0);

      await onSubmit('John Doe', 'test@test.com', 'password123', 'password123', mockSetLoading, mockNavigate);

      expect(Alert.alert).not.toHaveBeenCalledWith('Sukces', expect.any(String));
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('Obsługa błędów', () => {
    test('powinien pokazać alert błędu z message gdy register rzuca wyjątek', async () => {
      const errorMessage = 'Email już istnieje';
      register.mockRejectedValue(new Error(errorMessage));

      await onSubmit('John Doe', 'test@test.com', 'password123', 'password123', mockSetLoading, mockNavigate);

      expect(mockSetLoading).toHaveBeenCalledWith(true);
      expect(Alert.alert).toHaveBeenCalledWith('Błąd rejestracji', errorMessage);
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    test('powinien pokazać domyślną wiadomość błędu gdy error nie ma message', async () => {
      register.mockRejectedValue(new Error());

      await onSubmit('John Doe', 'test@test.com', 'password123', 'password123', mockSetLoading, mockNavigate);

      expect(Alert.alert).toHaveBeenCalledWith('Błąd rejestracji', 'Spróbuj ponownie');
    });

    test('powinien obsłużyć błąd który nie jest Error object', async () => {
      register.mockRejectedValue('String error');

      await onSubmit('John Doe', 'test@test.com', 'password123', 'password123', mockSetLoading, mockNavigate);

      expect(Alert.alert).toHaveBeenCalledWith('Błąd rejestracji', 'Spróbuj ponownie');
    });

    test('powinien obsłużyć błąd z pustym message', async () => {
      register.mockRejectedValue(new Error(''));

      await onSubmit('John Doe', 'test@test.com', 'password123', 'password123', mockSetLoading, mockNavigate);

      expect(Alert.alert).toHaveBeenCalledWith('Błąd rejestracji', 'Spróbuj ponownie');
    });

    test('powinien obsłużyć błąd network', async () => {
      register.mockRejectedValue(new Error('Network Error'));

      await onSubmit('John Doe', 'test@test.com', 'password123', 'password123', mockSetLoading, mockNavigate);

      expect(Alert.alert).toHaveBeenCalledWith('Błąd rejestracji', 'Network Error');
    });

    test('powinien obsłużyć błąd timeout', async () => {
      register.mockRejectedValue(new Error('Request timeout'));

      await onSubmit('John Doe', 'test@test.com', 'password123', 'password123', mockSetLoading, mockNavigate);

      expect(Alert.alert).toHaveBeenCalledWith('Błąd rejestracji', 'Request timeout');
    });
  });

  describe('Stan loading', () => {
    test('powinien prawidłowo zarządzać stanem loading przy udanej rejestracji', async () => {
      register.mockResolvedValue(true);

      await onSubmit('John Doe', 'test@test.com', 'password123', 'password123', mockSetLoading, mockNavigate);

      expect(mockSetLoading).toHaveBeenNthCalledWith(1, true);
      expect(mockSetLoading).toHaveBeenNthCalledWith(2, false);
      expect(mockSetLoading).toHaveBeenCalledTimes(2);
    });

    test('powinien prawidłowo zarządzać stanem loading przy nieudanej rejestracji', async () => {
      register.mockResolvedValue(false);

      await onSubmit('John Doe', 'test@test.com', 'password123', 'password123', mockSetLoading, mockNavigate);

      expect(mockSetLoading).toHaveBeenNthCalledWith(1, true);
      expect(mockSetLoading).toHaveBeenNthCalledWith(2, false);
      expect(mockSetLoading).toHaveBeenCalledTimes(2);
    });

    test('powinien ustawić loading na false nawet gdy wystąpi błąd', async () => {
      register.mockRejectedValue(new Error('Registration failed'));

      await onSubmit('John Doe', 'test@test.com', 'password123', 'password123', mockSetLoading, mockNavigate);

      expect(mockSetLoading).toHaveBeenNthCalledWith(1, true);
      expect(mockSetLoading).toHaveBeenNthCalledWith(2, false);
      expect(mockSetLoading).toHaveBeenCalledTimes(2);
    });

    test('nie powinien ustawić loading gdy walidacja nie przejdzie', async () => {
      await onSubmit('', 'test@test.com', 'password123', 'password123', mockSetLoading, mockNavigate);

      expect(mockSetLoading).not.toHaveBeenCalled();
    });

    test('nie powinien ustawić loading gdy hasła są różne', async () => {
      await onSubmit('John Doe', 'test@test.com', 'password123', 'different', mockSetLoading, mockNavigate);

      expect(mockSetLoading).not.toHaveBeenCalled();
    });
  });

  describe('Kolejność wykonania', () => {
    test('powinien wykonać operacje w prawidłowej kolejności przy udanej rejestracji', async () => {
      register.mockResolvedValue(true);
      const calls = [];

      mockSetLoading.mockImplementation((value) => calls.push(`setLoading(${value})`));
      register.mockImplementation(() => {
        calls.push('register()');
        return Promise.resolve(true);
      });
      Alert.alert = vi.fn().mockImplementation((title, message) => calls.push(`Alert.alert(${title})`));
      mockNavigate.mockImplementation((route) => calls.push(`navigate(${route})`));

      await onSubmit('John Doe', 'test@test.com', 'password123', 'password123', mockSetLoading, mockNavigate);

      expect(calls).toEqual([
        'setLoading(true)',
        'register()',
        'Alert.alert(Sukces)',
        'navigate(login)',
        'setLoading(false)'
      ]);
    });

    test('powinien wykonać operacje w prawidłowej kolejności przy błędzie', async () => {
      const error = new Error('Test error');
      register.mockRejectedValue(error);
      const calls = [];

      mockSetLoading.mockImplementation((value) => calls.push(`setLoading(${value})`));
      register.mockImplementation(() => {
        calls.push('register()');
        return Promise.reject(error);
      });
      Alert.alert = vi.fn().mockImplementation((title) => calls.push(`Alert.alert(${title})`));

      await onSubmit('John Doe', 'test@test.com', 'password123', 'password123', mockSetLoading, mockNavigate);

      expect(calls).toEqual([
        'setLoading(true)',
        'register()',
        'Alert.alert(Błąd rejestracji)',
        'setLoading(false)'
      ]);
    });
  });

  describe('Edge cases i przypadki brzegowe', () => {
    test('powinien obsłużyć bardzo długie dane wejściowe', async () => {
      const longName = 'A'.repeat(1000);
      const longEmail = 'a'.repeat(500) + '@test.com';
      const longPassword = 'p'.repeat(1000);
      
      register.mockResolvedValue(true);

      await onSubmit(longName, longEmail, longPassword, longPassword, mockSetLoading, mockNavigate);

      expect(register).toHaveBeenCalledWith(longName, longEmail, longPassword);
      expect(mockNavigate).toHaveBeenCalledWith('login');
    });

    test('powinien obsłużyć specjalne znaki w danych', async () => {
      const nameWithSpecialChars = 'Jöhn Dœ';
      const emailWithSpecialChars = 'tëst+123@tëst.com';
      const passwordWithSpecialChars = 'p@$$w0rd!@#$%^&*()';
      
      register.mockResolvedValue(true);

      await onSubmit(nameWithSpecialChars, emailWithSpecialChars, passwordWithSpecialChars, passwordWithSpecialChars, mockSetLoading, mockNavigate);

      expect(register).toHaveBeenCalledWith(nameWithSpecialChars, emailWithSpecialChars, passwordWithSpecialChars);
      expect(mockNavigate).toHaveBeenCalledWith('login');
    });

    test('powinien obsłużyć dane z Unicode', async () => {
      const unicodeName = '张三';
      const unicodeEmail = 'тест@тест.com';
      const unicodePassword = 'पासवर्ड123';
      
      register.mockResolvedValue(true);

      await onSubmit(unicodeName, unicodeEmail, unicodePassword, unicodePassword, mockSetLoading, mockNavigate);

      expect(register).toHaveBeenCalledWith(unicodeName, unicodeEmail, unicodePassword);
    });

    test('powinien obsłużyć sytuację gdy register nie zwraca Promise', async () => {
      register.mockReturnValue(true);

      await onSubmit('John Doe', 'test@test.com', 'password123', 'password123', mockSetLoading, mockNavigate);

      expect(mockNavigate).toHaveBeenCalledWith('login');
    });

    test('powinien obsłużyć wywołanie bez funkcji navigate', async () => {
      register.mockResolvedValue(true);

      await onSubmit('John Doe', 'test@test.com', 'password123', 'password123', mockSetLoading, null);

      expect(Alert.alert).toHaveBeenCalledWith('Sukces', 'Konto utworzone, możesz się teraz zalogować');
    });
  });

  describe('Performance i wielokrotne wywołania', () => {
    test('powinien obsłużyć wielokrotne szybkie wywołania', async () => {
      register.mockResolvedValue(true);

      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(onSubmit(`User${i}`, `user${i}@test.com`, 'password', 'password', mockSetLoading, mockNavigate));
      }

      await Promise.all(promises);

      expect(register).toHaveBeenCalledTimes(5);
      expect(mockSetLoading).toHaveBeenCalledTimes(10);
      expect(mockNavigate).toHaveBeenCalledTimes(5);
    });

    test('powinien obsłużyć wywołania z różnymi opóźnieniami', async () => {
      register
        .mockResolvedValueOnce(true)
        .mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve(true), 100)))
        .mockRejectedValueOnce(new Error('Test error'));

      const promise1 = onSubmit('User1', 'user1@test.com', 'pass', 'pass', mockSetLoading, mockNavigate);
      const promise2 = onSubmit('User2', 'user2@test.com', 'pass', 'pass', mockSetLoading, mockNavigate);
      const promise3 = onSubmit('User3', 'user3@test.com', 'pass', 'pass', mockSetLoading, mockNavigate);

      await Promise.allSettled([promise1, promise2, promise3]);

      expect(register).toHaveBeenCalledTimes(3);
      expect(mockSetLoading).toHaveBeenCalledTimes(6);
    });
  });
});