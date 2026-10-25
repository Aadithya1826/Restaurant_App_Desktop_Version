/**
 * Bill numbering.
 *
 * The old implementation kept a single ever-increasing integer in
 * localStorage (`last_bill_no`) and never reset it, so each new day simply
 * carried on from the previous day's last bill - which is why a day could
 * "start at 800" before a single bill had been raised.
 *
 * This module:
 *   - scopes the counter to a business date, so it restarts at 1 each day
 *   - allocates numbers atomically in the Electron main process, so two fast
 *     checkouts can never be handed the same number
 *   - stores the counter in the offline data directory, so clearing the browser
 *     cache or reinstalling does not silently restart the sequence
 */

/**
 * Hour at which a new business day begins (0-23).
 *
 * 0  = plain calendar day. Use this if your backend reports group sales by
 *      calendar date (the default, so the POS and the reports agree).
 * 5  = sales rung up between midnight and 05:00 still belong to the previous
 *      trading day. Use this ONLY if the backend reports do the same, otherwise
 *      the POS and the server will disagree about which day a bill belongs to.
 */
export const BUSINESS_DAY_START_HOUR = 0;

/** Returns the current business date as 'YYYY-MM-DD' in local time. */
export function getBusinessDate(now = new Date()) {
  const d = new Date(now.getTime());
  if (d.getHours() < BUSINESS_DAY_START_HOUR) {
    d.setDate(d.getDate() - 1);
  }
  // Local date parts - NOT toISOString(), which converts to UTC and would roll
  // the date over at 05:30 IST instead of midnight.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// localStorage fallback for when the app runs outside Electron (plain web).
const LS_KEY = 'bill_counter';

function readFallback() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.lastAllocated === 'number') return parsed;
    }
  } catch (e) {}
  return { businessDate: null, lastAllocated: 0 };
}

/** The number the NEXT bill will get, without consuming it. */
export async function peekBillNumber(businessDate = getBusinessDate()) {
  if (typeof window !== 'undefined' && window.electronAPI?.peekBillNumber) {
    const res = await window.electronAPI.peekBillNumber(businessDate);
    if (res?.success) return res.billNo;
  }
  const c = readFallback();
  return c.businessDate === businessDate ? c.lastAllocated + 1 : 1;
}

/** Consumes and returns the next bill number. Call once per completed sale. */
export async function allocateBillNumber(businessDate = getBusinessDate()) {
  if (typeof window !== 'undefined' && window.electronAPI?.allocateBillNumber) {
    const res = await window.electronAPI.allocateBillNumber(businessDate);
    if (res?.success) return res.billNo;
  }
  const c = readFallback();
  const billNo = c.businessDate === businessDate ? c.lastAllocated + 1 : 1;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ businessDate, lastAllocated: billNo }));
  } catch (e) {}
  return billNo;
}

