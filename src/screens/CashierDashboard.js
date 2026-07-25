import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, StyleSheet, Alert, Dimensions } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { menuService } from '../services/api';
import api from '../services/api';
import { LogOut, Trash2 } from 'lucide-react-native';
import InvoiceModal from '../components/cashier/InvoiceModal';
import FutureSaleModal from '../components/cashier/FutureSaleModal';
import { Picker } from '@react-native-picker/picker';

const { width } = Dimensions.get('window');
const isTablet = width > 600;

export default function CashierDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('All');
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

  useEffect(() => {
    if (!user || !user.restaurant_id) return;
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
      const item = menuItems.find(i => String(i.item_code).toLowerCase() === code);
      if (item) {
        addItemToCart(item);
        setProductCodeInput('');
      } else {
        Alert.alert("Not Found", "Item code not found");
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
      if (!matchName && !matchCode) return false;
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
          <Text style={styles.headerTitle}>Data Udipi POS</Text>
          <Text style={styles.headerSubtitle}>Cashier</Text>
        </View>
        <Text style={styles.billNo}>Bill No: {billNo}</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={16} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.mainLayout, { flexDirection: isTablet ? 'row' : 'column' }]}>
        {/* Left Panel */}
        <View style={[styles.leftPanel, { flex: isTablet ? 3 : 1 }]}>
          <View style={styles.controlsRow}>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={orderType} onValueChange={(val) => setOrderType(val)} style={{ height: 40, border: 'none', outline: 'none' }}>
                <Picker.Item label="Take Away" value="take-away" />
                <Picker.Item label="Dine In" value="dine-in" />
              </Picker>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Item Code"
              value={productCodeInput}
              onChangeText={setProductCodeInput}
              onSubmitEditing={addProductToCart}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              value={descriptionInput}
              onChangeText={setDescriptionInput}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            <TouchableOpacity style={[styles.catBtn, selectedCategoryId === 'All' && styles.catBtnActive]} onPress={() => setSelectedCategoryId('All')}>
              <Text style={selectedCategoryId === 'All' ? styles.catTextActive : styles.catText}>All</Text>
            </TouchableOpacity>
            {categories.map(cat => (
              <TouchableOpacity key={cat.id} style={[styles.catBtn, selectedCategoryId === cat.id && styles.catBtnActive]} onPress={() => setSelectedCategoryId(cat.id)}>
                <Text style={selectedCategoryId === cat.id ? styles.catTextActive : styles.catText}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FlatList
            data={filteredItems}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.itemRow} onPress={() => addItemToCart(item)}>
                <Text style={styles.itemCode}>{item.item_code}</Text>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={styles.itemPriceCol}>
                  <Text style={styles.itemPrice}>₹{item.price}</Text>
                  <View style={styles.addBtn}><Text style={{ color: 'white' }}>+</Text></View>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Right Panel (Cart) */}
        <View style={[styles.rightPanel, { flex: isTablet ? 2 : 1 }]}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Current Order ({cart.length})</Text>
            <TouchableOpacity onPress={() => setCart([])}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={cart}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.cartItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartItemName}>{item.description}</Text>
                  <Text style={styles.cartItemRate}>₹{item.rate.toFixed(2)}</Text>
                </View>
                <View style={styles.qtyControls}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.id, -1)}><Text>-</Text></TouchableOpacity>
                  <Text style={styles.qtyText}>{item.qty}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.id, 1)}><Text>+</Text></TouchableOpacity>
                </View>
                <Text style={styles.cartItemTotal}>₹{item.amount.toFixed(2)}</Text>
              </View>
            )}
          />

          <View style={styles.cartFooter}>
            <TouchableOpacity style={styles.futureSaleBtn} onPress={() => setShowFutureSaleModal(true)}>
              <Text>+ Future Sale</Text>
            </TouchableOpacity>
            <View style={styles.summaryRow}>
              <Text style={styles.totalText}>Total</Text>
              <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.chargeBtn} onPress={handleCheckout}>
              <Text style={styles.chargeBtnText}>Charge ₹{totalAmount.toFixed(2)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <InvoiceModal
        show={showInvoice} setShow={setShowInvoice}
        lastBillNo={lastBillNo} lastOrderType={lastOrderType} lastPaymentMethod={lastPaymentMethod}
        lastFutureSale={lastFutureSale} lastCart={lastCart} lastBillAmt={lastBillAmt}
      />
      <FutureSaleModal show={showFutureSaleModal} setShow={setShowFutureSaleModal} futureSale={futureSale} setFutureSale={setFutureSale} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: 'gray' },
  billNo: { fontSize: 24, fontWeight: 'bold' },
  logoutBtn: { flexDirection: 'row', backgroundColor: '#fee2e2', padding: 10, borderRadius: 8, alignItems: 'center', gap: 5, cursor: 'pointer' },
  logoutText: { color: '#ef4444', fontWeight: 'bold' },
  mainLayout: { flex: 1 },
  leftPanel: { backgroundColor: '#fff', margin: 10, borderRadius: 8, padding: 10 },
  controlsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  pickerContainer: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, justifyContent: 'center' },
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, outlineStyle: 'none' },
  categoryScroll: { maxHeight: 50, marginBottom: 10 },
  catBtn: { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: '#f3f4f6', borderRadius: 20, marginRight: 10, cursor: 'pointer' },
  catBtnActive: { backgroundColor: '#3b82f6' },
  catText: { color: 'gray' },
  catTextActive: { color: 'white', fontWeight: 'bold' },
  itemRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center', cursor: 'pointer' },
  itemCode: { width: 60, fontWeight: 'bold', color: 'gray' },
  itemName: { flex: 1, fontSize: 16 },
  itemPriceCol: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemPrice: { fontWeight: 'bold' },
  addBtn: { backgroundColor: '#3b82f6', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  rightPanel: { backgroundColor: '#fff', margin: 10, borderRadius: 8, padding: 10 },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, paddingBottom: 10, marginBottom: 10 },
  cartTitle: { fontSize: 18, fontWeight: 'bold' },
  clearText: { color: '#ef4444', cursor: 'pointer' },
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' },
  cartItemName: { fontWeight: 'bold' },
  cartItemRate: { color: 'gray' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
  qtyBtn: { backgroundColor: '#f3f4f6', width: 30, height: 30, justifyContent: 'center', alignItems: 'center', borderRadius: 15, cursor: 'pointer' },
  qtyText: { marginHorizontal: 10, fontWeight: 'bold' },
  cartItemTotal: { width: 70, textAlign: 'right', fontWeight: 'bold' },
  cartFooter: { paddingTop: 10, borderTopWidth: 1, borderColor: '#eee' },
  futureSaleBtn: { backgroundColor: '#e5e7eb', padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 10, cursor: 'pointer' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  totalText: { fontSize: 20, fontWeight: 'bold' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  chargeBtn: { backgroundColor: '#10b981', padding: 15, borderRadius: 8, alignItems: 'center', cursor: 'pointer' },
  chargeBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
