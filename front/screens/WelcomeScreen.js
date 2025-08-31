import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import  styles  from '../styles/styles';


const WelcomeScreen = ({ navigate }) => (
  <View style={styles.container} contentContainerStyle={styles.scrollContent}>
    <View style={styles.centerContent}>
    <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
    <View style={styles.welcomeHeader}>
      <Text style={styles.title}>Witaj ponownie!</Text>
      <Text style={styles.subtitle}>Zaloguj się lub utwórz nowe konto</Text>
    </View>
    
    <View style={styles.content}>
      <TouchableOpacity style={styles.primaryButton} onPress={() => navigate('login')}>
        <Text style={styles.primaryButtonText}>Zaloguj się</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigate('register')}>
        <Text style={styles.secondaryButtonText}>Utwórz konto</Text>
      </TouchableOpacity>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>
        Aplikacja demonstracyjna na potrzeby pracy magisterskiej
      </Text>
    </View>
    </View>
  </View>
);

export default WelcomeScreen;
