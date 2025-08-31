import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, TextInput, Alert, Linking } from "react-native";
import * as Clipboard from 'expo-clipboard';

const TwoFactorModal = ({ visible, method, secret, onClose, onConfirm }) => {
  const [code, setCode] = useState("");

  const getSecretFromURL = (url) => {
    try {
      const match = url.match(/secret=([A-Z0-9]+)/);
      return match ? match[1] : url;
    } catch {
      return url;
    }
  };

  const handleCopy = async () => {
    const extractedSecret = getSecretFromURL(secret);
    await Clipboard.setStringAsync(extractedSecret);
    Alert.alert("Skopiowano", "Sekret został skopiowany do schowka");
  };

  const handleOpenLink = () => {
    Linking.openURL(secret);
  };

  const handleConfirm = () => {
    if (!code || code.length !== 6) {
      Alert.alert("Błąd", "Wprowadź 6-cyfrowy kod");
      return;
    }
    onConfirm(code);
    setCode("");
  };

  const buttonStyle = {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  };

  const buttonTextStyle = {
    color: "#fff",
    fontWeight: "600",
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)"
      }}>
        <View style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 20,
          width: "85%"
        }}>
          {/* Title */}
          <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 10 }}>
            {method === "gauth" ? "Skonfiguruj Google Authenticator" : "Podaj kod z e-maila"}
          </Text>

          {method === "gauth" ? (
            <>
              <Text style={{ fontSize: 14, marginBottom: 15 }}>
                Skopiuj kod lub otwórz link bezpośrednio w aplikacji:
              </Text>

              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 15 }}>
                <TouchableOpacity onPress={handleOpenLink} style={[buttonStyle, { flex: 1, marginRight: 5 }]}>
                  <Text style={buttonTextStyle}>Otwórz w aplikacji</Text>
                </TouchableOpacity>
                <Text style={{ marginHorizontal: 5 }}>lub</Text>
                <TouchableOpacity onPress={handleCopy} style={[buttonStyle, { flex: 1, marginLeft: 5 }]}>
                  <Text style={buttonTextStyle}>Kopiuj</Text>
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 14, marginBottom: 8 }}>
                Następnie wpisz 6-cyfrowy kod wygenerowany w aplikacji:
              </Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 14, marginBottom: 15 }}>
                Wpisz kod wysłany na Twój adres e-mail:
              </Text>
            </>
          )}

          {/* Input for code */}
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Wpisz kod"
            placeholderTextColor="#aaa"
            keyboardType="numeric"
            maxLength={6}
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 8,
              padding: 10,
              fontSize: 16,
              marginBottom: 20
            }}
          />

          {/* Buttons */}
          <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
            <TouchableOpacity onPress={onClose} style={{ marginRight: 15 }}>
              <Text style={{ color: "#666" }}>Anuluj</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={{ color: "#007AFF", fontWeight: "600" }}>Potwierdź</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default TwoFactorModal;
