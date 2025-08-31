import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import  styles  from '../styles/styles';
import { logout } from '../api/auth';
import * as SecureStore from 'expo-secure-store';



const HomeScreen = ({ navigate }) => {
  const [name, setName] = useState('');

 useEffect(() => {
  const getName = async () => {
    try {
      const userName = await SecureStore.getItemAsync("userName");
      setName(userName);
    } catch (error) {
      console.error('Error getting user name:', error);
    }
  };

  getName();
}, []);

  return (
    <View style={styles.container} contentContainerStyle={styles.scrollContent}>
      
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <View style={styles.headerHome}>
        <Text style={styles.title}>{`Witaj, ${name}!`}</Text>
        <Text style={styles.subtitle}>Aplikacja demonstracyjna na cele pracy magisterskiej</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Panel główny</Text>
          <Text style={styles.cardText}>
            To jest demonstracyjna aplikacja stworzona w ramach pracy magisterskiej. 
            Aplikacja prezentuje podstawowe funkcjonalności uwierzytelniania i zarządzania bezpieczeństwem.
          </Text>
        </View>
        
        
      </View>
      <View>
      <TouchableOpacity style={styles.settingsButton} onPress={() => navigate('settings')}>
          <Ionicons name="settings" size={20} color="#007AFF" />
          <Text style={styles.settingsButtonText}>Ustawienia</Text>
        </TouchableOpacity>
      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={async () => { 
            await logout();
            navigate('welcome');
      }}
      >
        <Text style={styles.logoutButtonText}>Wyloguj się</Text>
      </TouchableOpacity>
      </View>
    </View>
  );
};

export default HomeScreen;
