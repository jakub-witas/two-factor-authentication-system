import React, { useContext, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import  styles  from '../styles/styles';
import { register } from '../api/auth';


const RegisterScreen = ({ navigate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const onSubmit = async () => {
    if (!name || !email || !password || !confirmPassword) 
      return Alert.alert('Błąd', 'Wypełnij wszystkie pola');
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <TouchableOpacity style={styles.backButton} onPress={() => navigate('welcome')}>
        <Ionicons name="arrow-back" size={24} color="#666" />
      </TouchableOpacity>
      
      <View style={styles.header}>
        <Text style={styles.title}>Rejestracja</Text>
        <Text style={styles.subtitle}>Utwórz nowe konto</Text>
      </View>
      
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Imię i nazwisko</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Wprowadź imię i nazwisko"
            placeholderTextColor="#999"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Wprowadź email"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#999"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hasło</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              placeholder="Wprowadź hasło"
              secureTextEntry={!showPassword}
              placeholderTextColor="#999"
            />
            <TouchableOpacity 
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye-off" : "eye"} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Potwierdź hasło</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={confirmPassword}
              autoCapitalize="none"
              onChangeText={setConfirmPassword}
              placeholder="Potwierdź hasło"
              secureTextEntry={!showConfirmPassword}
              placeholderTextColor="#999"
            />
            <TouchableOpacity 
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons 
                name={showConfirmPassword ? "eye-off" : "eye"} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>
        </View>
        
        <TouchableOpacity style={styles.primaryButton} onPress={onSubmit} disabled={loading}>
          <Text style={styles.primaryButtonText}>{loading ? 'Tworzenie konta...' : 'Zarejestruj się'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default RegisterScreen;
