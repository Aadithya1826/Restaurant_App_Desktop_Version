import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useLanguage } from '../context/LanguageContext';
import { Store, Clock, Bell, Receipt, CheckCircle } from 'lucide-react-native';

export default function SettingsManagement() {
  const { t, language, setLanguage } = useLanguage();
  const [settings, setSettings] = useState({
    orderNotifications: true,
    lowStockAlerts: false,
    dailyEmailReports: false,
    autoPrintBills: true,
    printKot: false,
    taxRate: '5',
    serviceCharge: '5',
    packagingCharge: '5',
  });

  const toggleSetting = (key) => setSettings(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('settings_system')}</Text>
          <Text style={styles.subtitle}>{t('sm_config')}</Text>
        </View>
        <TouchableOpacity style={styles.saveBtn}>
          <CheckCircle color="white" size={16} style={{ marginRight: 8 }} />
          <Text style={styles.saveBtnText}>{t('sm_save')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        
        {/* Language Selection */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrapper, { backgroundColor: '#3b82f6' }]}>
              <Text style={{ fontSize: 20 }}>🌐</Text>
            </View>
            <Text style={styles.cardTitle}>{t('settings_language')}</Text>
          </View>
          <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>{t('settings_language_desc')}</Text>
          <View style={{ borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, overflow: 'hidden', maxWidth: 300 }}>
            <Picker selectedValue={language} onValueChange={(val) => setLanguage(val)} style={{ height: 40, borderWidth: 0, outlineStyle: 'none' }}>
              <Picker.Item label="English" value="en" />
              <Picker.Item label="हिन्दी (Hindi)" value="hi" />
              <Picker.Item label="தமிழ் (Tamil)" value="ta" />
              <Picker.Item label="తెలుగు (Telugu)" value="te" />
              <Picker.Item label="ಕನ್ನಡ (Kannada)" value="kn" />
              <Picker.Item label="മലയാളം (Malayalam)" value="ml" />
              <Picker.Item label="मराठी (Marathi)" value="mr" />
              <Picker.Item label="বাংলা (Bengali)" value="bn" />
              <Picker.Item label="भोजपुरी (Bhojpuri)" value="bho" />
            </Picker>
          </View>
        </View>

        {/* Restaurant Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrapper, { backgroundColor: '#ff6b35' }]}>
              <Store color="white" size={20} />
            </View>
            <Text style={styles.cardTitle}>{t('sm_rest_info')}</Text>
          </View>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>{t('sm_rest_name')}</Text>
              <Text style={styles.value}>Data Udipi</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>{t('sm_phone')}</Text>
              <Text style={styles.value}>+91 79043 46359</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>{t('sm_gst')}</Text>
              <Text style={styles.value}>GSTIN</Text>
            </View>
            <View style={[styles.gridItem, { width: '100%' }]}>
              <Text style={styles.label}>{t('sm_address')}</Text>
              <Text style={styles.value}>51, Anna Main Road, MGR Nagar, Chennai 600 078</Text>
            </View>
          </View>
        </View>

        {/* Opening Hours */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrapper, { backgroundColor: '#94a3b8' }]}>
              <Clock color="white" size={20} />
            </View>
            <Text style={styles.cardTitle}>{t('sm_open_hours')}</Text>
          </View>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>{t('sm_opening')}</Text>
              <View style={styles.timeBox}>
                <Text style={styles.value}>07:00 AM</Text>
                <Clock color="#94a3b8" size={16} />
              </View>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>{t('sm_closing')}</Text>
              <View style={styles.timeBox}>
                <Text style={styles.value}>10:00 PM</Text>
                <Clock color="#94a3b8" size={16} />
              </View>
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrapper, { backgroundColor: '#10b981' }]}>
              <Bell color="white" size={20} />
            </View>
            <Text style={styles.cardTitle}>{t('sm_notif')}</Text>
          </View>
          
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleTitle}>{t('sm_order_notif')}</Text>
              <Text style={styles.toggleSubtitle}>{t('sm_order_notif_desc')}</Text>
            </View>
            <Switch 
              value={settings.orderNotifications} 
              onValueChange={() => toggleSetting('orderNotifications')}
              trackColor={{ false: '#e2e8f0', true: '#ff6b35' }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.divider} />
          
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleTitle}>{t('sm_low_stock')}</Text>
              <Text style={styles.toggleSubtitle}>{t('sm_low_stock_desc')}</Text>
            </View>
            <Switch 
              value={settings.lowStockAlerts} 
              onValueChange={() => toggleSetting('lowStockAlerts')}
              trackColor={{ false: '#e2e8f0', true: '#ff6b35' }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.divider} />
          
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleTitle}>{t('sm_daily_email')}</Text>
              <Text style={styles.toggleSubtitle}>{t('sm_daily_email_desc')}</Text>
            </View>
            <Switch 
              value={settings.dailyEmailReports} 
              onValueChange={() => toggleSetting('dailyEmailReports')}
              trackColor={{ false: '#e2e8f0', true: '#ff6b35' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Billing & Printing */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrapper, { backgroundColor: '#ff6b35' }]}>
              <Receipt color="white" size={20} />
            </View>
            <Text style={styles.cardTitle}>{t('sm_billing')}</Text>
          </View>
          
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleTitle}>{t('sm_auto_print')}</Text>
              <Text style={styles.toggleSubtitle}>{t('sm_auto_print_desc')}</Text>
            </View>
            <Switch 
              value={settings.autoPrintBills} 
              onValueChange={() => toggleSetting('autoPrintBills')}
              trackColor={{ false: '#e2e8f0', true: '#ff6b35' }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.divider} />
          
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleTitle}>{t('sm_print_kot')}</Text>
              <Text style={styles.toggleSubtitle}>{t('sm_print_kot_desc')}</Text>
            </View>
            <Switch 
              value={settings.printKot} 
              onValueChange={() => toggleSetting('printKot')}
              trackColor={{ false: '#e2e8f0', true: '#ff6b35' }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.divider} />

          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>{t('sm_tax')}</Text>
              <TextInput 
                style={styles.input} 
                value={settings.taxRate} 
                onChangeText={t => setSettings({...settings, taxRate: t})}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>{t('sm_service')}</Text>
              <TextInput 
                style={styles.input} 
                value={settings.serviceCharge} 
                onChangeText={t => setSettings({...settings, serviceCharge: t})}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>{t('sm_pkg')}</Text>
              <TextInput 
                style={styles.input} 
                value={settings.packagingCharge} 
                onChangeText={t => setSettings({...settings, packagingCharge: t})}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { color: '#64748b', fontSize: 13, marginTop: 4 },
  saveBtn: { backgroundColor: '#ff6b35', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  
  content: { gap: 24, paddingBottom: 40 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 32, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  iconWrapper: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 40 },
  gridItem: { minWidth: 200 },
  label: { fontSize: 11, fontWeight: 'bold', color: '#64748b', marginBottom: 12, letterSpacing: 0.5 },
  value: { fontSize: 14, color: '#0f172a', fontWeight: '500' },
  
  timeBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: 250 },
  
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  toggleTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  toggleSubtitle: { fontSize: 13, color: '#64748b' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 20 },
  
  input: { fontSize: 14, color: '#0f172a', fontWeight: '500', paddingVertical: 0, outlineStyle: 'none' },
});
