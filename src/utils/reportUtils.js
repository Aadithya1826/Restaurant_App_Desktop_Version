// src/utils/reportUtils.js

/**
 * Converts a 24-hour time or time range to 12-hour AM/PM format.
 * Examples:
 *  "00:00 - 01:00" -> "12:00 AM - 01:00 AM"
 *  "09:00 - 10:00" -> "09:00 AM - 10:00 AM"
 *  "13:00 - 14:00" -> "01:00 PM - 02:00 PM"
 *  "14:00:00"      -> "02:00 PM"
 *  "09:00 AM"      -> "09:00 AM" (leaves as-is)
 */
export const formatHourTo12 = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return timeStr || '';
  if (/am|pm/i.test(timeStr)) return timeStr;

  const convertSingle = (str) => {
    const trimmed = str.trim();
    const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?$/);
    if (!match) return trimmed;
    let hour = parseInt(match[1], 10);
    const minute = match[2] || '00';
    if (isNaN(hour)) return trimmed;

    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    const hourStr = String(hour).padStart(2, '0');
    return `${hourStr}:${minute} ${ampm}`;
  };

  if (timeStr.includes('-')) {
    const parts = timeStr.split('-');
    if (parts.length === 2 && /\d/.test(parts[0]) && /\d/.test(parts[1])) {
      return `${convertSingle(parts[0])} - ${convertSingle(parts[1])}`;
    }
  }

  return convertSingle(timeStr);
};

/**
 * Merges server orders and local cached bills without ANY duplicate counting.
 * Server orders are treated as the authoritative source of truth.
 * Local bills are only added if they have not yet synced to the server.
 */
export const mergeServerAndLocalOrders = (serverOrders = [], localBills = [], targetDate, startDate, endDate) => {
  const isDateMatch = (b) => {
    const bDate = b.date || (b.timestamp ? b.timestamp.split('T')[0] : '');
    if (startDate && endDate) {
      return bDate >= startDate && bDate <= endDate;
    }
    return !targetDate || bDate === targetDate;
  };

  const seenClientOrderIds = new Set();
  const seenBillNos = new Set();
  const seenOrderIds = new Set();
  const seenFingerprints = new Set();
  const result = [];

  const addOrder = (o) => {
    if (!o) return false;
    const cid = o.client_order_id ? String(o.client_order_id).trim() : null;
    const bno = (o.bill_no !== undefined && o.bill_no !== null && o.bill_no !== '') ? String(o.bill_no).trim() : null;
    const broid = (o.branch_order_id !== undefined && o.branch_order_id !== null && o.branch_order_id !== '') ? String(o.branch_order_id).trim() : null;
    const oid = (o.order_id !== undefined && o.order_id !== null && o.order_id !== '') ? String(o.order_id).trim() : null;
    const id = (o.id !== undefined && o.id !== null && o.id !== '') ? String(o.id).trim() : null;

    const timeVal = o.created_at || o.timestamp || '';
    const amtVal = parseFloat(o.total_amount) || 0;
    const fingerprint = timeVal && amtVal ? `${timeVal.slice(0, 19)}_${amtVal.toFixed(2)}` : null;

    if (cid && seenClientOrderIds.has(cid)) return false;
    if (bno && seenBillNos.has(bno)) return false;
    if (broid && seenBillNos.has(broid)) return false;
    if (oid && seenOrderIds.has(oid)) return false;
    if (id && seenOrderIds.has(id)) return false;
    if (fingerprint && seenFingerprints.has(fingerprint)) return false;

    if (cid) seenClientOrderIds.add(cid);
    if (bno) { seenBillNos.add(bno); seenOrderIds.add(bno); }
    if (broid) { seenBillNos.add(broid); seenOrderIds.add(broid); }
    if (oid) seenOrderIds.add(oid);
    if (id) seenOrderIds.add(id);
    if (fingerprint) seenFingerprints.add(fingerprint);

    result.push(o);
    return true;
  };

  // 1. Authoritative server orders first
  (serverOrders || []).forEach(o => addOrder(o));

  // 2. Unsynced local bills only
  (localBills || []).filter(isDateMatch).forEach(b => addOrder(b));

  return result;
};

/**
 * Checks whether an order is marked as an AC bill.
 * Uses multiple indicators to ensure reliable detection:
 * 1. Explicit `is_ac` flag on order
 * 2. `table_number` containing 'ac'
 * 3. `order_type` containing 'ac'
 * 4. Match against locally stored AC bill IDs
 */
