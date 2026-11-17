// src/utils/reportUtils.js

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
    existing.unshift(bill);
    // Keep max 1000 recent bills
    if (existing.length > 1000) existing.length = 1000;
    localStorage.setItem(key, JSON.stringify(existing));
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
      const nextHour = (hour + 1) % 24;
      const pad = (n) => String(n).padStart(2, '0');
      const slotKey = `${pad(hour)}:00 - ${pad(nextHour)}:00`;
      hourMap[slotKey] = (hourMap[slotKey] || 0) + (parseFloat(order.total_amount) || 0);
    });

    const timeline = Object.keys(hourMap).sort().map(slot => ({
      time: slot,
      sales: hourMap[slot]
    }));

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
            <p>Starting BillNo: ${(data.starting_bill && data.starting_bill.no) || '-'} - ${(data.starting_bill && data.starting_bill.time) || '-'}</p>
            <p>Ending BillNo: ${(data.ending_bill && data.ending_bill.no) || '-'} - ${(data.ending_bill && data.ending_bill.time) || '-'}</p>
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
