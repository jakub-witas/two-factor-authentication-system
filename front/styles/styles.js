import { StyleSheet, Platform } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  scrollContent: {
    flexGrow: 1,
  paddingHorizontal: 20,
  paddingTop: Platform.OS === 'ios' ? 60 : 40,
  paddingBottom: 30,
  marginTop: 20,
  justifyContent: "center",
  alignItems: "center",
},

centerContent: {
  flex: 1,
  justifyContent: 'center', // vertically centers for short content
},

  welcomeHeader: {
    marginTop: 20,
    alignItems: 'center',
  },

  // scrollContent: {
  //   flexGrow: 1,
  //   padding: 24,
  //   justifyContent: "center",
  // },

  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 10,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },

  header: {
    marginBottom: 40,
    alignItems: "center",
  },

  headerHome: {
    marginBottom: 40,
    marginTop: "20%",
    alignItems: "center",
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: 'center',
  },

  content: {
    marginTop: 40,
    alignItems: 'center',
    alignSelf: "stretch"
  },

  form: {
    width: "100%",
  },

  inputGroup: {
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    marginLeft: "10%",
    fontWeight: "600",
    marginBottom: 6,
    color: "#495057",
  },

  input: {
    width: "90%",
    height: 50,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    fontSize: 16,
    color: "#212529",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    width: "90%",
    alignSelf: "center",
  },

  passwordInput: {
    flex: 1,
    alignSelf: "center",
    height: 50,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#212529",
  },

  eyeButton: {
    paddingHorizontal: 12,
  },

  primaryButton: {
    width: '90%',
    alignSelf: "center",
    paddingVertical: 15,
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 3,
  },

  primaryButtonSettings: {
    backgroundColor: "#4A90E2",
  borderRadius: 12,
  paddingVertical: 14,
  alignItems: "center",
  marginTop: 16,
  alignSelf: "center",
  paddingHorizontal: 24,
  width: "100%",
  alignSelf: "center",
  shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 3,
  },

  primaryButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },

  secondaryButton: {
    width: '90%',
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4A90E2',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },

  secondaryButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },

  footer: {
    alignItems: 'center',
    marginBottom: 10,
  },

  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },

 card: {
  backgroundColor: '#FFF',
  borderRadius: 16,
  padding: 24,
  marginBottom: "50%",

  alignSelf: 'center',
  width: '90%',

  marginTop: 10,

  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowOffset: { width: 0, height: 3 },
  shadowRadius: 6,
  elevation: 4,
},
cardTitle: {
  fontSize: 22,
  fontWeight: '700',
  marginBottom: 12,
  color: '#111',
},
cardText: {
  fontSize: 15,
  color: '#444',
  lineHeight: 22,
},

  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignSelf: "center",
    width: "90%",
  },
  settingsButtonText: {
    color: '#007AFF',
    fontSize: 16,
    marginLeft: 8,
  },

  logoutButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: "10%",
    width: "90%",
    alignSelf: "center",
  },
  logoutButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  //settings

  settingsHeader: {
  marginBottom: 20,
  alignItems: "center",
},

section: {
  backgroundColor: "#fff",
  borderRadius: 16,
  padding: 16,
  marginBottom: 24,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 2,
},

sectionHeader: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 10,
},

sectionTitle: {
  fontSize: 16,
  fontWeight: "600",
  color: "#333",
  marginLeft: 8,
},

sectionDescription: {
  fontSize: 14,
  color: "#666",
  marginBottom: 20,
  marginLeft: 15
},

optionItem: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: 14,
  paddingHorizontal: 12,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#E5E5EA",
  backgroundColor: "#FAFAFA",
  marginBottom: 12,
},

optionItemSelected: {
  backgroundColor: "#EAF3FF",
  borderColor: "#007AFF",
},

optionLeft: {
  flexDirection: "row",
  alignItems: "center",
  flexShrink: 1,
},

optionText: {
  marginLeft: 12,
  flexShrink: 1,
},

optionName: {
  fontSize: 16,
  fontWeight: "600",
  color: "#333",
},

optionNameSelected: {
  color: "#007AFF",
},

optionDesc: {
  fontSize: 13,
  color: "#888",
},

// Modal
modalOverlay: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgba(0,0,0,0.5)",
},

modalContent: {
  backgroundColor: "#fff",
  borderRadius: 20,
  padding: 20,
  width: "85%",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 4,
},

modalTitle: {
  fontSize: 18,
  fontWeight: "600",
  color: "#333",
  marginBottom: 8,
},

modalText: {
  fontSize: 14,
  color: "#666",
  marginBottom: 16,
},

modalInput: {
  borderWidth: 1,
  borderColor: "#E5E5EA",
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 14,
  color: "#333",
  marginBottom: 20,
  backgroundColor: "#FAFAFA",
},

modalButtons: {
  flexDirection: "row",
  justifyContent: "flex-end",
},

modalButtonCancel: {
  paddingVertical: 10,
  paddingHorizontal: 16,
  marginRight: 8,
},

modalButtonCancelText: {
  fontSize: 14,
  color: "#666",
},

modalButtonConfirm: {
  backgroundColor: "#007AFF",
  borderRadius: 12,
  paddingVertical: 10,
  paddingHorizontal: 16,
},

modalButtonConfirmText: {
  fontSize: 14,
  fontWeight: "600",
  color: "#fff",
},
});

export default styles;
