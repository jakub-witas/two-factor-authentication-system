import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import  styles  from '../styles/styles';
import * as loginController from '../controllers/loginController';
import { TwoFactorPrompt } from './AuthModal';


const LoginScreen = ({ navigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [method, setMethod] = useState('');
  const sessionIdRef = React.useRef(null);


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
        
        <TouchableOpacity style={styles.primaryButton} 
        onPress={async () => loginController.onSubmit(email, password, setLoading, sessionIdRef, setMethod, setShowModal, navigate, setPassword, setEmail)} 
        disabled={loading}>
          <Text style={styles.primaryButtonText}>{loading ? 'Logowanie...' : 'Zaloguj się'}</Text>
        </TouchableOpacity>

        <TwoFactorPrompt
          visible={showModal}
          method={method}
          onSubmit={async (code) => {
            await loginController.handleOTPAuth(code, sessionIdRef.current, email, method, navigate, setMethod, setShowModal, setPassword, setEmail);
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
