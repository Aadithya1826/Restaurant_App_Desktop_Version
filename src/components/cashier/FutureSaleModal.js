import React from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

const FutureSaleModal = ({ show, setShow, futureSale, setFutureSale }) => {
  return (
    <Modal visible={show} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Future Sale Details</Text>
          <TextInput
            style={styles.input}
            placeholder="Customer Name"
            value={futureSale.name}
            onChangeText={(text) => setFutureSale(prev => ({ ...prev, name: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={futureSale.phone}
            onChangeText={(text) => setFutureSale(prev => ({ ...prev, phone: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Address"
            value={futureSale.address}
            onChangeText={(text) => setFutureSale(prev => ({ ...prev, address: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Delivery Date (YYYY-MM-DD)"
            value={futureSale.deliveryDate}
            onChangeText={(text) => setFutureSale(prev => ({ ...prev, deliveryDate: text }))}
          />
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShow(false)}>
              <Text>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={() => setShow(false)}>
              <Text style={{ color: 'white' }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: 300 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginBottom: 10 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  cancelButton: { padding: 10, marginRight: 10 },
  saveButton: { padding: 10, backgroundColor: 'blue', borderRadius: 5 }
});

export default FutureSaleModal;
