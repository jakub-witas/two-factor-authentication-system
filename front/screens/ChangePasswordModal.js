import React from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';
import styles from '../styles/modalStyles';

export default function ChangePasswordModal({
  visible,
  onClose,
  oldPassword,
  setOldPassword,
  newPassword,
  setNewPassword,
  onConfirm
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Zmień hasło</Text>
          <Text style={styles.modalText}>Podaj stare i nowe hasło, aby je zmienić.</Text>

          <TextInput
            style={styles.modalInput}
            value={oldPassword}
            onChangeText={setOldPassword}
            placeholder="Stare hasło"
            secureTextEntry
            autoCapitalize="none"
            placeholderTextColor="#999"
          />

          <TextInput
            style={styles.modalInput}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Nowe hasło"
            secureTextEntry
            autoCapitalize="none"
            placeholderTextColor="#999"
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalButtonCancel}
              onPress={onClose}
            >
              <Text style={styles.modalButtonCancelText}>Anuluj</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButtonConfirm}
              onPress={onConfirm}
            >
              <Text style={styles.modalButtonConfirmText}>Zmień</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
