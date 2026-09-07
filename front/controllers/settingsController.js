import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { remove2fa, enable2fa, sendConfirmCode, changeEmail, changePassword, deleteAccount, clearUserSession } from '../api/auth';

export const handleToggle = (method, disabled, setSelected2FA) => {
    if (disabled) {
      if (method === 'biometrics') {
        Alert.alert('Biometria niedostępna', 'Skonfiguruj Face ID / Touch ID / odcisk palca w ustawieniach urządzenia.');
      }
      return;
    }
    setSelected2FA(prev => (prev === method ? null : method));
  };

export const confirm2FASettings = (savedMethod, selected2FA, setIsDisabling, setShowPasswordModal) => {
    if (!savedMethod && !selected2FA) {
      Alert.alert('Informacja', 'Wybierz przynajmniej jedną metodę 2FA');
      return;
    }

    if (savedMethod === selected2FA) {
      Alert.alert('Informacja', 'Wybrana metoda jest już aktywna');
      return;
    }
    if (savedMethod && !selected2FA) {
      setIsDisabling(true);
    } else {
      setIsDisabling(false);
    }

    setShowPasswordModal(true);
  };


export const handleCancel = async (confirmPassword, navigate, setSavedMethod, setSelected2FA, setConfirmPassword, setShowGoogleModal) => {
    try {
    if(confirmPassword == '') {
          return Alert.alert('Informacja', 'Hasło nie może być puste');
        }

        const response = await remove2fa(confirmPassword);

        if(response == "invalid password") {
          return Alert.alert('Błąd', 'Niepoprawne hasło');
        } else if (response.status === 403) {
          Alert.alert('Sesja wygasła', 'Prosimy o ponowne zalogowanie');
          await clearUserSession();
          navigate('login');
        } else if (response.status === 429) return Alert.alert('Błąd', data.message || "Zbyt wiele prób. Spróbuj ponownie za 10 minut.");
         else if(response == false) {
          return Alert.alert('Błąd', 'Operacja zakończona niepowodzeniem');
        } else if(response == true) {
          await SecureStore.deleteItemAsync('selected2FA');
          setSavedMethod(null);
          setSelected2FA(null);
          setConfirmPassword('');
  }
   } catch (error) {
      Alert.alert('Błąd', 'Nie udało się usunąć ustawień');
    } finally {
      setConfirmPassword('');
      setShowGoogleModal(false);
    }
}

export  const handlePasswordConfirmation = async (confirmPassword, isDisabling, navigate, setSavedMethod, setSelected2FA, selected2FA, setGeneratedSecret, setShowGoogleModal, setShowPasswordModal, setConfirmPassword, savedMethod) => {
    if (!confirmPassword) {
      Alert.alert('Błąd', 'Podaj hasło');
      return;
    }

    try {
      if (isDisabling) {
        if(confirmPassword == '') {
          return Alert.alert('Informacja', 'Hasło nie może być puste');
        }

        const response = await remove2fa(confirmPassword);

        if(response == "invalid password") {
          return Alert.alert('Błąd', 'Niepoprawne hasło');
        } else if (response.status === 403) {
          Alert.alert('Sesja wygasła', 'Prosimy o ponowne zalogowanie');
          await clearUserSession();
          navigate('login');
        } else if (response.status === 429) return Alert.alert('Błąd', data.message || "Zbyt wiele prób. Spróbuj ponownie za 10 minut.");
         else if(response == false) {
          setShowPasswordModal(false);
          return Alert.alert('Błąd', 'Operacja zakończona niepowodzeniem');
        } else if(response == true) {
          await SecureStore.deleteItemAsync('selected2FA');
          setSavedMethod(null);
          setSelected2FA(null);
          return Alert.alert('Sukces', 'Uwierzytelnianie dwuskładnikowe zostało wyłączone');
        }
      } else {
        if (!selected2FA) {
          Alert.alert('Informacja', 'Wybierz metodę 2FA');
          return;
        }

        const response = await enable2fa(selected2FA, confirmPassword);
        const data = await response.json();
        console.log(data);
        if(response.ok) {
          if(data.requiresCode === true) {
              await setGeneratedSecret(data.otpAuth);
              setShowGoogleModal(true);
          } else {
            await SecureStore.setItemAsync('selected2FA', selected2FA);
            setSavedMethod(selected2FA);
            Alert.alert('Sukces', 'Ustawienia 2FA zostały zapisane');
          }
        } else if (response.status === 403) {
          Alert.alert('Sesja wygasła', 'Prosimy o ponowne zalogowanie');
          await clearUserSession();
          navigate('login');
        } else if (response.status === 429) return Alert.alert('Błąd', data.message || "Zbyt wiele prób. Spróbuj ponownie za 10 minut.");
        else {
          setShowPasswordModal(false);
          setConfirmPassword('');
          setSelected2FA(savedMethod);
          Alert.alert('Błąd', 'Nie udało się zapisać ustawień 2FA');
        }
      }
    } catch (error) {
      Alert.alert('Błąd', 'Nie udało się zapisać ustawień 2FA');
    } finally {
      setShowPasswordModal(false);
    }
  };

 export  const onConfirmCode = async (code, navigate, setSavedMethod, setShowGoogleModal, setConfirmPassword, selected2FA) => {
    if (!code || code.trim() === "") {
      return Alert.alert("Błąd", "Wprowadź kod");
  }
    try {
      const response = await sendConfirmCode(code);

      if (response.status === 401) {
        Alert.alert("Błąd", "Nieprawidłowy kod");
        return;
      } else if (response.status === 403) {
          Alert.alert('Sesja wygasła', 'Prosimy o ponowne zalogowanie');
          await clearUserSession();
          navigate('login');
        } else if (response.status === 429) return Alert.alert('Błąd', data.message || "Zbyt wiele prób. Spróbuj ponownie za 10 minut.");

      if (response.ok) {
        await SecureStore.setItemAsync('selected2FA', selected2FA);
        setSavedMethod(selected2FA);
        setShowGoogleModal(false);
        setConfirmPassword('');
        Alert.alert('Sukces', 'Ustawienia 2FA zostały zapisane');
      } else {
        return Alert.alert("Błąd", "Wystąpił błąd");
      }
    } catch (error) {
      console.error("Błąd podczas potwierdzania kodu:", error);
      Alert.alert("Błąd", "Nie udało się połączyć z serwerem");
    }
  }

