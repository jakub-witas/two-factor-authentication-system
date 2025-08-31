import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export const TwoFactorPrompt = ({ visible, method, onSubmit, onCancel }) => {
  const [code, setCode] = useState('');

  const handleSubmit = () => {
    onSubmit(code);
    setCode('');
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Wprowadź kod 2FA</Text>
          <Text style={styles.subtitle}>
            {method === 'email' ? 'Kod został wysłany na Twój email.' : 'Wprowadź kod z Google Authenticator.'}
          </Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            keyboardType="numeric"
            placeholder="Kod 2FA"
            autoFocus
          />
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.button} onPress={handleSubmit}>
              <Text style={styles.buttonText}>Wyślij</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onCancel}>
              <Text style={styles.buttonText}>Anuluj</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#555', marginBottom: 20, textAlign: 'center' },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    textAlign: 'center',
  },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  button: {
    flex: 1,
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancel: { backgroundColor: '#888' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
