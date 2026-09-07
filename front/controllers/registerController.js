import { Alert } from 'react-native';
import { register } from '../api/auth';

export const onSubmit = async (name, email, password, confirmPassword, setLoading, navigate) => {
    if (!name || !email || !password || !confirmPassword) 
      return Alert.alert('Błąd', 'Wypełnij wszystkie pola');
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      return Alert.alert('Błąd', 'Wypełnij wszystkie pola');
    }
    if (password !== confirmPassword) 
      return Alert.alert('Błąd', 'Hasła nie są identyczne');

    try {
      setLoading(true);
      const response = await register(name, email, password);

      if (response) {
        Alert.alert("Sukces", "Konto utworzone, możesz się teraz zalogować");
        navigate("login");
      }
    } catch (error) {
      Alert.alert("Błąd rejestracji", error.message || "Spróbuj ponownie");
    } finally {
      setLoading(false);
    }
  };