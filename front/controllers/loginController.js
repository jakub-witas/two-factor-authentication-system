import { Alert } from 'react-native';
import { login, checkBiometricAuthSupport, handleBiometricLogin, storeUserSession, confirmBiometricLogin, handleOTPlogin } from '../api/auth';

export const onSubmit = async (email, password, setLoading, sessionIdRef, setMethod, setShowModal, navigate, setPassword, setEmail) => {
    if (!email || !password) return Alert.alert('Błąd', 'Wypełnij wszystkie pola');
    
    setLoading(true);
    try {
      const response = await login(email, password);
      const data = await response.json();

      if(!response.ok) {
        if(response.status === 400) return Alert.alert('Błąd', 'Nieprawidłowe dane logowania');
        else if (response.status === 429) return Alert.alert('Błąd', data.message || "Zbyt wiele prób logowania. Spróbuj ponownie za 5 minut.");
        else return Alert.alert('Błąd', 'Wystąpił błąd podczas logowania');
      }

      
      
      if (data.requires2FA === true) {
        switch(data.method) {
          case 'email': 
          case 'gauth': { 
            sessionIdRef.current = data.tempSessionId;
            setMethod(data.method);
            setShowModal(true);
            break; 
          }
          case 'biometrics': { handleBiometricAuth(data.method, email, data.tempSessionId, navigate, setMethod, setShowModal, setPassword, setEmail); break; }
          default: { Alert.alert('Błąd', 'Nieoczekiwana metoda uwierzytelnienia.'); break; }
        }
      } else if (data.requires2FA === false) {
        const session = await storeUserSession(data.token, null);
        if(session) navigate('home');
        else return Alert.alert('Błąd', 'Wystąpił błąd podczas logowania');
      }
    } catch(error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

export const handleOTPAuth = async (code, tempSessionId, email, method, navigate, setMethod, setShowModal, setPassword, setEmail) => {
    try{
      const response = await handleOTPlogin(method, email, tempSessionId, code);

      if(response.status === 401) {
        return Alert.alert('Błąd', 'Nieprawidłowy kod');
      }
      
      if(response.ok) {
              const data = await response.json();
              const session = await storeUserSession(data.token, method);
              if(session) navigate('home');
              else return Alert.alert('Błąd', 'Wystąpił błąd podczas logowania');
            } else return Alert.alert('Błąd', 'Wystąpił błąd podczas logowania');
    } catch (error) {
      Alert.alert('Błąd', 'Wystąpił błąd podczas uwierzytelniania biometrycznego');
    } finally {
      setMethod('');
      setShowModal(false);
      setPassword('');
      setEmail('');
    }
  }

const handleBiometricAuth = async (method, email, tempSessionId, navigate, setMethod, setShowModal, setPassword, setEmail) => {
  try { 
    if (!checkBiometricAuthSupport(method)) {
        Alert.alert('Błąd', 'Uwierzytelnianie biometryczne nie jest dostępne na tym urządzeniu');
        return;
      }

    
        const result = await handleBiometricLogin();
          if (result.success) {
            const response = await confirmBiometricLogin(email, method, tempSessionId);

            const data = await response.json();
            if(response.ok) {
              const session = await storeUserSession(data.token, method);
              if(session) {
                navigate('home');
              } else return Alert.alert('Błąd', 'Wystąpił błąd podczas logowania');
            } else return Alert.alert('Błąd', 'Wystąpił błąd podczas logowania');
          } else {
            Alert.alert('Błąd', 'Uwierzytelnianie biometryczne nie powiodło się');
          }
    } catch (error) {
      Alert.alert('Błąd', 'Wystąpił błąd podczas uwierzytelniania biometrycznego2');
    } finally {
      setMethod('');
      setShowModal(false);
      setPassword('');
      setEmail('');
    }
  };