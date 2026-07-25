import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const InvoiceModal = ({ show, setShow, lastBillNo, lastOrderType, lastPaymentMethod, lastFutureSale, lastCart, lastBillAmt }) => {
  if (!show) return null;
  
  const currentDate = new Date().toLocaleString('en-US', {
    month: 'numeric', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
  });

  return (
    <Modal visible={show} transparent animationType="fade">
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setShow && setShow(false)}
      >
        <TouchableOpacity activeOpacity={1} style={styles.receiptPaper}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            {/* Header section */}
            <View style={styles.centerAlign}>
              <Text style={styles.hotelName}>DATA UDIPI HOTEL</Text>
              <Text style={styles.textNormal}>M G R Nagar, Chennai</Text>
              <Text style={styles.textNormal}>Phone: 31595014</Text>
            </View>

            <View style={styles.counterBox}>
              <Text style={styles.counterText}>COUNTER POS</Text>
            </View>

            <View style={styles.dashedLine} />

            <View style={styles.infoRow}>
              <Text style={styles.textBold}>Bill No: {lastBillNo}</Text>
              <Text style={styles.textNormal}>{currentDate}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.textNormal}>
                <Text style={styles.textBold}>Mode: </Text>
                {lastOrderType === 'take-away' ? 'Take Away' : 'Dine In'}
                <Text> | </Text>
                <Text style={styles.textBold}>Pay: </Text>
                {lastPaymentMethod || 'Cash'}
              </Text>
            </View>

            {lastFutureSale && lastFutureSale.name ? (
              <View style={styles.infoRow}>
                <Text style={styles.textNormal}>Future Sale: {lastFutureSale.name}</Text>
              </View>
            ) : null}

            <View style={styles.dashedLine} />

            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.textBold, { flex: 1 }]}>Item</Text>
              <Text style={[styles.textBold, { width: 40, textAlign: 'right' }]}>Qty</Text>
              <Text style={[styles.textBold, { width: 80, textAlign: 'right' }]}>Amt</Text>
            </View>

            {/* Items */}
            <View style={styles.itemsContainer}>
              {(lastCart || []).map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.textNormal}>{item.description}</Text>
                    <Text style={styles.itemCode}>{item.product_code || item.id}</Text>
                  </View>
                  <Text style={[styles.textNormal, { width: 40, textAlign: 'right' }]}>{item.qty}</Text>
                  <Text style={[styles.textNormal, { width: 80, textAlign: 'right' }]}>₹{item.amount.toFixed(2)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.dashedLine} />

            {/* Total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalText}>TOTAL</Text>
              <Text style={styles.totalText}>₹{(lastBillAmt || 0).toFixed(2)}</Text>
            </View>

            {/* Footer */}
            <View style={[styles.centerAlign, { marginTop: 20 }]}>
              <Text style={styles.thankYouText}>Thank you! Visit again.</Text>
            </View>

            <View style={styles.solidLine} />

            <View style={styles.centerAlign}>
              <Text style={styles.footerGray}>Techwizard AI partners</Text>
              <Text style={styles.footerGray}>vasu@t-wi.com</Text>
            </View>

          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  receiptPaper: { 
    backgroundColor: '#ffffff', 
    width: 320,
    maxHeight: '85%',
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    borderRadius: 4
  },
  scrollContent: {
    paddingBottom: 10
  },
  centerAlign: { 
    alignItems: 'center' 
  },
  hotelName: { 
    fontFamily: 'monospace', 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#000',
    marginBottom: 4
  },
  textNormal: { 
    fontFamily: 'monospace', 
    fontSize: 12, 
    color: '#000',
    lineHeight: 18
  },
  textBold: { 
    fontFamily: 'monospace', 
    fontSize: 12, 
    fontWeight: 'bold', 
    color: '#000'
  },
  counterBox: {
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 6,
    alignItems: 'center',
    marginVertical: 12
  },
  counterText: {
    fontFamily: 'monospace', 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#000'
  },
  dashedLine: {
    borderTopWidth: 1,
    borderColor: '#000',
    borderStyle: 'dashed',
    marginVertical: 10
  },
  solidLine: {
    borderTopWidth: 1,
    borderColor: '#ccc',
    marginVertical: 15
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  tableHeader: {
    flexDirection: 'row',
    marginBottom: 8
  },
  itemsContainer: {
    marginTop: 4
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  itemCode: {
    fontFamily: 'monospace', 
    fontSize: 11, 
    color: '#6b7280',
    marginTop: 2
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4
  },
  totalText: {
    fontFamily: 'monospace', 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#000'
  },
  thankYouText: {
    fontFamily: 'monospace', 
    fontSize: 12, 
    fontStyle: 'italic',
    color: '#000'
  },
  footerGray: {
    fontFamily: 'monospace', 
    fontSize: 11, 
    color: '#6b7280',
    lineHeight: 16
  }
});

export default InvoiceModal;
