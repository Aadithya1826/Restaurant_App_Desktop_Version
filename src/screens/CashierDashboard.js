import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, StyleSheet, Alert, useWindowDimensions, Platform, BackHandler, PanResponder, Dimensions } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { menuService, restaurantService } from '../services/api';
import api from '../services/api';
import { backupData } from '../services/offlineSync';
import { LogOut, Trash2 } from 'lucide-react-native';
import InvoiceModal from '../components/cashier/InvoiceModal';
import FutureSaleModal from '../components/cashier/FutureSaleModal';
import OrderHistoryModal from '../components/cashier/OrderHistoryModal';
import DateRangeModal from '../components/cashier/DateRangeModal';
import VoiceWidget from '../components/VoiceWidget';
import { Picker } from '@react-native-picker/picker';

export default function CashierDashboard({ navigation }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 1024;
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);

  const [leftFlex, setLeftFlex] = useState(7);
  const [rightFlex, setRightFlex] = useState(3);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        const { width } = Dimensions.get('window');
        const percentage = gestureState.moveX / width;
        if (percentage > 0.4 && percentage < 0.8) {
           const left = percentage * 10;
           const right = 10 - left;
           setLeftFlex(left);
           setRightFlex(right);
        }
      },
    })
  ).current;

  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('All');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [productCodeInput, setProductCodeInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [lastAddedItemId, setLastAddedItemId] = useState(null);

  const [billNo, setBillNo] = useState(() => {
    const saved = localStorage.getItem('last_bill_no');
    return saved ? parseInt(saved) : 1;
  });
  const [lastBillNo, setLastBillNo] = useState(0);
  const [lastBillAmt, setLastBillAmt] = useState(0);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showFutureSaleModal, setShowFutureSaleModal] = useState(false);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [dateRangeReportType, setDateRangeReportType] = useState('items');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  const [orderType, setOrderType] = useState('take-away');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [futureSale, setFutureSale] = useState({ name: '', address: '', city: '', phone: '', deliveryDate: '', deliveryTime: '' });

  const [lastOrderType, setLastOrderType] = useState('take-away');
  const [lastFutureSale, setLastFutureSale] = useState(null);
  const [lastPaymentMethod, setLastPaymentMethod] = useState('');
  const [lastCart, setLastCart] = useState([]);
  const [restaurantData, setRestaurantData] = useState(null);
  const [printFutureBills, setPrintFutureBills] = useState(false);
  const [extraCharge, setExtraCharge] = useState('');
  const extraChargeRef = useRef(null);

  const productCodeRef = useRef(null);
  const descriptionRef = useRef(null);
  const spacePressTimer = useRef(null);
  const lastSpaceTime = useRef(0);
  const isProcessingRef = useRef(false);
  const cartInputRefs = useRef({});

  useEffect(() => {
    if (lastAddedItemId && cartInputRefs.current[lastAddedItemId]) {
      setTimeout(() => {
        cartInputRefs.current[lastAddedItemId]?.focus();
        setLastAddedItemId(null);
      }, 50);
    }
  }, [lastAddedItemId, cart]);

  useEffect(() => {
    if (!user || !user.restaurant_id) return;
    
    restaurantService.getPublicRestaurants()
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.data || []);
        const current = list.find(r => String(r.id) === String(user.restaurant_id));
        if (current) setRestaurantData(current);
      })
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
    const backAction = () => {
      if (showInvoice) { setShowInvoice(false); return true; }
      if (showFutureSaleModal) { setShowFutureSaleModal(false); return true; }
      if (showOrderHistory) { setShowOrderHistory(false); return true; }
      if (showDateRangeModal) { setShowDateRangeModal(false); return true; }
      
      Alert.alert('Exit App', 'Are you sure you want to exit?', [
        { text: 'Cancel', onPress: () => null, style: 'cancel' },
        { text: 'YES', onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [showInvoice, showFutureSaleModal, showOrderHistory, showDateRangeModal]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key === '7') {
        e.preventDefault();
        setOrderType('take-away');
      }
      if (e.altKey && e.key === '8') {
        e.preventDefault();
        setOrderType('dine-in');
      }
      if (e.key === 'F1') {
        e.preventDefault();
        e.stopPropagation();
        setOrderType(prev => prev === 'dine-in' ? 'take-away' : 'dine-in');
      }
      if (e.key === 'F5') {
        e.preventDefault();
        e.stopPropagation();
        setShowFutureSaleModal(true);
      }
      if (e.key === 'F2') {
        e.preventDefault();
        e.stopPropagation();
        setCart(prev => prev.length > 0 ? prev.slice(0, prev.length - 1) : []);
      }
      if (e.key === 'F3') {
        e.preventDefault();
        e.stopPropagation();
        setCart([]);
      }
      if (e.key === 'F4') {
        e.preventDefault();
        e.stopPropagation();
        setPrintFutureBills(prev => !prev);
      }
      if (e.key === 'F8') {
        e.preventDefault();
        e.stopPropagation();
        extraChargeRef.current?.focus();
      }
      if (e.key === 'F9') {
        e.preventDefault();
        e.stopPropagation();
        handlePrintItemCodes();
      }
      if (e.key === 'F10') {
        e.preventDefault();
        e.stopPropagation();
        handlePrintReport('hourly');
      }
      if (e.key === 'F11') {
        e.preventDefault();
        e.stopPropagation();
        handlePrintReport('items');
      }
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        setDateRangeReportType('items');
        setShowDateRangeModal(true);
      }

      const activeEl = document.activeElement;
      let currentZone = activeEl && activeEl.dataset ? parseInt(activeEl.dataset.zone) : NaN;
      let currentIndex = activeEl && activeEl.dataset ? parseInt(activeEl.dataset.index) : NaN;

      if (productCodeRef.current?.isFocused()) { currentZone = 1; currentIndex = 0; }
      else if (descriptionRef.current?.isFocused()) { currentZone = 2; currentIndex = 0; }
      else if (activeEl && activeEl.tagName === 'SELECT') { currentZone = 0; currentIndex = 0; }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!isNaN(currentZone)) {
          e.preventDefault();
          let targetZone = e.key === 'ArrowDown' ? currentZone + 1 : currentZone - 1;
          let targetIndex = 0;

          if (currentZone === 5 && targetZone === 6) targetZone = 5; // clamp bottom
          
          if (currentZone === 5 && targetZone === 5) {
             targetIndex = e.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;
             if (targetIndex < 0) {
               targetZone = 4;
               targetIndex = 0;
             }
          }

          if (targetZone === 0) {
             const selectEl = document.querySelector('select');
             if (selectEl) selectEl.focus();
          } else if (targetZone === 1) {
             productCodeRef.current?.focus();
          } else if (targetZone === 2) {
             descriptionRef.current?.focus();
          } else {
             let targetElement = document.querySelector(`[data-zone="${targetZone}"][data-index="${targetIndex}"]`);
             if (!targetElement) targetElement = document.querySelector(`[data-zone="${targetZone}"][data-index="0"]`);
             if (targetElement) targetElement.focus();
          }
        } else if (isNaN(currentZone) && e.key === 'ArrowDown') {
          // If body is focused, start from zone 1
          e.preventDefault();
          productCodeRef.current?.focus();
        }
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (!isNaN(currentZone) && currentZone >= 3 && activeEl.tagName !== 'SELECT') {
          e.preventDefault();
          let targetIndex = e.key === 'ArrowRight' ? currentIndex + 1 : currentIndex - 1;
          let targetElement = document.querySelector(`[data-zone="${currentZone}"][data-index="${targetIndex}"]`);
          if (targetElement) targetElement.focus();
        }
      }

      if (e.key === ' ') {
        if (showFutureSaleModal || showInvoice) return;
        const activeEl = document.activeElement;
        const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
        const isSearchItem = isInput && activeEl.placeholder === t("cashier_search_item");
        
        if (!isInput || !isSearchItem) {
          e.preventDefault();
          e.stopPropagation();
          const now = Date.now();
          if (now - lastSpaceTime.current < 400) {
            clearTimeout(spacePressTimer.current);
            lastSpaceTime.current = 0;
            if (cart.length > 0 && !showInvoice && !showFutureSaleModal) {
              setShowFutureSaleModal(true);
            }
          } else {
            lastSpaceTime.current = now;
            spacePressTimer.current = setTimeout(() => {
              if (lastSpaceTime.current === now) {
                if (cart.length > 0 && !showInvoice && !showFutureSaleModal) {
                  handleCheckout();
                }
                lastSpaceTime.current = 0;
              }
            }, 400);
          }
        }
      }

      if (e.key === 'Enter') {
        if (activeEl && activeEl.tagName === 'SELECT') {
          e.preventDefault();
          productCodeRef.current?.focus();
        }
      }
    };
    if (Platform.OS === 'web') {
      window.addEventListener('keydown', handleKeyDown, true);
      return () => window.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [cart, showInvoice, showFutureSaleModal, orderType, paymentMethod, futureSale]);

  const addItemToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, qty: (parseFloat(c.qty) || 0) + 1, amount: ((parseFloat(c.qty) || 0) + 1) * c.rate } : c);
      }
      return [...prev, {
        id: item.id,
        product_code: item.item_code || item.id,
        description: item.name || 'Unknown',
        rate: item.price || 0,
        qty: 1,
        amount: item.price || 0,
        category_id: item.category_id
      }];
    });
    setLastAddedItemId(item.id);
  };

  const handleQtyTextChange = (id, val) => {
    // Allow valid decimal strings (e.g. "1", "1.", "1.5")
    if (val === '' || val === '.') {
      setCart(prev => prev.map(item => item.id === id ? { ...item, qty: val, amount: 0 } : item));
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setCart(prev => prev.map(item => item.id === id ? { ...item, qty: val, amount: num * item.rate } : item));
    }
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
    }
  };

  const handleVoiceCommand = (toolName, toolResult) => {
    if (toolName === 'add_to_cart_cashier' && toolResult?.items) {
      setCart(prevCart => {
        let newCart = [...prevCart];
        toolResult.items.forEach(voiceItem => {
          const menuMatch = menuItems.find(m => 
            m.name.toLowerCase() === voiceItem.name.toLowerCase() || 
            m.name.toLowerCase().includes(voiceItem.name.toLowerCase())
          );
          if (menuMatch) {
            const existing = newCart.find(c => c.id === menuMatch.id);
            if (existing) {
              existing.qty = parseFloat(existing.qty) + voiceItem.quantity;
              existing.amount = existing.qty * existing.rate;
            } else {
              const price = parseFloat(menuMatch.price) || 0;
              newCart.push({
                id: menuMatch.id,
                product_code: menuMatch.item_code || menuMatch.id,
                description: menuMatch.name || menuMatch.description || 'Unknown Item',
                rate: price,
                qty: voiceItem.quantity,
                amount: price * voiceItem.quantity,
                pref: ''
              });
            }
          } else {
            Alert.alert('Item Not Found', `Item "${voiceItem.name}" not found in menu.`);
          }
        });
        return newCart;
      });
    } else if (toolName === 'print_cashier_bill') {
      handleCheckout();
    } else if (toolName === 'print_future_bill') {
      setFutureSale({ name: 'Future Order', address: '', city: '', phone: '', deliveryDate: '' });
      setShowFutureSaleModal(true);
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    const totalAmt = cart.reduce((sum, item) => sum + item.amount, 0);
    const extraNum = parseFloat(extraCharge) || 0;
    const finalTotal = totalAmt + extraNum;

    const payload = {
      order_type: orderType === 'take-away' ? 'TAKEAWAY' : orderType === 'delivery' ? 'DELIVERY' : 'DINE_IN',
      table_number: orderType === 'take-away' ? 'takeaway' : '1',
      payment_method: paymentMethod,
      cart: cart.filter(c => c.qty && !isNaN(parseFloat(c.qty)) && parseFloat(c.qty) > 0).map(c => ({ id: c.id, quantity: parseFloat(c.qty), price: c.rate })),
      subtotal: totalAmt,
      gst: 0,
      service_charge: 0,
      total_amount: finalTotal,
      customer_name: orderType === 'delivery' ? futureSale.name : undefined,
      customer_phone: orderType === 'delivery' ? futureSale.phone : undefined,
      delivery_address: orderType === 'delivery' ? futureSale.address : undefined,
      delivery_city: orderType === 'delivery' ? futureSale.city : undefined,
      timestamp: new Date().toISOString(),
      bill_no: billNo,
    };

    const dateStr = new Date().toISOString().split('T')[0];
    backupData('Cashier', 'Receipts', `Receipt_${billNo}_${dateStr}.json`, payload);

    api.post(`/api/v1/orders?restaurant_id=${user?.restaurant_id}`, payload)
      .then(res => Alert.alert("Success", "Order placed successfully"))
      .catch(err => Alert.alert("Error", "Failed to place order"));

    setLastBillNo(billNo);
    setLastBillAmt(finalTotal);
    setBillNo(prev => {
      const next = prev + 1;
      localStorage.setItem('last_bill_no', next.toString());
      return next;
    });
    setLastCart([...cart]);
    setCart([]);
    setLastOrderType(orderType);
    setLastPaymentMethod(paymentMethod);
    setLastFutureSale({ ...futureSale });
    setFutureSale({ name: '', address: '', city: '', phone: '', deliveryDate: '', deliveryTime: '' });
    setExtraCharge('');
    

    if (Platform.OS === 'web') {
      const currentDate = new Date().toLocaleString('en-US', {
        month: 'numeric', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
      });
      const resName = restaurantData?.name || 'DATA UDIPI HOTEL';
      const resAddr = restaurantData?.address || 'M G R Nagar, Chennai';
      const resPhone = resName.toLowerCase().includes('mugalivakkam') ? '+91 95970 66563' : (restaurantData?.phone || '31595014');

      const tandooriItems = cart.filter(item => {
        if (!item.qty || isNaN(parseFloat(item.qty)) || parseFloat(item.qty) <= 0) return false;
        if (item.description.toLowerCase().includes('tandoori')) return true;
        const cat = categories.find(c => c.id === item.category_id);
        if (cat && cat.name.toLowerCase().includes('tandoori')) return true;
        return false;
      });
      
      let kotHtml = '';
      if (tandooriItems.length > 0) {
        const kotRows = tandooriItems.map(item => `
          <div class="row">
            <div class="item-name">${item.description}</div>
            <div class="item-qty">${item.qty}</div>
          </div>
        `).join('');
        
        kotHtml = `
          <div class="center">
            <h1>KOT</h1>
            <div class="bold" style="margin-top: 5px;">TANDOORI SECTION</div>
          </div>
          <div class="divider"></div>
          <div class="row">
            <span class="bold">Bill No: ${billNo}</span>
            <span>${currentDate}</span>
          </div>
          <div>
            <span class="bold">Mode: </span>${orderType === 'take-away' ? 'Take Away' : orderType === 'delivery' ? 'Delivery' : 'Dine In'}
          </div>
          <div class="divider"></div>
          <div class="row bold">
            <div class="item-name">Item</div>
            <div class="item-qty">Qty</div>
          </div>
          <div class="divider"></div>
          ${kotRows}
          <div class="divider"></div>
          <div style="page-break-after: always;"></div>
        `;
      }

      const billHtml = `
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
              <span class="bold">Mode: </span>${orderType === 'take-away' ? 'Take Away' : orderType === 'delivery' ? 'Delivery' : 'Dine In'} | 
              <span class="bold">Pay: </span>${paymentMethod || 'Cash'}
            </div>
            ${futureSale.name ? `<div><span class="bold">Future Sale:</span> ${futureSale.name}</div>` : ''}
            ${futureSale.phone ? `<div><span class="bold">Phone:</span> ${futureSale.phone}</div>` : ''}
            ${futureSale.address ? `<div><span class="bold">Address:</span> ${futureSale.address}</div>` : ''}
            ${futureSale.deliveryDate ? `<div><span class="bold">Del. Date:</span> ${futureSale.deliveryDate}</div>` : ''}
            ${futureSale.deliveryTime ? `<div><span class="bold">Del. Time:</span> ${futureSale.deliveryTime}</div>` : ''}
            <div class="divider"></div>
            <div class="row bold">
              <div class="item-name">Item</div>
              <div class="item-qty">Qty</div>
              <div class="item-amt">Amt</div>
            </div>
            <div class="divider"></div>
            ${cart.filter(c => c.qty && parseFloat(c.qty) > 0).map(item => `
              <div class="row">
                <div class="item-name">${item.description}</div>
                <div class="item-qty">${item.qty}</div>
                <div class="item-amt">${item.amount.toFixed(2)}</div>
              </div>
            `).join('')}
            <div class="divider"></div>
            ${extraNum > 0 ? `
              <div class="row">
                <div class="item-name">EXTRA CHARGES</div>
                <div class="item-qty"></div>
                <div class="item-amt">${extraNum.toFixed(2)}</div>
              </div>
              <div class="divider"></div>
            ` : ''}
            <div class="row bold" style="font-size: 16px; margin-top: 5px; transform: scaleY(1.3); margin-bottom: 6px;">
              <span>TOTAL</span>
              <span>₹${finalTotal.toFixed(2)}</span>
            </div>
            <div class="divider"></div>
            <div class="center" style="margin-top: 10px;">Thank you! Visit again.</div>
            <div class="center" style="margin-top: 10px; font-size: 10px;">Techwizard AI partners<br/>hello@t-wi.com</div>
      `;

      const printJobs = [];
      if (kotHtml) printJobs.push(kotHtml);
      if (billHtml) printJobs.push(billHtml);
      if (printFutureBills) {
        printJobs.push(`
            <div class="center bold" style="font-size: 14px; margin-bottom: 10px;">HOTEL COPY</div>
            ${billHtml}
        `);
      }

      const makeHtml = (bodyContent) => `
        <html>
          <head>
            <style>
              @page { margin: 0; }
              body { font-family: monospace; font-size: 13px; margin: 0; padding: 0 5px 0 10px; width: 100%; max-width: 68mm; box-sizing: border-box; color: #000; font-weight: bold; }
              .center { text-align: center; }
              h1 { font-size: 16px; margin: 5px 0; font-weight: 900; }
              .divider { border-bottom: 1px dashed #000; margin: 5px 0; }
              .row { display: flex; justify-content: space-between; transform: scaleY(1.2); transform-origin: top left; margin-bottom: 4px; }
              .item-name { flex: 1; word-break: break-word; padding-right: 5px; text-transform: uppercase; }
              .item-qty { width: 40px; text-align: center; }
              .item-amt { width: 65px; text-align: right; }
              .bold { font-weight: bold; }
            </style>
          </head>
          <body>
            ${bodyContent}
          </body>
        </html>
      `;

      if (window.electronAPI && window.electronAPI.printSilent) {
        const executePrints = async () => {
          for (const bodyContent of printJobs) {
            await window.electronAPI.printSilent(makeHtml(bodyContent));
            // wait a little bit between jobs to ensure order and spooler processing
            await new Promise(r => setTimeout(r, 500));
          }
          setTimeout(() => {
            productCodeRef.current?.focus();
          }, 100);
        };
        executePrints();
      } else {
        const combinedBody = printJobs.join('<div style="page-break-after: always;"></div>');
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(makeHtml(combinedBody));
        iframe.contentWindow.document.close();
        iframe.contentWindow.focus();
        setTimeout(() => {
          iframe.contentWindow.print();
          document.body.removeChild(iframe);
          setTimeout(() => {
            productCodeRef.current?.focus();
          }, 100);
        }, 500);
      }
    }

    setTimeout(() => {
      isProcessingRef.current = false;
    }, 2000);
  };

  const handleShowHistoryBill = (order) => {
    setLastBillNo(order.order_id);
    let type = 'dine-in';
    if (!order.table_number || order.table_number.toLowerCase().includes('takeaway')) {
      type = 'take-away';
    }
    setLastOrderType(type);
    setLastPaymentMethod(order.payment_method);
    setLastFutureSale(null);
    const mappedCart = (order.items || []).map(item => ({
      description: item.name,
      qty: item.quantity,
      amount: item.price
    }));
    setLastCart(mappedCart);
    setLastBillAmt(order.total_amount);
    setShowInvoice(true);
  };

  const handlePrintReport = async (type, startDate, endDate) => {
    try {
      let data;
      let params = `restaurant_id=${user?.restaurant_id || ''}`;
      if (startDate && endDate) {
          params += `&start_date=${startDate}&end_date=${endDate}`;
      }
      if (type === 'hourly') {
        const res = await api.get(`/api/v1/reports/hourly?${params}`);
        data = res.data;
      } else {
        const res = await api.get(`/api/v1/reports/items?${params}`);
        data = res.data;
      }

      let tableRows = '';
      if (type === 'hourly') {
        tableRows = (data.timeline || []).filter(t => Math.round(t.sales) > 0).map(t => `
          <div class="row">
            <span>${t.time}</span>
            <span>${Math.round(t.sales)}</span>
          </div>
        `).join('');
      } else {
        tableRows = (data.items || []).map(item => `
          <div class="item-row">
            <span class="item-name">${item.name}</span>
            <span class="item-qty">${Number(item.qty)}</span>
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
              body { font-family: monospace; font-size: 12px; margin: 0; padding: 0 5px 0 10px; width: 100%; max-width: 68mm; box-sizing: border-box; color: #000; }
              .header { text-align: center; margin-bottom: 10px; }
              .header h1 { font-size: 16px; margin: 0 0 5px 0; text-transform: uppercase; font-weight: 900; }
              .header p { margin: 0 0 4px 0; text-transform: uppercase; }
              .row { display: flex; justify-content: space-between; transform: scaleY(1.2); transform-origin: top left; margin-bottom: 6px; }
              .item-row { display: flex; justify-content: space-between; transform: scaleY(1.2); transform-origin: top left; margin-bottom: 6px; }
              .item-name { flex: 1; word-break: break-word; padding-right: 5px; text-transform: uppercase; }
              .item-qty { width: 40px; text-align: center; }
              .item-amt { width: 65px; text-align: right; }
              .total-row { border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; transform: scaleY(1.3); transform-origin: top left; margin-bottom: 6px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${(data.restaurant && data.restaurant.name) || 'DATAUDIPI HOTEL'}</h1>
              <p>${(data.restaurant && data.restaurant.address) || 'MUGALIVAKKAM, CHENNAI'}</p>
              <p>PH:${(data.restaurant && data.restaurant.phone) || '9597066563'} GSTIN: ${(data.restaurant && data.restaurant.gstin) || '33ADLPV4810B3ZQ'}</p>
              <h2 style="font-size: 14px; margin: 10px 0 5px 0;">${type === 'hourly' ? 'HOURLY REPORT' : 'ITEM WISE REPORT'}</h2>
              <div style="text-align: left; margin-top: 10px;">
                ${type === 'hourly' 
                  ? `<p>Date: ${data.date}</p>` 
                  : `<p>Print Date: ${data.date}</p><p>Bills From: ${data.date}</p><p>To: ${data.date}</p>`}
                <p>Starting BillNo: ${(data.starting_bill && data.starting_bill.no) || '-'} - ${(data.starting_bill && data.starting_bill.time) || '-'}</p>
                <p>Ending BillNo: ${(data.ending_bill && data.ending_bill.no) || '-'} - ${(data.ending_bill && data.ending_bill.time) || '-'}</p>
              </div>
            </div>
            
            ${itemHeader}
            ${tableRows}
            
            <div class="total-row">
              <span>TOTAL SALES</span>
              <span>${data.total_sales ? data.total_sales.toFixed(2) : '0.00'}</span>
            </div>
          </body>
        </html>
      `;

      if (window.electronAPI && window.electronAPI.printSilent) {
        window.electronAPI.printSilent(printContent).then(() => {
          setTimeout(() => { productCodeRef.current?.focus(); }, 100);
        });
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
        }, 500);
      }
    } catch (e) {
      alert("Failed to print report.");
    }
  };

  const handlePrintItemCodes = () => {
    if (!menuItems || menuItems.length === 0) {
      alert("No items in menu to print");
      return;
    }

    const currentDate = new Date().toLocaleString('en-US', {
      month: 'numeric', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
    });

    const resName = restaurantData?.name || 'DATA UDIPI HOTEL';
    const resAddr = restaurantData?.address || 'M G R Nagar, Chennai';
    const resPhone = resName.toLowerCase().includes('mugalivakkam') ? '+91 95970 66563' : (restaurantData?.phone || '31595014');

    const itemRows = menuItems.map(item => `
      <div class="row">
        <div class="item-name">${item.name || 'Unknown'}</div>
        <div class="item-code">${item.item_code || ''}</div>
      </div>
    `).join('');

    const html = `
      <html>
        <head>
          <style>
            @page { margin: 0; }
            body { font-family: monospace; font-size: 12px; margin: 0; padding: 0 5px 0 10px; width: 100%; max-width: 68mm; box-sizing: border-box; color: #000; }
            .center { text-align: center; }
            h1 { font-size: 16px; margin: 5px 0; font-weight: 900; }
            h2 { font-size: 14px; margin: 10px 0 5px 0; }
            .divider { border-bottom: 1px dashed #000; margin: 5px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .item-name { flex: 1; word-break: break-word; padding-right: 5px; text-transform: uppercase; }
            .item-code { width: 40px; text-align: right; font-weight: bold; }
            .bold { font-weight: bold; }
            .footer { margin-top: 10px; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="center">
            <h1>${resName}</h1>
            <div style="font-size: 11px;">${resAddr.replace(/,/g, ',<br>')}</div>
            <div style="font-size: 11px;">PH:${resPhone}</div>
            <h2>MENU ITEM CODES</h2>
          </div>
          <div class="divider"></div>
          <div class="row bold">
            <span>PRINT DATE:</span>
            <span>${currentDate.split(',')[0]}</span>
          </div>
          <div class="divider"></div>
          <div class="row bold">
            <div class="item-name">Item Name</div>
            <div class="item-code">Code</div>
          </div>
          <div class="divider"></div>
          ${itemRows}
          <div class="divider"></div>
          <div class="center footer">
            Techwizard AI partners<br>hello@t-wi.com
          </div>
        </body>
      </html>
    `;

    if (window.electronAPI && window.electronAPI.printSilent) {
      window.electronAPI.printSilent(html).then(() => {
        setTimeout(() => { productCodeRef.current?.focus(); }, 100);
      });
    } else {
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
        setTimeout(() => { productCodeRef.current?.focus(); }, 100);
      }, 500);
    }
  };

  const handleLogout = async () => {
    await logout();
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
      const newCart = prev.map(c => {
        if (c.id === id) {
          const current = parseFloat(c.qty) || 0;
          const updated = current + delta;
          return { ...c, qty: updated, amount: updated * c.rate };
        }
        return c;
      });
      return newCart.filter(c => parseFloat(c.qty) > 0);
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
        <View style={[styles.leftPanel, { flex: isTablet ? leftFlex : 1 }]}>

          <View style={styles.inputStack}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <View style={styles.pickerWrapper}>
                <Picker selectedValue={orderType} onValueChange={(val) => setOrderType(val)} style={styles.picker} dataSet={{ zone: '0', index: '0' }}>
                  <Picker.Item label="[7] Take Away" value="take-away" />
                  <Picker.Item label="[8] Dine In" value="dine-in" />
                  <Picker.Item label="Delivery" value="delivery" />
                </Picker>
              </View>
              <TouchableOpacity style={styles.reportBtn} onPress={() => handlePrintReport('hourly')}>
                <Text style={styles.reportBtnText}>Hourly Report</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reportBtn} onPress={() => handlePrintReport('items')}>
                <Text style={styles.reportBtnText}>Item Report</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reportBtn} onPress={handlePrintItemCodes}>
                <Text style={styles.reportBtnText}>Item Code</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reportBtn} onPress={() => setShowOrderHistory(true)}>
                <Text style={styles.reportBtnText}>Orders</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              ref={productCodeRef}
              style={styles.searchInput}
              placeholder={t("cashier_search_code")}
              value={productCodeInput}
              onChangeText={setProductCodeInput}
              onSubmitEditing={addProductToCart}
              dataSet={{ zone: '1', index: '0' }}
            />
            <TextInput
              ref={descriptionRef}
              style={styles.searchInput}
              placeholder={t("cashier_search_item")}
              value={descriptionInput}
              onChangeText={setDescriptionInput}
              dataSet={{ zone: '2', index: '0' }}
            />
          </View>

          <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginTop: 12, marginBottom: 4, gap: 12 }}>
            {['All Regions', 'South Indian', 'North Indian'].map((region, idx) => {
              const val = region === 'All Regions' ? 'All' : region;
              return (
                <TouchableOpacity 
                  key={region}
                  style={[styles.regionBtn, selectedRegion === val && styles.regionBtnActive]}
                  onPress={() => setSelectedRegion(val)}
                  dataSet={{ zone: '3', index: String(idx), hover: 'btn' }}
                >
                  <Text style={[styles.regionText, selectedRegion === val && styles.regionTextActive]}>
                    {region}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContainer}>
            <TouchableOpacity style={[styles.catBtn, selectedCategoryId === 'All' && styles.catBtnActive]} onPress={() => setSelectedCategoryId('All')} dataSet={{ zone: '4', index: '0', hover: 'btn' }}>
              <Text style={[styles.catText, selectedCategoryId === 'All' && styles.catTextActive]}>All</Text>
            </TouchableOpacity>
            {categories
              .filter(cat => (selectedRegion === 'All' || cat.description === selectedRegion) && menuItems.some(item => item.category_id === cat.id))
              .map((cat, idx) => (
              <TouchableOpacity key={cat.id} style={[styles.catBtn, selectedCategoryId === cat.id && styles.catBtnActive]} onPress={() => setSelectedCategoryId(cat.id)} dataSet={{ zone: '4', index: String(idx + 1), hover: 'btn' }}>
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
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={true}>
              {filteredItems.map((item, index) => (
                <View key={item.id.toString()} style={styles.tableRow} dataSet={{ hover: 'nav' }}>
                  <Text style={[styles.tdCode, { width: 80 }]}>{item.item_code || item.id}</Text>
                  <Text style={[styles.tdName, { flex: 1 }]}>{item.name}</Text>
                  <View style={{ width: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <Text style={styles.tdPrice}>₹{(item.price || 0).toFixed(2)}</Text>
                    <TouchableOpacity style={styles.addSquareBtn} onPress={() => addItemToCart(item)} dataSet={{ zone: '5', index: String(index), hover: 'btn' }}>
                      <Text style={styles.addSquareText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* RESIZER */}
        {isTablet && (
          <View
            {...panResponder.panHandlers}
            style={{
              width: 10,
              backgroundColor: '#e5e7eb',
              cursor: Platform.OS === 'web' ? 'col-resize' : 'default',
              zIndex: 10,
            }}
          />
        )}

        {/* Right Panel (Cart) */}
        <View style={[styles.rightPanel, { flex: isTablet ? rightFlex : 1 }]}>
          <View style={styles.cartHeaderTop}>
            <Text style={styles.cartHeaderTitle}>{t('cashier_current_order')}</Text>
            <TouchableOpacity onPress={() => setCart([])} dataSet={{ hover: 'btn' }}>
              <Text style={styles.clearText}>{t('cashier_clear')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cartSubtitle}>{cart.length} lines · {cart.reduce((a, b) => a + b.qty, 0)} items</Text>

          <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} showsVerticalScrollIndicator={true}>
            {cart.map((item) => (
              <View key={item.id.toString()} style={styles.cartRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartRowName}>{item.description}</Text>
                  <Text style={styles.cartRowRate}>₹{item.rate.toFixed(2)}</Text>
                </View>
                <View style={styles.cartRowControls}>
                  <TouchableOpacity style={styles.cartQtyBtn} onPress={() => updateQty(item.id, -1)}><Text>-</Text></TouchableOpacity>
                  <TextInput
                    ref={el => cartInputRefs.current[item.id] = el}
                    style={styles.cartQtyInput}
                    value={String(item.qty)}
                    onChangeText={val => handleQtyTextChange(item.id, val)}
                    onSubmitEditing={() => productCodeRef.current?.focus()}
                    keyboardType="numeric"
                    selectTextOnFocus={true}
                  />
                  <TouchableOpacity style={styles.cartQtyBtn} onPress={() => updateQty(item.id, 1)}><Text>+</Text></TouchableOpacity>
                </View>
                <Text style={styles.cartRowTotal}>₹{item.amount.toFixed(2)}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.cartFooterArea}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <TouchableOpacity style={styles.futureSaleLightBtn} onPress={() => setShowFutureSaleModal(true)} dataSet={{ hover: 'btn' }}>
                <Text style={styles.futureSaleLightText}>+ Future Sale</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', cursor: 'pointer' }}
                onPress={() => setPrintFutureBills(!printFutureBills)}
              >
                <View style={{ width: 16, height: 16, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 4, marginRight: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: printFutureBills ? '#111827' : '#fff' }}>
                  {printFutureBills && <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>✓</Text>}
                </View>
                <Text style={{ fontSize: 13, color: '#4b5563', fontWeight: '500' }}>[F4] Future Bills</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>{t('cashier_subtotal')}</Text>
              <Text style={styles.subtotalValue}>₹{totalAmount.toFixed(2)}</Text>
            </View>
            <View style={[styles.subtotalRow, { alignItems: 'center' }]}>
              <Text style={styles.subtotalLabel}>Extra Charges [F8]</Text>
              <TextInput
                ref={extraChargeRef}
                style={[styles.subtotalValue, { borderBottomWidth: 1, borderColor: '#d1d5db', width: 80, textAlign: 'right', paddingVertical: 2, paddingHorizontal: 4, fontSize: 13, outlineStyle: 'none' }]}
                keyboardType="numeric"
                value={extraCharge}
                onChangeText={(text) => setExtraCharge(text.replace(/[^0-9.]/g, ''))}
                placeholder="0.00"
              />
            </View>
            <View style={styles.totalRowFixed}>
              <Text style={styles.totalLabelFixed}>{t('cashier_total')}</Text>
              <Text style={styles.totalValueFixed}>₹{(totalAmount + (parseFloat(extraCharge) || 0)).toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.chargeBtnDark} onPress={handleCheckout} dataSet={{ hover: 'btn' }}>
              <Text style={styles.chargeBtnDarkText}>Charge ₹{(totalAmount + (parseFloat(extraCharge) || 0)).toFixed(2)}</Text>
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
      
      {showDateRangeModal && (
        <DateRangeModal
          show={showDateRangeModal}
          setShow={setShowDateRangeModal}
          dateRange={dateRange}
          setDateRange={setDateRange}
          onPrint={handlePrintReport}
          reportType={dateRangeReportType}
          setDateRangeReportType={setDateRangeReportType}
        />
      )}
      <OrderHistoryModal
        show={showOrderHistory}
        setShow={setShowOrderHistory}
        restaurantData={restaurantData}
        api={api}
        user={user}
        onShowBill={handleShowHistoryBill}
      />
      <VoiceWidget onVoiceCommand={handleVoiceCommand} />
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
  pickerWrapper: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, backgroundColor: '#fff', height: 48, justifyContent: 'center', width: 160 },
  reportBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 16, height: 48, justifyContent: 'center', borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  reportBtnText: { color: '#475569', fontSize: 13, fontWeight: '600' },
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
  cartQtyInput: { fontSize: 14, fontWeight: '500', width: 40, textAlign: 'center', outlineStyle: 'none' },
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
