import React, { useEffect, useState, useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View, StatusBar, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import styles from '../styles/styles';
import modalStyles from '../styles/modalStyles';
import  GoogleAuthModal  from './GoogleAuthModal';
import ChangePasswordModal from './ChangePasswordModal';
import ChangeEmailModal from './ChangeEmailModal';
import DeleteAccountModal from './DeleteAccountModal';
import * as settingsController from '../controllers/settingsController';

const SettingsScreen = ({ navigate }) => {
  const [selected2FA, setSelected2FA] = useState(null); //selected
  const [savedMethod, setSavedMethod] = useState(null);  //currently in db
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);
  const [bioSupported, setBioSupported] = useState(false);
  const [bioEnrolled, setBioEnrolled] = useState(false);
  const [generatedSecret, setGeneratedSecret] = useState('');


const [showDeleteModal, setShowDeleteModal] = useState(false);
const [deletePassword, setDeletePassword] = useState('');

const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
const [oldPassword, setOldPassword] = useState('');
const [newPassword, setNewPassword] = useState('');

const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
const [confirmPasswordEmail, setConfirmPasswordEmail] = useState('');
const [newEmail, setNewEmail] = useState('');


  const options = useMemo(() => ([
    { id: 'email', name: 'Email', icon: 'mail', desc: 'Kod wysyłany na email', disabled: false },
    { id: 'biometrics', name: 'Biometria', icon: 'finger-print', desc: bioSupported ? (bioEnrolled 
            ? 'Face ID / Touch ID / Odcisk palca' 
            : 'Brak danych biometrycznych — skonfiguruj w ustawieniach systemu')
        : 'Urządzenie nie obsługuje biometrii',
      disabled: !bioSupported || !bioEnrolled
    },
    { id: 'gauth', name: 'Google Authenticator', icon: 'key', desc: 'Aplikacja do generowania kodów', disabled: false },
  ]), [bioSupported, bioEnrolled]);


  useEffect(() => {
    (async () => {
      try {
        const hasHw = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setBioSupported(!!hasHw);
        setBioEnrolled(!!enrolled);
      } catch {
        setBioSupported(false);
        setBioEnrolled(false);
      }

      try {
        const stored = await SecureStore.getItemAsync('selected2FA');
        setSavedMethod(stored);
        setSelected2FA(stored);
      } catch (e) {
        setSavedMethod(null);
        setSelected2FA(null);
      }
    })();
  }, []);


  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <TouchableOpacity style={styles.backButton} onPress={() => navigate('home')}>
        <Ionicons name="arrow-back" size={24} color="#666" />
      </TouchableOpacity>

      <View style={styles.settingsHeader}>
        <Text style={styles.title}>Ustawienia</Text>
        <Text style={styles.subtitle}>Zarządzaj bezpieczeństwem konta</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-checkmark" size={20} color="#007AFF" />
          <Text style={styles.sectionTitle}>Uwierzytelnianie dwuskładnikowe (2FA)</Text>
        </View>

        <Text style={styles.sectionDescription}>
          Wybierz metodę uwierzytelniania dwuskładnikowego dla dodatkowego bezpieczeństwa
        </Text>

        {options.map(opt => {
          const isSelected = selected2FA === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.optionItem,
                isSelected && styles.optionItemSelected,
                opt.disabled && styles.optionItemDisabled,
              ]}
              activeOpacity={0.8}
              onPress={async () => settingsController.handleToggle(opt.id, opt.disabled, setSelected2FA)}
            >
              <View style={styles.optionLeft}>
                <Ionicons
                  name={opt.icon}
                  size={20}
                  color={isSelected ? '#007AFF' : '#666'}
                />
                <View style={styles.optionText}>
                  <Text style={[styles.optionName, isSelected && styles.optionNameSelected]}>
                    {opt.name}
                  </Text>
                  <Text style={styles.optionDesc}>{opt.desc}</Text>
                </View>
              </View>
              {isSelected && <Ionicons name="checkmark-circle" size={20} color="#007AFF" />}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.primaryButtonSettings} onPress={async () => settingsController.confirm2FASettings(savedMethod, selected2FA, setIsDisabling, setShowPasswordModal)}>
          <Text style={styles.primaryButtonText}>Zapisz ustawienia</Text>
        </TouchableOpacity>
      </View>

        <View style={modalStyles.settingsActions}>
  <TouchableOpacity style={modalStyles.settingsRow} onPress={() => setShowChangePasswordModal(true)}>
    <Ionicons name="key-outline" size={20} color="#007AFF" style={modalStyles.settingsIcon} />
    <Text style={modalStyles.settingsText}>Zmień hasło</Text>
  </TouchableOpacity>

  <TouchableOpacity style={modalStyles.settingsRow} onPress={() => setShowChangeEmailModal(true)}>
    <Ionicons name="mail-outline" size={20} color="#007AFF" style={modalStyles.settingsIcon} />
    <Text style={modalStyles.settingsText}>Zmień email</Text>
  </TouchableOpacity>

  <TouchableOpacity style={modalStyles.settingsRow} onPress={() => setShowDeleteModal(true)}>
    <Ionicons name="trash-outline" size={20} color="red" style={modalStyles.settingsIcon} />
    <Text style={[modalStyles.settingsText, { color: 'red' }]}>Usuń konto</Text>
  </TouchableOpacity>
</View>



        <ChangePasswordModal
          visible={showChangePasswordModal}
          onClose={async () => {
            setShowChangePasswordModal(false);
            setOldPassword('');
            setNewPassword('');
          }}
          oldPassword={oldPassword}
          setOldPassword={setOldPassword}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          onConfirm={async () => settingsController.handleChangePassword(oldPassword, newPassword, setOldPassword, setNewPassword, setShowChangePasswordModal, navigate)}
        />

        <ChangeEmailModal
          visible={showChangeEmailModal}
          onClose={async () => {
            setShowChangeEmailModal(false);
            setConfirmPasswordEmail('');
            setNewEmail('');
          }}
          confirmPasswordEmail={confirmPasswordEmail}
          setConfirmPasswordEmail={setConfirmPasswordEmail}
          newEmail={newEmail}
          setNewEmail={setNewEmail}
          onConfirm={async () => settingsController.handleChangeEmail(confirmPasswordEmail, newEmail, setConfirmPasswordEmail, setNewEmail, setShowChangeEmailModal, navigate)}
        />

        <DeleteAccountModal
          visible={showDeleteModal}
          onClose={async () => {
            setShowDeleteModal(false);
            setDeletePassword('');
          }}
          deletePassword={deletePassword}
          setDeletePassword={setDeletePassword}
          onConfirm={async () => settingsController.handleDeleteAccount(deletePassword, setDeletePassword, setShowDeleteModal, navigate)}
        />

      {/* Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isDisabling ? 'Wyłącz 2FA' : 'Potwierdź hasło'}</Text>
            <Text style={styles.modalText}>
              {isDisabling
                ? 'Aby wyłączyć 2FA, potwierdź hasło do konta.'
                : 'Wprowadź swoje hasło aby potwierdzić zmiany w ustawieniach 2FA.'}
            </Text>

            <TextInput
              style={styles.modalInput}
              value={confirmPassword}
              autoCapitalize="none"
              onChangeText={setConfirmPassword}
              placeholder="Wprowadź hasło"
              secureTextEntry
              placeholderTextColor="#999"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setShowPasswordModal(false);
                  setConfirmPassword('');
                }}
              >
                <Text style={styles.modalButtonCancelText}>Anuluj</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={async () => settingsController.handlePasswordConfirmation(confirmPassword, isDisabling, navigate, setSavedMethod, setSelected2FA, selected2FA, setGeneratedSecret, setShowGoogleModal, setShowPasswordModal, setConfirmPassword, savedMethod)}
              >
                <Text style={styles.modalButtonConfirmText}>Potwierdź</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    <GoogleAuthModal
      visible={showGoogleModal}
      secret={generatedSecret}
      method={selected2FA}
      onClose={async () => await settingsController.handleCancel(confirmPassword, navigate, setSavedMethod, setSelected2FA, setConfirmPassword, setShowGoogleModal)}
      onConfirm={async (code) => {
        await settingsController.onConfirmCode(code, navigate, setSavedMethod, setShowGoogleModal, setConfirmPassword, selected2FA);
      }}
    />            

    </ScrollView>
  );
};

export default SettingsScreen;
