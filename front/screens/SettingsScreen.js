import React, { useEffect, useState, useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View, StatusBar, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import styles from '../styles/styles';
import modalStyles from '../styles/modalStyles';
import { remove2fa, enable2fa, sendConfirmCode, changeEmail, changePassword, deleteAccount, clearUserSession } from '../api/auth';
import  GoogleAuthModal  from './GoogleAuthModal';
import ChangePasswordModal from './ChangePasswordModal';
import ChangeEmailModal from './ChangeEmailModal';
import DeleteAccountModal from './DeleteAccountModal';

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


  // define options (all three always visible)
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

  // load saved method + biometrics check
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
        //const normalized = METHODS.includes(stored) ? stored : null;
        setSavedMethod(stored);
        setSelected2FA(stored);
      } catch (e) {
        setSavedMethod(null);
        setSelected2FA(null);
      }
    })();
  }, []);

  const handleToggle = (method, disabled) => {
    if (disabled) {
      if (method === 'biometrics') {
        Alert.alert('Biometria niedostępna', 'Skonfiguruj Face ID / Touch ID / odcisk palca w ustawieniach urządzenia.');
      }
      return;
    }
    setSelected2FA(prev => (prev === method ? null : method));
  };

  const confirm2FASettings = () => {
    if (!savedMethod && !selected2FA) {
      Alert.alert('Informacja', 'Wybierz przynajmniej jedną metodę 2FA');
      return;
    }

    if (savedMethod === selected2FA) {
      Alert.alert('Informacja', 'Wybrana metoda jest już aktywna');
      return;
    }
    if (savedMethod && !selected2FA) {
      setIsDisabling(true);
    } else {
      setIsDisabling(false);
    }

    setShowPasswordModal(true);
  };


const handleCancel = async () => {
    try {
    if(confirmPassword == '') {
          return Alert.alert('Informacja', 'Hasło nie może być puste');
        }

        const response = await remove2fa(confirmPassword);

        if(response == "invalid password") {
          return Alert.alert('Błąd', 'Niepoprawne hasło');
        } else if (response.status === 403) {
          Alert.alert('Sesja wygasła', 'Prosimy o ponowne zalogowanie');
          await clearUserSession();
          navigate('login');
        } else if(response == false) {
          return Alert.alert('Błąd', 'Operacja zakończona niepowodzeniem');
        } else if(response == true) {
          await SecureStore.deleteItemAsync('selected2FA');
          setSavedMethod(null);
          setSelected2FA(null);
          setConfirmPassword('');
  }
   } catch (error) {
      Alert.alert('Błąd', 'Nie udało się usunąć ustawień');
    } finally {
      setConfirmPassword('');
      setShowGoogleModal(false);
    }
}

  const handlePasswordConfirmation = async () => {
    if (!confirmPassword) {
      Alert.alert('Błąd', 'Podaj hasło');
      return;
    }

    try {
      if (isDisabling) {
        if(confirmPassword == '') {
          return Alert.alert('Informacja', 'Hasło nie może być puste');
        }

        const response = await remove2fa(confirmPassword);

        if(response == "invalid password") {
          return Alert.alert('Błąd', 'Niepoprawne hasło');
        } else if (response.status === 403) {
          Alert.alert('Sesja wygasła', 'Prosimy o ponowne zalogowanie');
          await clearUserSession();
          navigate('login');
        } else if(response == false) {
          return Alert.alert('Błąd', 'Operacja zakończona niepowodzeniem');
        } else if(response == true) {
          await SecureStore.deleteItemAsync('selected2FA');
          setSavedMethod(null);
          setSelected2FA(null);
          return Alert.alert('Sukces', 'Uwierzytelnianie dwuskładnikowe zostało wyłączone');
        }
      } else {
        if (!selected2FA) {
          Alert.alert('Informacja', 'Wybierz metodę 2FA');
          return;
        }

        const response = await enable2fa(selected2FA, confirmPassword);
        const data = await response.json();
        console.log(data);
        if(response.ok) {
          if(data.requiresCode === true) {
            //if(selected2FA === 'gauth') {
              setGeneratedSecret(data.otpAuth);
              setShowGoogleModal(true);
            // } else {
            //   console.log("cyce");
            // }
          } else {
            await SecureStore.setItemAsync('selected2FA', selected2FA);
            setSavedMethod(selected2FA);
            Alert.alert('Sukces', 'Ustawienia 2FA zostały zapisane');
          }
        } else if (response.status === 403) {
          Alert.alert('Sesja wygasła', 'Prosimy o ponowne zalogowanie');
          await clearUserSession();
          navigate('login');
        } else {
          setShowPasswordModal(false);
          setConfirmPassword('');
          setSelected2FA(savedMethod);
          Alert.alert('Błąd', 'Nie udało się zapisać ustawień 2FA');
        }
      }
    } catch (error) {
      Alert.alert('Błąd', 'Nie udało się zapisać ustawień 2FA');
    } finally {
      setShowPasswordModal(false);
    }
  };

  const onConfirmCode = async (code) => {
    if (!code || code.trim() === "") {
      return Alert.alert("Błąd", "Wprowadź kod");
  }
    try {
      const response = await sendConfirmCode(code);

      if (response.status === 401) {
        Alert.alert("Błąd", "Nieprawidłowy kod");
        return;
      } else if (response.status === 403) {
          Alert.alert('Sesja wygasła', 'Prosimy o ponowne zalogowanie');
          await clearUserSession();
          navigate('login');
        }

      if (response.ok) {
        await SecureStore.setItemAsync('selected2FA', selected2FA);
        setSavedMethod(selected2FA);
        setShowGoogleModal(false);
        setConfirmPassword('');
        Alert.alert('Sukces', 'Ustawienia 2FA zostały zapisane');
      } else {
        return Alert.alert("Błąd", "Wystąpił błąd");
      }
    } catch (error) {
      console.error("Błąd podczas potwierdzania kodu:", error);
      Alert.alert("Błąd", "Nie udało się połączyć z serwerem");
    }
  }

