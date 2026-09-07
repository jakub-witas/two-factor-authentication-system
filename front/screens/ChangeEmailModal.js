import React from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';
import styles from '../styles/modalStyles';

export default function ChangeEmailModal({
  visible,
  onClose,
  confirmPasswordEmail,
  setConfirmPasswordEmail,
  newEmail,
  setNewEmail,
  onConfirm,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Zmień email</Text>
          <Text style={styles.modalText}>
            Podaj swoje hasło i nowy adres email.
          </Text>

          <TextInput
            style={styles.modalInput}
            value={confirmPasswordEmail}
            onChangeText={setConfirmPasswordEmail}
            placeholder="Hasło"
            secureTextEntry
            autoCapitalize="none"
            placeholderTextColor="#999"
          />

          <TextInput
            style={styles.modalInput}
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="Nowy email"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#999"
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalButtonCancel} onPress={onClose}>
              <Text style={styles.modalButtonCancelText}>Anuluj</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalButtonConfirm} onPress={onConfirm}>
              <Text style={styles.modalButtonConfirmText}>Zmień</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
