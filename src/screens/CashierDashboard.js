import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, StyleSheet, Alert, useWindowDimensions, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { menuService } from '../services/api';
import api from '../services/api';
import { backupData } from '../services/offlineSync';
import { LogOut, Trash2 } from 'lucide-react-native';
import InvoiceModal from '../components/cashier/InvoiceModal';
import FutureSaleModal from '../components/cashier/FutureSaleModal';
import { Picker } from '@react-native-picker/picker';

export default function CashierDashboard({ navigation }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 1024;
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('All');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [productCodeInput, setProductCodeInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');

  const [billNo, setBillNo] = useState(101);
  const [lastBillNo, setLastBillNo] = useState(0);
  const [lastBillAmt, setLastBillAmt] = useState(0);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showFutureSaleModal, setShowFutureSaleModal] = useState(false);

  const [orderType, setOrderType] = useState('take-away');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [futureSale, setFutureSale] = useState({ name: '', address: '', city: '', phone: '', deliveryDate: '' });

  const [lastOrderType, setLastOrderType] = useState('take-away');
  const [lastFutureSale, setLastFutureSale] = useState(null);
  const [lastPaymentMethod, setLastPaymentMethod] = useState('');
  const [lastCart, setLastCart] = useState([]);
  const [restaurantData, setRestaurantData] = useState(null);

  useEffect(() => {
    if (!user || !user.restaurant_id) return;
    
    api.get(`/api/v1/restaurants/${user.restaurant_id}`)
      .then(data => setRestaurantData(data))
      .catch(err => console.error('Failed to fetch restaurant', err));

    menuService.getItems({ restaurant_id: user.restaurant_id })
      .then(data => Array.isArray(data) && setMenuItems(data))
      .catch(err => console.error(err));

    menuService.getCategories({ restaurant_id: user.restaurant_id })
      .then(data => {
        if (Array.isArray(data)) {
          const unique = data.reduce((acc, current) => {
            if (!acc.find(item => item.name === current.name)) acc.push(current);
            return acc;
          }, []);
          setCategories(unique);
        }
      })
      .catch(err => console.error(err));
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        // Only trigger if focus is not in an input, OR if we want it to trigger anyway.
        // Actually, if they are in the search input, onSubmitEditing handles it.
        // But if they are just focused on the body, this handles it.
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
          if (cart.length > 0 && !showInvoice && !showFutureSaleModal) {
            handleCheckout();
          }
        }
      }
    };
    if (Platform.OS === 'web') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [cart, showInvoice, showFutureSaleModal, orderType, paymentMethod, futureSale]);

  const addItemToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1, amount: (c.qty + 1) * c.rate } : c);
      }
      return [...prev, {
        id: item.id,
        product_code: item.item_code || item.id,
        description: item.name || 'Unknown',
        rate: item.price || 0,
        qty: 1,
        amount: item.price || 0
      }];
    });
  };

  const addProductToCart = () => {
    const code = productCodeInput.trim().toLowerCase();
    if (code) {
      const item = menuItems.find(i => 
        String(i.item_code).toLowerCase() === code || 
        String(i.id).toLowerCase() === code ||
        String(i.product_code).toLowerCase() === code
      );
      if (item) {
        addItemToCart(item);
        setProductCodeInput('');
      } else {
        Alert.alert("Not Found", "Item code not found");
      }
    } else {
      if (cart.length > 0) {
        handleCheckout();
      }
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const totalAmt = cart.reduce((sum, item) => sum + item.amount, 0);

    const payload = {
      table_number: orderType === 'take-away' ? 'takeaway' : '1',
      payment_method: paymentMethod,
      cart: cart.map(c => ({ id: c.id, quantity: c.qty, price: c.rate })),
      subtotal: totalAmt,
      gst: 0,
      service_charge: 0,
      total_amount: totalAmt
    };

    const dateStr = new Date().toISOString().split('T')[0];
    backupData('Cashier', 'Receipts', `Receipt_${billNo}_${dateStr}.json`, payload);

    api.post(`/api/v1/orders?restaurant_id=${user?.restaurant_id}`, payload)
      .then(res => Alert.alert("Success", "Order placed successfully"))
      .catch(err => Alert.alert("Error", "Failed to place order"));

    setLastBillNo(billNo);
    setLastBillAmt(totalAmt);
    setBillNo(prev => prev + 1);
    setLastCart([...cart]);
    setCart([]);
    setLastOrderType(orderType);
    setLastPaymentMethod(paymentMethod);
    setLastFutureSale({ ...futureSale });
    setFutureSale({ name: '', address: '', city: '', phone: '', deliveryDate: '' });
    setShowInvoice(true);
    
    if (Platform.OS === 'web') {
      const currentDate = new Date().toLocaleString('en-US', {
        month: 'numeric', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
      });
      
      const itemRows = cart.map(item => `
        <div class="row">
          <div class="item-name">${item.description}</div>
          <div class="item-qty">${item.qty}</div>
          <div class="item-amt">${item.amount.toFixed(2)}</div>
        </div>
      `).join('');

      const resName = restaurantData?.name || 'DATA UDIPI HOTEL';
      const resAddr = restaurantData?.address || 'M G R Nagar, Chennai';
      const resPhone = restaurantData?.phone || '31595014';

      const html = `
        <html>
          <head>
            <style>
              @page { margin: 0; }
              body { font-family: monospace; font-size: 12px; margin: 0; padding: 5px; width: 72mm; color: #000; }
              .center { text-align: center; }
              h1 { font-size: 16px; margin: 5px 0; }
              .divider { border-bottom: 1px dashed #000; margin: 5px 0; }
              .row { display: flex; justify-content: space-between; }
              .item-name { flex: 2; word-break: break-all; padding-right: 5px; }
              .item-qty { width: 30px; text-align: right; }
              .item-amt { width: 60px; text-align: right; }
              .bold { font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="center">
              <h1>${resName}</h1>
              <div>${resAddr}</div>
              <div>Phone: ${resPhone}</div>
              <div class="bold" style="margin-top: 5px;">COUNTER POS</div>
            </div>
            <div class="divider"></div>
            <div class="row">
              <span class="bold">Bill No: ${billNo}</span>
              <span>${currentDate}</span>
            </div>
            <div>
              <span class="bold">Mode: </span>${orderType === 'take-away' ? 'Take Away' : 'Dine In'} | 
              <span class="bold">Pay: </span>${paymentMethod || 'Cash'}
            </div>
            ${futureSale.name ? `<div>Future Sale: ${futureSale.name}</div>` : ''}
            <div class="divider"></div>
            <div class="row bold">
              <div class="item-name">Item</div>
              <div class="item-qty">Qty</div>
              <div class="item-amt">Amt</div>
            </div>
            <div class="divider"></div>
            ${itemRows}
            <div class="divider"></div>
            <div class="row bold" style="font-size: 14px;">
              <span>TOTAL</span>
              <span>₹${totalAmt.toFixed(2)}</span>
            </div>
            <div class="divider"></div>
            <div class="center" style="margin-top: 10px;">Thank you! Visit again.</div>
            <div class="center" style="margin-top: 10px; font-size: 10px;">Techwizard AI partners<br/>vasu@t-wi.com</div>
          </body>
        </html>
      `;

      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(html);
      iframe.contentWindow.document.close();
      iframe.contentWindow.focus();
      setTimeout(() => {
        iframe.contentWindow.print();
        document.body.removeChild(iframe);
      }, 500);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  const filteredItems = menuItems.filter(item => {
    if (selectedCategoryId !== 'All' && item.category_id !== selectedCategoryId) return false;
    const search = descriptionInput.trim().toLowerCase();
    if (search) {
      const matchName = item.name && item.name.toLowerCase().includes(search);
      const matchCode = item.item_code && String(item.item_code).toLowerCase().includes(search);
      const matchId = item.id && String(item.id).toLowerCase().includes(search);
      const matchProductCode = item.product_code && String(item.product_code).toLowerCase().includes(search);
      if (!matchName && !matchCode && !matchId && !matchProductCode) return false;
    }
    return true;
  });

  const totalAmount = cart.reduce((sum, item) => sum + item.amount, 0);

  const updateQty = (id, delta) => {
    setCart(prev => {
      const newCart = prev.map(c => c.id === id ? { ...c, qty: c.qty + delta, amount: (c.qty + delta) * c.rate } : c);
      return newCart.filter(c => c.qty > 0);
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}><Text style={styles.logoText}>DU</Text></View>
          <View>
            <Text style={styles.headerTitle}>Data Udipi Restaurant</Text>
            <Text style={styles.headerSubtitle}>Counter POS - Cashier</Text>
          </View>
        </View>

        <View style={styles.headerCenter}>
          <Text style={styles.billNo}>Bill No: {billNo}</Text>
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.headerDate}>{new Date().toLocaleDateString()} - Items in cart: {cart.length}</Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={16} color="#ef4444" style={{ marginRight: 6 }} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Layout */}
      <View style={[styles.mainLayout, { flexDirection: isTablet ? 'row' : 'column' }]}>
        {/* Left Panel */}
        <View style={[styles.leftPanel, { flex: isTablet ? 7 : 1 }]}>

          <View style={styles.inputStack}>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={orderType} onValueChange={(val) => setOrderType(val)} style={styles.picker}>
                <Picker.Item label="[7] Take Away" value="take-away" />
                <Picker.Item label="[8] Dine In" value="dine-in" />
              </Picker>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder={t("cashier_search_code")}
              value={productCodeInput}
              onChangeText={setProductCodeInput}
              onSubmitEditing={addProductToCart}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={t("cashier_search_item")}
              value={descriptionInput}
              onChangeText={setDescriptionInput}
            />
          </View>

          <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginTop: 12, marginBottom: 4, gap: 12 }}>
            {['All Regions', 'South Indian', 'North Indian'].map(region => {
              const val = region === 'All Regions' ? 'All' : region;
              return (
                <TouchableOpacity 
                  key={region}
                  style={[styles.regionBtn, selectedRegion === val && styles.regionBtnActive]}
                  onPress={() => setSelectedRegion(val)}
                >
                  <Text style={[styles.regionText, selectedRegion === val && styles.regionTextActive]}>
                    {region}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContainer}>
            <TouchableOpacity style={[styles.catBtn, selectedCategoryId === 'All' && styles.catBtnActive]} onPress={() => setSelectedCategoryId('All')} dataSet={{ hover: 'btn' }}>
              <Text style={[styles.catText, selectedCategoryId === 'All' && styles.catTextActive]}>All</Text>
            </TouchableOpacity>
            {categories
              .filter(cat => (selectedRegion === 'All' || cat.description === selectedRegion) && menuItems.some(item => item.category_id === cat.id))
              .map(cat => (
              <TouchableOpacity key={cat.id} style={[styles.catBtn, selectedCategoryId === cat.id && styles.catBtnActive]} onPress={() => setSelectedCategoryId(cat.id)} dataSet={{ hover: 'btn' }}>
                <Text style={[styles.catText, selectedCategoryId === cat.id && styles.catTextActive]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.thText, { width: 80 }]}>{t('cashier_code')}</Text>
              <Text style={[styles.thText, { flex: 1 }]}>{t('cashier_item')}</Text>
              <Text style={[styles.thText, { width: 100, textAlign: 'right', paddingRight: 40 }]}>{t('cashier_price')}</Text>
            </View>
            <FlatList
              data={filteredItems}
              keyExtractor={item => item.id.toString()}
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => (
                <View style={styles.tableRow} dataSet={{ hover: 'nav' }}>
                  <Text style={[styles.tdCode, { width: 80 }]}>{item.item_code || item.id}</Text>
                  <Text style={[styles.tdName, { flex: 1 }]}>{item.name}</Text>
                  <View style={{ width: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <Text style={styles.tdPrice}>₹{(item.price || 0).toFixed(2)}</Text>
                    <TouchableOpacity style={styles.addSquareBtn} onPress={() => addItemToCart(item)} dataSet={{ hover: 'btn' }}>
                      <Text style={styles.addSquareText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          </View>
        </View>

        {/* Right Panel (Cart) */}
        <View style={[styles.rightPanel, { flex: isTablet ? 3 : 1 }]}>
          <View style={styles.cartHeaderTop}>
            <Text style={styles.cartHeaderTitle}>{t('cashier_current_order')}</Text>
            <TouchableOpacity onPress={() => setCart([])} dataSet={{ hover: 'btn' }}>
              <Text style={styles.clearText}>{t('cashier_clear')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cartSubtitle}>{cart.length} lines · {cart.reduce((a, b) => a + b.qty, 0)} items</Text>

          <FlatList
            data={cart}
            keyExtractor={item => item.id.toString()}
            style={{ flex: 1, paddingHorizontal: 24 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.cartRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartRowName}>{item.description}</Text>
                  <Text style={styles.cartRowRate}>₹{item.rate.toFixed(2)}</Text>
                </View>
                <View style={styles.cartRowControls}>
                  <TouchableOpacity style={styles.cartQtyBtn} onPress={() => updateQty(item.id, -1)}><Text>-</Text></TouchableOpacity>
                  <Text style={styles.cartQtyText}>{item.qty}</Text>
                  <TouchableOpacity style={styles.cartQtyBtn} onPress={() => updateQty(item.id, 1)}><Text>+</Text></TouchableOpacity>
                </View>
                <Text style={styles.cartRowTotal}>₹{item.amount.toFixed(2)}</Text>
              </View>
            )}
          />

          <View style={styles.cartFooterArea}>
            <TouchableOpacity style={styles.futureSaleLightBtn} onPress={() => setShowFutureSaleModal(true)} dataSet={{ hover: 'btn' }}>
              <Text style={styles.futureSaleLightText}>+ Future Sale</Text>
            </TouchableOpacity>
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>{t('cashier_subtotal')}</Text>
              <Text style={styles.subtotalValue}>₹{totalAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRowFixed}>
              <Text style={styles.totalLabelFixed}>{t('cashier_total')}</Text>
              <Text style={styles.totalValueFixed}>₹{totalAmount.toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.chargeBtnDark} onPress={handleCheckout} dataSet={{ hover: 'btn' }}>
              <Text style={styles.chargeBtnDarkText}>Charge ₹{totalAmount.toFixed(2)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <InvoiceModal 
        show={showInvoice} 
        setShow={setShowInvoice} 
        lastBillNo={lastBillNo} 
        lastOrderType={lastOrderType} 
        lastPaymentMethod={lastPaymentMethod} 
        lastFutureSale={lastFutureSale} 
        lastCart={lastCart} 
        lastBillAmt={lastBillAmt}
        restaurantData={restaurantData}
      />
      <FutureSaleModal show={showFutureSaleModal} setShow={setShowFutureSaleModal} futureSale={futureSale} setFutureSale={setFutureSale} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', overflow: 'hidden', height: '100vh', maxHeight: '100vh', minHeight: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  logoBox: { width: 32, height: 32, backgroundColor: '#f3f4f6', borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  logoText: { fontWeight: 'bold', color: '#6b7280', fontSize: 14 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  headerSubtitle: { fontSize: 12, color: '#6b7280' },
  headerCenter: { flex: 1, alignItems: 'center' },
  billNo: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  headerRight: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  headerDate: { fontSize: 13, color: '#6b7280', marginRight: 16 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, cursor: 'pointer' },
  logoutText: { color: '#ef4444', fontWeight: '500', fontSize: 13 },

  mainLayout: { flex: 1, flexDirection: 'row', minHeight: 0 },
  leftPanel: { flex: 7, backgroundColor: '#ffffff', paddingHorizontal: 32, paddingTop: 24, paddingBottom: 0, borderRightWidth: 1, borderColor: '#e5e7eb', minHeight: 0 },

  inputStack: { gap: 16, marginBottom: 24 },
  pickerWrapper: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, backgroundColor: '#fff', height: 48, justifyContent: 'center', width: '30%' },
  picker: { height: 48, borderWidth: 0, outlineStyle: 'none', backgroundColor: 'transparent', paddingHorizontal: 16 },
  searchInput: { height: 48, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, paddingHorizontal: 16, fontSize: 14, backgroundColor: '#fff', outlineStyle: 'none' },

  categoryScroll: { flexGrow: 0, marginTop: 8, marginBottom: 16 },
  categoryContainer: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  regionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  regionBtnActive: { backgroundColor: '#ff6b35', borderColor: '#ff6b35' },
  regionText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  regionTextActive: { color: 'white' },
  catBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: {width:0, height:1}, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  catBtnActive: { backgroundColor: '#f3f4f6', borderColor: '#d1d5db' },
  catText: { fontSize: 13, color: '#111827', fontWeight: '500' },
  catTextActive: { fontWeight: '600' },

  tableContainer: { flex: 1, borderTopWidth: 1, borderColor: '#e5e7eb', minHeight: 0 },
  tableHeader: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  thText: { fontSize: 11, fontWeight: '600', color: '#6b7280', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  tdCode: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  tdName: { fontSize: 14, color: '#111827', fontWeight: '500' },
  tdPrice: { fontSize: 14, color: '#6b7280', marginRight: 16 },
  addSquareBtn: { width: 32, height: 32, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', cursor: 'pointer' },
  addSquareText: { fontSize: 18, color: '#111827', marginTop: -2 },

  rightPanel: { flex: 3, backgroundColor: '#ffffff', flexDirection: 'column', minHeight: 0 },
  cartHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 32 },
  cartHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  clearText: { fontSize: 13, color: '#6b7280', cursor: 'pointer' },
  cartSubtitle: { fontSize: 13, color: '#6b7280', paddingHorizontal: 24, marginTop: 4, marginBottom: 24 },

  cartRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  cartRowName: { fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 4 },
  cartRowRate: { fontSize: 14, color: '#6b7280' },
  cartRowControls: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4, padding: 4, marginRight: 16 },
  cartQtyBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  cartQtyText: { fontSize: 14, fontWeight: '500', minWidth: 20, textAlign: 'center' },
  cartRowTotal: { fontSize: 13, color: '#6b7280', width: 60, textAlign: 'right' },

  cartFooterArea: { padding: 24, borderTopWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  futureSaleLightBtn: { backgroundColor: '#f3f4f6', paddingVertical: 12, borderRadius: 6, alignItems: 'center', marginBottom: 24, cursor: 'pointer' },
  futureSaleLightText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  subtotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  subtotalLabel: { fontSize: 13, color: '#6b7280' },
  subtotalValue: { fontSize: 13, fontWeight: '500', color: '#111827' },
  totalRowFixed: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  totalLabelFixed: { fontSize: 18, fontWeight: '700', color: '#111827' },
  totalValueFixed: { fontSize: 18, fontWeight: '700', color: '#111827' },
  chargeBtnDark: { backgroundColor: '#1f2937', paddingVertical: 16, borderRadius: 6, alignItems: 'center', cursor: 'pointer' },
  chargeBtnDarkText: { color: '#ffffff', fontSize: 16, fontWeight: '600' }
});