const handleChangePassword = async () => {
  if (!oldPassword || !newPassword) {
    return Alert.alert("Błąd", "Wszystkie pola muszą być wypełnione");
  }

  try {
    const response = await changePassword(oldPassword, newPassword);
    if (response.ok) {
      Alert.alert("Sukces", "Hasło zostało zmienione");
      setOldPassword('');
      setNewPassword('');
      setShowChangePasswordModal(false);
    } else if (response.status === 403) {
          Alert.alert('Sesja wygasła', 'Prosimy o ponowne zalogowanie');
          await clearUserSession();
          navigate('login');
    } else {
      Alert.alert("Błąd", "Nie udało się zmienić hasła");
    }
  } catch (error) {
    console.error(error);
    Alert.alert("Błąd", "Wystąpił błąd podczas zmiany hasła");
  }
};

const handleChangeEmail = async () => {
  if (!confirmPasswordEmail || !newEmail) {
    return Alert.alert("Błąd", "Wszystkie pola muszą być wypełnione");
  }

  try {
    const response = await changeEmail(confirmPasswordEmail, newEmail);
    if (response.ok) {
      Alert.alert("Sukces", "Email został zmieniony");
      setConfirmPasswordEmail('');
      setNewEmail('');
      setShowChangeEmailModal(false);
    } else if (response.status === 403) {
          Alert.alert('Sesja wygasła', 'Prosimy o ponowne zalogowanie');
          await clearUserSession();
          navigate('login');
    } else {
      Alert.alert("Błąd", "Nie udało się zmienić emaila");
    }
  } catch (error) {
    console.error(error);
    Alert.alert("Błąd", "Wystąpił błąd podczas zmiany emaila");
  }
};

const handleDeleteAccount = async () => {
  if (!deletePassword) {
    return Alert.alert("Błąd", "Podaj hasło aby usunąć konto");
  }

  try {
    const response = await deleteAccount(deletePassword);
    if (response) {
      Alert.alert("Sukces", "Konto zostało usunięte");
      setDeletePassword('');
      setShowDeleteModal(false);
      await clearUserSession();
      navigate('welcome'); 
    } else if (response.status === 403) {
          Alert.alert('Sesja wygasła', 'Prosimy o ponowne zalogowanie');
          await clearUserSession();
          navigate('login');
    } else {
      Alert.alert("Błąd", "Nie udało się usunąć konta");
    }
  } catch (error) {
    console.error(error);
    Alert.alert("Błąd", "Wystąpił błąd podczas usuwania konta");
  }
};


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
              onPress={() => handleToggle(opt.id, opt.disabled)}
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

        <TouchableOpacity style={styles.primaryButtonSettings} onPress={confirm2FASettings}>
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
          onConfirm={handleChangePassword}
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
          onConfirm={handleChangeEmail}
        />

        <DeleteAccountModal
          visible={showDeleteModal}
          onClose={async () => {
            setShowDeleteModal(false);
            setDeletePassword('');
          }}
          deletePassword={deletePassword}
          setDeletePassword={setDeletePassword}
          onConfirm={handleDeleteAccount}
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
                onPress={handlePasswordConfirmation}
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
      onClose={async () => await handleCancel()}
      onConfirm={async (code) => {
        await onConfirmCode(code);
      }}
    />            
{/* 
      {/* code confirmation Modal 
      <Modal visible={showConfirmationModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{'Kod potwierdzający'}</Text>
            <Text style={styles.modalText}>
              {selected2FA == 'email'
                ? 'Wprowadź kod wysłany na twój adres email.'
                : 'Wprowadź kod wygenerowany przez aplikację.'}
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
                onPress={handlePasswordConfirmation}
              >
                <Text style={styles.modalButtonConfirmText}>Potwierdź</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal> */}
    </ScrollView>
  );
};

export default SettingsScreen;
