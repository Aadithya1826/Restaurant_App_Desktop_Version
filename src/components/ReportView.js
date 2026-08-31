import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Platform, createElement } from 'react-native';
import { ArrowLeft, Printer, Activity } from 'lucide-react-native';
import { reportsService } from '../services/api';

export default function ReportView({ type, onBack }) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        if (type === 'hourly') {
          const res = await reportsService.getHourlyReport({ date: selectedDate });
          setReportData(res);
        } else if (type === 'item') {
          const res = await reportsService.getItemWiseReport({ date: selectedDate });
          setReportData(res);
        }
      } catch (err) {
        setError('Failed to fetch report data. Your session may have expired.');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [type, selectedDate]);

  const handlePrint = () => {
    if (Platform.OS !== 'web') return; // If mobile, use a different print strategy if needed
    
    let tableRows = '';
    if (type === 'hourly') {
      tableRows = reportData.timeline.map(t => `
        <div class="row">
          <span>${t.time}</span>
          <span>${Math.round(t.sales)}</span>
        </div>
      `).join('');
    } else {
      tableRows = reportData.items.map(item => `
        <div class="item-row">
          <span class="item-name">${item.name}</span>
          <span class="item-qty">${item.qty.toFixed(2)}</span>
          <span class="item-amt">${item.amount.toFixed(2)}</span>
        </div>
      `).join('');
    }

    const itemHeader = type === 'hourly' ? '' : `
      <div class="item-row" style="border-bottom: 1px dashed #000; border-top: 1px dashed #000; padding: 5px 0; margin-bottom: 5px; font-weight: bold;">
        <span class="item-name">Item Name</span>
        <span class="item-qty">Qty</span>
        <span class="item-amt">Amount</span>
      </div>
    `;

    const printContent = `
      <html>
        <head>
          <title>Print Receipt</title>
          <style>
            @page { margin: 0; }
            body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; width: 72mm; box-sizing: border-box; color: #000; }
            .header { text-align: center; margin-bottom: 10px; }
            .header h1 { font-size: 16px; margin: 0 0 5px 0; text-transform: uppercase; }
            .header p { margin: 0 0 4px 0; text-transform: uppercase; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .item-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .item-name { flex: 2; word-break: break-word; padding-right: 5px; }
            .item-qty { flex: 1; text-align: right; }
            .item-amt { flex: 1; text-align: right; }
            .total-row { border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${reportData.restaurant?.name || 'DATAUDIPI HOTEL'}</h1>
            <p>${reportData.restaurant?.address || 'MUGALIVAKKAM, CHENNAI'}</p>
            <p>PH:${reportData.restaurant?.phone || '9597066563'} GSTIN: ${reportData.restaurant?.gstin || '33ADLPV4810B3ZQ'}</p>
            <h2 style="font-size: 14px; margin: 10px 0 5px 0;">${type === 'hourly' ? 'HOURLY REPORT' : 'ITEM WISE REPORT'}</h2>
            <div style="text-align: left; margin-top: 10px;">
              ${type === 'hourly' 
                ? `<p>Date: ${reportData.date}</p>` 
                : `<p>Print Date: ${reportData.date}</p><p>Bills From: ${reportData.date}</p><p>To: ${reportData.date}</p>`}
              <p>Starting BillNo: ${reportData.starting_bill?.no || '-'} - ${reportData.starting_bill?.time || '-'}</p>
              <p>Ending BillNo: ${reportData.ending_bill?.no || '-'} - ${reportData.ending_bill?.time || '-'}</p>
            </div>
          </div>
          
          ${itemHeader}
          ${tableRows}
          
          <div class="total-row">
            <span>TOTAL SALES</span>
            <span>${reportData.total_sales.toFixed(2)}</span>
          </div>
        </body>
      </html>
    `;

    if (window.electronAPI && window.electronAPI.printSilent) {
      window.electronAPI.printSilent(printContent);
    } else {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(printContent);
      iframe.contentWindow.document.close();
      iframe.contentWindow.focus();
      setTimeout(() => {
        iframe.contentWindow.print();
        document.body.removeChild(iframe);
      }, 250);
    }
  };

  if (loading && !reportData) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#ff8c42" />
        <Text style={styles.loadingText}>Loading report data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
            <ArrowLeft size={20} color="#111" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>{type === 'hourly' ? 'Hourly Sales Report' : 'Item Wise Sales Report'}</Text>
            <Text style={styles.subtitle}>
              Date: {reportData?.date || selectedDate} | Starting Bill: {reportData?.starting_bill?.no || '-'} | Ending Bill: {reportData?.ending_bill?.no || '-'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {Platform.OS === 'web' ? (
            createElement('input', {
              type: 'date',
              value: selectedDate,
              onChange: (e) => setSelectedDate(e.target.value),
              style: {
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                backgroundColor: 'white',
                outline: 'none',
                fontFamily: 'inherit',
                fontSize: '14px',
                marginRight: '8px'
              }
            })
          ) : (
            <Text style={styles.dateBadge}>{selectedDate}</Text>
          )}
          
          <TouchableOpacity onPress={handlePrint} style={styles.printBtn}>
            <Printer size={18} color="#111" />
            <Text style={styles.printBtnText}>Print Receipt</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
           <View style={[styles.centerContainer, { height: 200 }]}>
             <ActivityIndicator size="large" color="#ff8c42" />
           </View>
        ) : (
          <>
            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Sales</Text>
                <Text style={styles.statValue}>₹{reportData.total_sales.toFixed(2)}</Text>
              </View>
              {type === 'item' && (
                <>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Total Items Types Sold</Text>
                    <Text style={styles.statValue}>{reportData.items.length}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Total Quantity Sold</Text>
                    <Text style={styles.statValue}>
                      {reportData.items.reduce((acc, curr) => acc + curr.qty, 0).toFixed(0)}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Table */}
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                {type === 'hourly' ? (
                  <>
                    <Text style={[styles.th, { flex: 1 }]}>Timeline</Text>
                    <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Sales Amount (₹)</Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.th, { flex: 2 }]}>Item Name</Text>
                    <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Rate (₹)</Text>
                    <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Quantity</Text>
                    <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Amount (₹)</Text>
                  </>
                )}
              </View>
              
              {type === 'hourly' ? (
                reportData.timeline.map((t, idx) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={[styles.td, { flex: 1, fontWeight: '500' }]}>{t.time}</Text>
                    <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{Math.round(t.sales)}</Text>
                  </View>
                ))
              ) : (
                reportData.items.map((item, idx) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={[styles.td, { flex: 2, fontWeight: '500' }]}>{item.name}</Text>
                    <Text style={[styles.td, { flex: 1, textAlign: 'right', color: '#64748b' }]}>{item.rate.toFixed(2)}</Text>
                    <Text style={[styles.td, { flex: 1, textAlign: 'right', color: '#64748b' }]}>{item.qty.toFixed(2)}</Text>
                    <Text style={[styles.td, { flex: 1, textAlign: 'right', fontWeight: 'bold' }]}>{item.amount.toFixed(2)}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24, paddingBottom: 100 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 16, color: '#64748b' },
  errorText: { color: '#ef4444', marginBottom: 16 },
  backBtn: { backgroundColor: '#ff8c42', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { color: 'white', fontWeight: '600' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 8, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748b' },
  
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateBadge: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, fontWeight: '500', color: '#0f172a' },
  printBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#111', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6 },
  printBtnText: { fontWeight: '500', color: '#111' },

  content: { flex: 1 },
  
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: 'white', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  statLabel: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },

  tableContainer: { backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingHorizontal: 24, paddingVertical: 16 },
  th: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingHorizontal: 24, paddingVertical: 16, alignItems: 'center' },
  td: { fontSize: 14, color: '#0f172a' }
});
