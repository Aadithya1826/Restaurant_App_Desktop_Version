import React from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';

const DateRangeModal = ({ show, setShow, dateRange, setDateRange, onPrint, reportType, setDateRangeReportType }) => {
  return (
    <Modal visible={show} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Custom Date Range Report</Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity 
              style={[styles.typeButton, reportType === 'hourly' && styles.activeTypeButton]} 
              onPress={() => setDateRangeReportType('hourly')}
            >
              <Text style={[styles.typeText, reportType === 'hourly' && styles.activeTypeText]}>Hourly Report</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.typeButton, reportType === 'items' && styles.activeTypeButton]} 
              onPress={() => setDateRangeReportType('items')}
            >
              <Text style={[styles.typeText, reportType === 'items' && styles.activeTypeText]}>Item Report</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.label}>From Date:</Text>
          {Platform.OS === 'web' ? (
            <input
              type="date"
              style={styles.webInput}
              value={dateRange.startDate || ''}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            />
          ) : (
            <TextInput
              style={styles.input}
              placeholder="From (YYYY-MM-DD)"
              value={dateRange.startDate}
              onChangeText={(text) => setDateRange(prev => ({ ...prev, startDate: text }))}
            />
          )}

          <Text style={styles.label}>To Date:</Text>
          {Platform.OS === 'web' ? (
            <input
              type="date"
              style={styles.webInput}
              value={dateRange.endDate || ''}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            />
          ) : (
            <TextInput
              style={styles.input}
              placeholder="To (YYYY-MM-DD)"
              value={dateRange.endDate}
              onChangeText={(text) => setDateRange(prev => ({ ...prev, endDate: text }))}
            />
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShow(false)}>
              <Text>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={() => {
                setShow(false);
                onPrint(reportType, dateRange.startDate, dateRange.endDate);
              }}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Print Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: 320 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 15 },
  label: { fontSize: 14, marginBottom: 5, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginBottom: 15 },
  webInput: {
    borderWidth: '1px',
    borderColor: '#ccc',
    borderStyle: 'solid',
    borderRadius: '5px',
    padding: '10px',
    marginBottom: '15px',
    width: '100%',
    boxSizing: 'border-box',
    fontSize: '14px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  buttonContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  cancelButton: { padding: 10, marginRight: 10 },
  saveButton: { padding: 10, backgroundColor: '#00d8cd', borderRadius: 5 }, // Using teal for cashier
  typeSelector: { flexDirection: 'row', marginBottom: 15, borderWidth: 1, borderColor: '#ccc', borderRadius: 5, overflow: 'hidden' },
  typeButton: { flex: 1, padding: 10, alignItems: 'center', backgroundColor: '#f0f0f0' },
  activeTypeButton: { backgroundColor: '#00d8cd' },
  typeText: { fontSize: 14, color: '#333' },
  activeTypeText: { color: 'white', fontWeight: 'bold' }
});

export default DateRangeModal;
