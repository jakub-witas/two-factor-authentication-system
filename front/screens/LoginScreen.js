import React, { useContext, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import  styles  from '../styles/styles';
import { login, checkBiometricAuthSupport, handleBiometricLogin, storeUserSession, confirmBiometricLogin, handleOTPlogin } from '../api/auth';
import { TwoFactorPrompt } from './AuthModal';


const LoginScreen = ({ navigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [method, setMethod] = useState('');
  const sessionIdRef = React.useRef(null);
  //const [code, setCode] = useState('');
  //const [tempSessionId, setTempSessionId] = useState('');

  const onSubmit = async () => {
    if (!email || !password) return Alert.alert('Błąd', 'Wypełnij wszystkie pola');
    
    setLoading(true);
    try {
      const response = await login(email, password);

      if(!response.ok) {
        if(response.status === 400) return Alert.alert('Błąd', 'Nieprawidłowe dane logowania');
        else return Alert.alert('Błąd', 'Wystąpił błąd podczas logowania');
      }

      const data = await response.json();
      
      if (data.requires2FA === true) {
        // console.log("before: " + data.tempSessionId);
        // setTempSessionId(data.tempSessionId);
        // console.log("after: " + tempSessionId);
        console.log(data.method);
        switch(data.method) {
          case 'email': 
          case 'gauth': { 
            sessionIdRef.current = data.tempSessionId;
            //const sessionId = data.tempSessionId;
            console.log("sess: " + sessionIdRef.current);
            setMethod(data.method);
            setShowModal(true);
            break; 
          }
          case 'biometrics': { handleBiometricAuth(data.method, email, data.tempSessionId); break; }
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

  const handleOTPAuth = async (code, tempSessionId) => {
    try{
      console.log("in handle: " + tempSessionId);
      const response = await handleOTPlogin(method, email, tempSessionId, code);

      if(response.status === 401) {
        return Alert.alert('Błąd', 'Nieprawidłowy kod');
      }
      
      if(response.ok) {
              const data = await response.json();
              const session = await storeUserSession(data.token, method);
              if(session) navigate('home');
              else return Alert.alert('Błąd', 'Wystąpił błąd podczas logowania1');
            } else return Alert.alert('Błąd', 'Wystąpił błąd podczas logowania2');
    } catch (error) {
      Alert.alert('Błąd', 'Wystąpił błąd podczas uwierzytelniania biometrycznego');
    } finally {
      setMethod('');
      setShowModal(false);
      setPassword('');
      setEmail('');
    }
  }

const handleBiometricAuth = async (method, email, tempSessionId) => {
    if (!checkBiometricAuthSupport(method)) {
      Alert.alert('Błąd', 'Uwierzytelnianie biometryczne nie jest dostępne na tym urządzeniu');
      return;
    }

    try {
        const result = await handleBiometricLogin();
          if (result.success) {
            const response = await confirmBiometricLogin(email, method, tempSessionId);
            console.log(tempSessionId);
            const data = await response.json();
            if(response.ok) {
              
              const session = await storeUserSession(data.token, method);
              if(session) navigate('home');
              else return Alert.alert('Błąd', 'Wystąpił błąd podczas logowania1');
            } else return Alert.alert('Błąd', data.message || 'Wystąpił błąd podczas logowania2');
          } else {
            Alert.alert('Błąd', 'Uwierzytelnianie biometryczne nie powiodło się');
          }
    } catch (error) {
      Alert.alert('Błąd', 'Wystąpił błąd podczas uwierzytelniania biometrycznego');
    } finally {
      setMethod('');
      setShowModal(false);
      setPassword('');
      setEmail('');
    }
  };

  return (
    <View style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.centerContent}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <TouchableOpacity style={styles.backButton} onPress={() => navigate('welcome')}>
        <Ionicons name="arrow-back" size={24} color="#666" />
      </TouchableOpacity>
      
      <View style={styles.header}>
        <Text style={styles.title}>Logowanie</Text>
        <Text style={styles.subtitle}>Wprowadź swoje dane</Text>
      </View>
      
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Wprowadź email"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hasło</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Wprowadź hasło"
              autoCapitalize="none"
              secureTextEntry={!showPassword}
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
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
        
        <TouchableOpacity style={styles.primaryButton} onPress={onSubmit} disabled={loading}>
          <Text style={styles.primaryButtonText}>{loading ? 'Logowanie...' : 'Zaloguj się'}</Text>
        </TouchableOpacity>

        <TwoFactorPrompt
          visible={showModal}
          method={method}
          //onChangeText={setCode}
          onSubmit={async (code) => {
            console.log('2FA code entered:', code);
            await handleOTPAuth(code, sessionIdRef.current);
            setShowModal(false);
            
          
          }}
          onCancel={() => setShowModal(false)}
        />
      </View>
      </View>
    </View>
  );
};

export default LoginScreen;