export const isAcOrder = (order, localAcMap = {}) => {
  if (!order) return false;
  if (order.is_ac === true || order.is_ac === 'true' || order.is_ac === 1) return true;
  if (typeof order.table_number === 'string' && order.table_number.toLowerCase().includes('ac')) return true;
  if (typeof order.order_type === 'string' && order.order_type.toLowerCase().includes('ac')) return true;
  
  const billKey = String(order.bill_no || order.order_id || order.branch_order_id || '');
  if (billKey && localAcMap[billKey]) return true;

  return false;
};

/**
 * Retrieve local cached bills from localStorage
 */
export const getLocalBills = (restaurantId) => {
  try {
    const key = `local_bills_${restaurantId || 'default'}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to get local bills', e);
    return [];
  }
};

/**
 * Save a newly placed bill to local cache
 */
export const saveLocalBill = (bill, restaurantId) => {
  try {
    const key = `local_bills_${restaurantId || 'default'}`;
    const existing = getLocalBills(restaurantId);
    const billCid = bill.client_order_id ? String(bill.client_order_id) : null;
    const billNo = bill.bill_no !== undefined ? String(bill.bill_no) : null;

    const alreadyExists = existing.some(b => {
      if (billCid && b.client_order_id && String(b.client_order_id) === billCid) return true;
      if (billNo && b.bill_no !== undefined && String(b.bill_no) === billNo && (b.date === bill.date || b.timestamp === bill.timestamp)) return true;
      return false;
    });

    if (!alreadyExists) {
      existing.unshift(bill);
      if (existing.length > 1000) existing.length = 1000;
      localStorage.setItem(key, JSON.stringify(existing));
    }
  } catch (e) {
    console.error('Failed to save local bill', e);
  }
};

/**
 * Builds report data (timeline for hourly or items list for item wise) from a list of orders.
 */
export const buildReportFromOrders = (orders, type, restaurantData, dateStr, acMode = 'non-ac') => {
  const sorted = [...orders].sort((a, b) => {
    const timeA = new Date(a.created_at || a.timestamp || 0).getTime();
    const timeB = new Date(b.created_at || b.timestamp || 0).getTime();
    return timeA - timeB;
  });

  const formatOrderTime = (order) => {
    const rawTime = order?.created_at || order?.timestamp;
    if (!rawTime) return '-';
    try {
      const d = new Date(rawTime.includes('Z') || rawTime.includes('+') ? rawTime : rawTime + 'Z');
      return isNaN(d.getTime()) ? '-' : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return '-';
    }
  };

  const startingBill = sorted.length > 0 ? {
    no: sorted[0].bill_no || sorted[0].branch_order_id || sorted[0].order_id || '-',
    time: formatOrderTime(sorted[0])
  } : { no: '-', time: '-' };

  const endingBill = sorted.length > 0 ? {
    no: sorted[sorted.length - 1].bill_no || sorted[sorted.length - 1].branch_order_id || sorted[sorted.length - 1].order_id || '-',
    time: formatOrderTime(sorted[sorted.length - 1])
  } : { no: '-', time: '-' };

  const totalSales = sorted.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

  if (type === 'hourly') {
    const hourMap = {};
    sorted.forEach(order => {
      const rawTime = order?.created_at || order?.timestamp;
      let hour = 0;
      if (rawTime) {
        const d = new Date(rawTime.includes('Z') || rawTime.includes('+') ? rawTime : rawTime + 'Z');
        if (!isNaN(d.getTime())) {
          hour = d.getHours();
        }
      }
      hourMap[hour] = (hourMap[hour] || 0) + (parseFloat(order.total_amount) || 0);
    });

    const timeline = Object.keys(hourMap)
      .map(h => parseInt(h, 10))
      .sort((a, b) => a - b)
      .map(hour => {
        const nextHour = (hour + 1) % 24;
        const pad = (n) => String(n).padStart(2, '0');
        const rawSlot = `${pad(hour)}:00 - ${pad(nextHour)}:00`;
        return {
          time: formatHourTo12(rawSlot),
          sales: hourMap[hour]
        };
      });

    return {
      restaurant: restaurantData,
      date: dateStr || new Date().toISOString().split('T')[0],
      starting_bill: startingBill,
      ending_bill: endingBill,
      total_sales: totalSales,
      timeline,
      acMode
    };
  } else {
    // Items report
    const itemMap = {};
    sorted.forEach(order => {
      const items = order.items || order.cart || [];
      items.forEach(item => {
        const name = (item.name || item.description || 'Unknown').trim();
        const qty = parseFloat(item.quantity !== undefined ? item.quantity : item.qty) || 0;
        const price = parseFloat(item.price !== undefined ? item.price : item.rate) || 0;
        const amount = parseFloat(item.amount !== undefined ? item.amount : (qty * price)) || 0;

        if (!itemMap[name]) {
          itemMap[name] = { name, qty: 0, amount: 0 };
        }
        itemMap[name].qty += qty;
        itemMap[name].amount += amount;
      });
    });

    const items = Object.values(itemMap).sort((a, b) => b.amount - a.amount);

    return {
      restaurant: restaurantData,
      date: dateStr || new Date().toISOString().split('T')[0],
      starting_bill: startingBill,
      ending_bill: endingBill,
      total_sales: totalSales,
      items,
      acMode
    };
  }
};

/**
 * Generates thermal receipt print HTML with explicit AC / NON-AC label in the report.
 */
export const generateReportHtml = (data, type, acMode = 'non-ac') => {
  const isAc = acMode === 'ac' || data.acMode === 'ac';
  const modeTitle = isAc ? 'AC' : 'NON-AC';
  const reportTitle = type === 'hourly' ? `${modeTitle} - HOURLY REPORT` : `${modeTitle} - ITEM WISE REPORT`;
  const badgeText = isAc ? '[ A/C BILLS ]' : '[ NON-AC BILLS ]';

  let tableRows = '';
  if (type === 'hourly') {
    tableRows = (data.timeline || []).filter(t => Math.round(t.sales) > 0).map(t => `
      <div class="row">
        <span>${formatHourTo12(t.time)}</span>
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

  return `
    <html>
      <head>
        <title>Print Receipt</title>
        <style>
          @page { margin: 0; }
          body { font-family: monospace; font-size: 12px; margin: 0; padding: 0 5px 0 10px; width: 100%; max-width: 68mm; box-sizing: border-box; color: #000; }
          .header { text-align: center; margin-bottom: 10px; }
          .header h1 { font-size: 16px; margin: 0 0 5px 0; text-transform: uppercase; font-weight: 900; }
          .header p { margin: 0 0 4px 0; text-transform: uppercase; }
          .badge-row { text-align: center; font-size: 13px; font-weight: bold; margin: 4px 0; letter-spacing: 1px; }
          .row { display: flex; justify-content: space-between; transform: scaleY(1.2); transform-origin: top left; margin-bottom: 6px; }
          .item-row { display: flex; justify-content: space-between; transform: scaleY(1.2); transform-origin: top left; margin-bottom: 6px; }
          .item-name { flex: 1; word-break: break-word; padding-right: 5px; text-transform: uppercase; }
          .item-qty { width: 40px; text-align: center; }
          .item-amt { width: 65px; text-align: right; }
          .total-row { border-top: 1px dashed #000; margin-top: 15px; padding-top: 10px; display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; transform: scaleY(1.7); transform-origin: top left; margin-bottom: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${(data.restaurant && data.restaurant.name) || 'DATAUDIPI HOTEL'}</h1>
          <p>${(data.restaurant && data.restaurant.address) || 'MUGALIVAKKAM, CHENNAI'}</p>
          <p>PH:${(data.restaurant && data.restaurant.phone) || '9597066563'} GSTIN: ${(data.restaurant && data.restaurant.gstin) || '33ADLPV4810B3ZQ'}</p>
          <h2 style="font-size: 14px; margin: 10px 0 2px 0;">${reportTitle}</h2>
          <div class="badge-row">${badgeText}</div>
          <div style="text-align: left; margin-top: 10px;">
            ${type === 'hourly' 
              ? `<p>Date: ${data.date}</p>` 
              : `<p>Print Date: ${data.date}</p><p>Bills From: ${data.date}</p><p>To: ${data.date}</p>`}
            <p>Starting BillNo: ${(data.starting_bill && data.starting_bill.no) || '-'} - ${formatHourTo12((data.starting_bill && data.starting_bill.time) || '-')}</p>
            <p>Ending BillNo: ${(data.ending_bill && data.ending_bill.no) || '-'} - ${formatHourTo12((data.ending_bill && data.ending_bill.time) || '-')}</p>
          </div>
        </div>
        
        ${itemHeader}
        ${tableRows}
        
        <div class="total-row">
          <span>TOTAL SALES</span>
          <span>${data.total_sales ? Number(data.total_sales).toFixed(2) : '0.00'}</span>
        </div>
      </body>
    </html>
  `;
};

/**
 * Print html content silently via Electron or fallback to hidden iframe print.
 */
export const printReportHtml = (printContent, onComplete) => {
  if (window.electronAPI && window.electronAPI.printSilent) {
    window.electronAPI.printSilent(printContent).then(() => {
      if (onComplete) onComplete();
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
      if (onComplete) onComplete();
    }, 500);
  }
};
