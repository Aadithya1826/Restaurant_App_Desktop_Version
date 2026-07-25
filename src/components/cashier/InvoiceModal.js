import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const InvoiceModal = ({ show, setShow, lastBillNo, lastOrderType, lastPaymentMethod, lastFutureSale, lastCart, lastBillAmt }) => {
  return (
    <Modal visible={show} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Invoice #{lastBillNo}</Text>
          <Text>Type: {lastOrderType}</Text>
          <Text>Payment: {lastPaymentMethod}</Text>
          {lastFutureSale && lastFutureSale.name ? (
             <Text>Future Sale for: {lastFutureSale.name}</Text>
          ) : null}
          
          <ScrollView style={styles.itemsList}>
            {(lastCart || []).map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.qty}x {item.description}</Text>
                <Text style={styles.itemPrice}>₹{item.amount.toFixed(2)}</Text>
              </View>
            ))}
          </ScrollView>

          <Text style={styles.total}>Total: ₹{(lastBillAmt || 0).toFixed(2)}</Text>

          <TouchableOpacity style={styles.closeButton} onPress={() => { if(setShow) setShow(false); }}>
            <Text style={{ color: 'white', textAlign: 'center' }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: 300, maxHeight: '80%' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  itemsList: { marginVertical: 15, maxHeight: 200 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  itemName: { flex: 1 },
  itemPrice: { fontWeight: 'bold' },
  total: { fontSize: 18, fontWeight: 'bold', textAlign: 'right', marginTop: 10, marginBottom: 20 },
  closeButton: { padding: 12, backgroundColor: '#3b82f6', borderRadius: 5, cursor: 'pointer' }
});

export default InvoiceModal;
