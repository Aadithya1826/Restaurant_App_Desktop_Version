# Offline Sales Sync — Root Causes & Fixes

## Why sales were mismatching

| # | Bug | Effect on sales |
|---|-----|-----------------|
| 1 | Sync queue filename was `Date.now()`. Two bills saved in the same millisecond produced the same filename. | **Lost transactions** (second bill silently overwrote the first). |
| 2 | `setInterval` fired every 15s with **no re-entrancy guard**. On a slow link a pass could still be running when the next one started, so the same queued order was POSTed twice. | **Duplicate sales records.** Main duplicate cause. |
| 3 | No idempotency key. A request that timed out *after* the server saved it was treated as a failure and re-sent. | **Duplicate sales records.** |
| 4 | Any 4xx (except 401) caused `dequeueSyncAction` → the queue file was **deleted**. | **Lost transactions**, no trace. |
| 5 | Unparseable / empty queue files were **deleted** by `get-sync-queue`. Combined with non-atomic `writeFileSync`, a crash or power-cut mid-write destroyed the sale. | **Lost transactions.** |
| 6 | Offline mutations always returned `{ success: true }` even when the enqueue failed. | Cashier saw "Order placed successfully" for a sale that was never recorded. |
| 7 | 401s were retained but the sync client never refreshed the token. | Queue stalled forever, backlog grew silently. |
| 8 | 5xx retried every 15s forever, with no attempt cap or backoff. | Queue stalled; the stuck item blocked everything behind it. |
| 9 | GET cache key was `config.url` only — `config.params` is merged by axios *later*, so `/api/v1/reports?date=A` and `?date=B` wrote to the **same** cache file. | **Reports showed the wrong day's sales.** The most visible "mismatch". |
| 10 | Queued mutations also dropped `config.params` (e.g. `restaurant_id` on deletes). | Actions replayed against the wrong restaurant / rejected. |
| 11 | No `timeout` on the axios client. A half-open socket hangs indefinitely. | Bill printed, sale neither sent nor queued. |
| 12 | `setBillNo(prev => { localStorage.setItem(...) })` — a side effect inside a state updater, which React may run twice. | Bill-number gaps / sequence mismatch. |
| 13 | `JSON.parse(originalRequest.data)` threw on FormData, rejecting out of the interceptor. | **Lost transactions.** |
| 14 | Checkout was fire-and-forget; failures only produced a generic "Error" alert. | Staff did not know a bill was unrecorded. |
| 15 | The bill counter was a single forever-increasing integer in `localStorage` with **no daily reset**, so each day continued from the previous day's last bill. | **"Today starts at bill 800."** |
| 16 | Receipt backup filenames used `new Date().toISOString().split('T')[0]` (UTC). In IST that returns *yesterday* for any bill between 00:00 and 05:30. | Bills filed under the wrong date. |

## Bill numbering (the "day starts at 800" problem)

This was a **separate bug from the sync issues** and needed its own fix.

The counter was `localStorage['last_bill_no']`, incremented on every checkout and
never reset. It is not that the number "jumps" — it simply never goes back to 1,
so after a few hundred bills a new day opens at whatever yesterday ended on.
It also restarted from 1 if the browser cache was cleared, which produced
*duplicate* bill numbers.

Now:
- `src/services/billCounter.js` + atomic `peek-bill-number` / `allocate-bill-number`
  IPC handlers in the main process.
- The counter is stored as `{ businessDate, lastAllocated }` in `counters/bill_counter.json`
  inside the offline data directory — it survives cache clears and reinstalls.
- A different `businessDate` resets the sequence to 1 automatically.
- Numbers are allocated **atomically in the main process**, so two fast checkouts
  can never receive the same number.
- The dashboard re-checks every 60s, so a terminal left running overnight rolls
  over to bill 1 by itself.
- `getBusinessDate()` uses **local** date parts, not `toISOString()`.

`BUSINESS_DAY_START_HOUR` in `billCounter.js` is `0` (calendar day) to match
backend reports. Set it to `5` only if the backend also treats post-midnight
sales as the previous trading day — otherwise the POS and the reports will
disagree about which day a bill belongs to.

## What changed

**`electron/main.js`**
- `writeFileAtomic()` (temp file → `fsync` → `rename`) for every write. No more torn files.
- Queue IDs use a persisted monotonic sequence, zero-padded: collisions are impossible.
- Unreadable files are **quarantined** to `sync_queue_corrupt/`, never deleted.
- New `mark-sync-attempt` (retry counter + backoff) and `deadletter-sync-action` (moves to `sync_failed/`) handlers.
- Successful pushes are archived to `sync_completed/` for reconciliation.
- `get-sync-stats` for the UI badge. Path-traversal guard on `getSecurePath`.

**`src/services/offlineSync.js`**
- `isSyncing` re-entrancy guard — one pass at a time.
- Strict FIFO; stops at the first undeliverable item so an order can never be overtaken by its own status update.
- Sends `Idempotency-Key`, `X-Client-Action-Id`, `X-Offline-Replay`, `X-Original-Timestamp`.
- Exponential backoff (5s → 5min), 50-attempt cap, token refresh on 401/403, `409` treated as success.
- Halts if a dequeue fails, rather than risking a re-send.
- Flushes immediately on the browser `online` event.
- Cache keys now include the query string.

**`src/services/api.js`**
- `buildRequestKey()` includes `config.params` for both caching and queueing.
- 20s timeout; `ECONNABORTED` handled as offline.
- Auth endpoints and FormData are never queued.
- A failed enqueue now **rejects** instead of faking success, and is written to `logs/error.log`.
- Offline writes resolve with `status: 202`, `_offline: true`, `_queueId`.

**`src/screens/CashierDashboard.js`**
- Generates a `client_order_id` per sale, reused as the idempotency key on every retry.
- Allocates the bill number atomically per business day; prints the *issued*
  number rather than the current state value.
- Sends `business_date` with the order.
- Receipt backup filename includes the unique id — backups can't overwrite each other.
- Distinct alerts for *Saved Offline* vs *ORDER NOT SAVED*.
- Header badge showing pending / rejected bills, tap to retry.

## Required backend change (important)

Client-side protection removes duplicate *sends*, but the server must enforce the
final guarantee. On `POST /api/v1/orders`:

1. Read the `Idempotency-Key` header (same value as `client_order_id` in the body).
2. Store it with a unique index.
3. If the key already exists, return the **existing** order with `200` (or `409`) —
   do not create a second row.
4. Honour `timestamp` / `X-Original-Timestamp` as the business time of the sale, so
   bills entered during an outage land on the correct date in reports instead of
   the time they happened to sync.

Until step 2–3 exist, a lost HTTP response can still create a duplicate.

## Recovering data after an incident

In the data folder (Settings → offline data directory):

- `sync_queue/` — not yet uploaded.
- `sync_failed/` — rejected by the server; each file has `deadLetterReason`. Re-enter manually.
- `sync_queue_corrupt/` — unreadable files kept for manual recovery.
- `sync_completed/` — successfully uploaded, for reconciling against the server.
- `BackupData/Cashier/Receipts/` — a copy of every bill, written before the network call.
- `logs/error.log` — every dead-letter, quarantine and failed offline write.

