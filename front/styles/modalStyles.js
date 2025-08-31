import { StyleSheet } from 'react-native';

export default StyleSheet.create({
settingsActions: {
  width: "100%",
  alignItems: 'center',
},
settingsRow: {
  flexDirection: 'row',
  alignItems: 'center',
  width: '85%',
  paddingVertical: 14,
  paddingHorizontal: 16,
  borderBottomWidth: 1,
  //borderBottomColor: '#eee',
  backgroundColor: '#fff',
  borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginBottom: 10,
},

settingsIcon: {
  marginRight: 12,
},

settingsText: {
  fontSize: 16,
  color: '#007AFF',
},


settingsButtonDelete: {
  backgroundColor: "#dc3545",
  paddingVertical: 14,
  borderRadius: 8,
  marginBottom: 12,
  alignItems: "center",
  width: "90%",
},

settingsButtonDeleteText: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "600",
},

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    marginBottom: 15,
    color: '#555',
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 14,
    color: '#000',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButtonCancel: {
    backgroundColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flex: 1,
    marginRight: 8,
  },
  modalButtonCancelText: {
    textAlign: 'center',
    color: '#000',
    fontWeight: 'bold',
  },
  modalButtonConfirm: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flex: 1,
    marginLeft: 8,
  },
  modalButtonConfirmText: {
    textAlign: 'center',
    color: '#fff',
    fontWeight: 'bold',
  },
});