export const handleChangePassword = async (oldPassword, newPassword, setOldPassword, setNewPassword, setShowChangePasswordModal, navigate) => {
  if (!oldPassword || !newPassword) {
    return Alert.alert("Błąd", "Wszystkie pola muszą być wypełnione");
  }

  try {
    const response = await changePassword(oldPassword, newPassword);
    if (response.ok) {
      Alert.alert("Sukces", "Hasło zostało zmienione");
      setOldPassword('');
      setNewPassword('');
      setShowChangePasswordModal(false);
    } else if (response.status === 403) {
          Alert.alert('Sesja wygasła', 'Prosimy o ponowne zalogowanie');
          await clearUserSession();
          navigate('login');
    } else {
      Alert.alert("Błąd", "Nie udało się zmienić hasła");
    }
  } catch (error) {
    console.error(error);
    Alert.alert("Błąd", "Wystąpił błąd podczas zmiany hasła");
  }
};

export const handleChangeEmail = async (confirmPasswordEmail, newEmail, setConfirmPasswordEmail, setNewEmail, setShowChangeEmailModal, navigate) => {
  if (!confirmPasswordEmail || !newEmail) {
    return Alert.alert("Błąd", "Wszystkie pola muszą być wypełnione");
  }

  try {
    const response = await changeEmail(confirmPasswordEmail, newEmail);
    if (response.ok) {
      Alert.alert("Sukces", "Email został zmieniony");
      setConfirmPasswordEmail('');
      setNewEmail('');
      setShowChangeEmailModal(false);
    } else if (response.status === 403) {
          Alert.alert('Sesja wygasła', 'Prosimy o ponowne zalogowanie');
          await clearUserSession();
          navigate('login');
    } else {
      Alert.alert("Błąd", "Nie udało się zmienić emaila");
    }
  } catch (error) {
    console.error(error);
    Alert.alert("Błąd", "Wystąpił błąd podczas zmiany emaila");
  }
};

export const handleDeleteAccount = async (deletePassword, setDeletePassword, setShowDeleteModal, navigate) => {
  if (!deletePassword) {
    return Alert.alert("Błąd", "Podaj hasło aby usunąć konto");
  }

  try {
    const response = await deleteAccount(deletePassword);
    if (response.status === 403) {
          Alert.alert('Sesja wygasła', 'Prosimy o ponowne zalogowanie');
          await clearUserSession();
          navigate('login');
    } else if (response) {
      Alert.alert("Sukces", "Konto zostało usunięte");
      setDeletePassword('');
      setShowDeleteModal(false);
      await clearUserSession();
      navigate('welcome'); 
    } else {
      Alert.alert("Błąd", "Nie udało się usunąć konta");
    }
  } catch (error) {
    console.error(error);
    Alert.alert("Błąd", "Wystąpił błąd podczas usuwania konta");
  }
};