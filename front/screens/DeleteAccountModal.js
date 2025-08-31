import React from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';
import styles from '../styles/modalStyles';

export default function DeleteAccountModal({
  visible,
  onClose,
  deletePassword,
  setDeletePassword,
  onConfirm,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Usuń konto</Text>
          <Text style={styles.modalText}>
            Ta akcja jest nieodwracalna. Wprowadź hasło, aby potwierdzić.
          </Text>

          <TextInput
            style={styles.modalInput}
            value={deletePassword}
            onChangeText={setDeletePassword}
            placeholder="Hasło"
            secureTextEntry
            autoCapitalize="none"
            placeholderTextColor="#999"
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalButtonCancel} onPress={onClose}>
              <Text style={styles.modalButtonCancelText}>Anuluj</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButtonConfirm, { backgroundColor: '#c0392b' }]}
              onPress={onConfirm}
            >
              <Text style={styles.modalButtonConfirmText}>Usuń</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
