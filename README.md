# TokoWeb3 🛍️

Toko online berbasis Web3 yang berjalan di atas smart contract Ethereum Sepolia. Semua transaksi — dari pembelian hingga refund — terjadi on-chain tanpa perantara. Pembayaran menggunakan USDC.

---

## 📋 Daftar Isi

- [Overview](#overview)
- [Teknologi](#teknologi)
- [Deployment Info](#deployment-info)
- [Fitur](#fitur)
- [Struktur Data Kontrak](#struktur-data-kontrak)
- [Alur Penggunaan](#alur-penggunaan)
- [Fungsi Smart Contract](#fungsi-smart-contract)
- [Events](#events)
- [Security](#security)
- [File](#file)
- [Cara Menjalankan UI](#cara-menjalankan-ui)
- [Catatan Penting](#catatan-penting)

---

## Overview

TokoWeb3 adalah sistem toko online personal yang memanfaatkan smart contract sebagai backend. Owner toko mengelola produk dan order langsung dari kontrak. User membeli produk dengan USDC, dan jika terjadi pembatalan, refund dikembalikan langsung ke wallet user tanpa campur tangan pihak ketiga.

---

## Teknologi

| Komponen | Detail |
|---|---|
| Smart Contract | Solidity `^0.8.20` |
| Library Kontrak | OpenZeppelin v5 (ReentrancyGuard, Pausable, Ownable, SafeERC20) |
| Network | Ethereum Sepolia Testnet |
| Token Pembayaran | USDC (6 desimal) |
| Frontend | Vanilla HTML / CSS / JavaScript |
| Web3 Library | Ethers.js v5.7.2 |
| Wallet | MetaMask |

---

## Deployment Info

| Item | Value |
|---|---|
| Network | Ethereum Sepolia Testnet |
| Chain ID | `11155111` |
| RPC URL | `https://lb.drpc.live/sepolia/AnmpasF2C0JBqeAEzxVO8aTDnH6wviUR8JD3QmlfqV1j` |
| Block Explorer | https://sepolia.etherscan.io |
| **Contract Address** | `0xD909C6961Cd9b6a3CefAa6198fa92f963aeB3994` |
| **USDC Address** | `0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8` |
| USDC Desimal | `6` — $1 USDC = `1_000_000` |
| Auto-Cancel Period | `7 hari` (604.800 detik) |

---

## Fitur

### Untuk User
- Connect wallet MetaMask (auto-switch ke Sepolia)
- Lihat semua produk beserta harga dalam USDC
- Tambah produk ke keranjang (multi-item, multi-qty)
- Checkout dengan flow 2-step: **Approve USDC → Buat Order**
- Isi data penerima: nama, alamat pengiriman, no HP
- Lihat semua order sendiri beserta detail dan status real-time
- Batalkan order selama masih berstatus **Pending**
- Trigger auto-cancel jika order sudah lebih dari 7 hari tanpa konfirmasi
- Klaim refund USDC kapanpun setelah order dibatalkan

### Untuk Owner
- Dashboard statistik: total produk, order, revenue tersedia, status kontrak
- Tambah produk baru (nama, deskripsi, harga)
- Edit produk yang sudah ada kapanpun
- Lihat semua order dengan filter per status
- Update status order (hanya bisa maju): `Pending → Dikonfirmasi → Diproses → Dikirim → Selesai`
- Batalkan order milik user (hanya saat status Pending atau Dikonfirmasi)
- Withdraw revenue hasil penjualan ke wallet owner
- Ganti token pembayaran aktif
- Pause / Unpause kontrak (mode darurat)
- Transfer ownership kontrak ke wallet lain

---

## Struktur Data Kontrak

### Product
```solidity
struct Product {
    uint256 id;
    string  name;
    string  description;
    uint256 price;       // unit terkecil USDC, $10 = 10_000_000
}
```

### Order
```solidity
struct Order {
    uint256      orderId;
    address      buyer;
    string       recipientName;
    string       recipientAddress;
    string       recipientPhone;
    OrderItem[]  items;
    uint256      totalAmount;
    OrderStatus  status;
    address      paymentToken;   // token saat order dibuat
    uint256      createdAt;
    bool         refundClaimed;
}
```

### OrderItem (snapshot saat beli)
```solidity
struct OrderItem {
    uint256 productId;
    string  productName;    // snapshot nama produk
    uint256 productPrice;   // snapshot harga produk
    uint256 quantity;
    uint256 subtotal;
}
```

### OrderStatus
```
0 — Pending       Menunggu konfirmasi owner
1 — Confirmed     Sudah dikonfirmasi
2 — Processing    Sedang diproses / dikemas
3 — Shipped       Sudah dikirim
4 — Completed     Selesai
5 — Cancelled     Dibatalkan
```

---

## Alur Penggunaan

### Alur Beli (User)

```
1. Connect MetaMask (Sepolia)
2. Pilih produk → tambah ke keranjang
3. Isi data penerima (nama, alamat, no HP)
4. Klik "Bayar" → Approve USDC ke contract [MetaMask popup 1]
5. Konfirmasi createOrder [MetaMask popup 2]
6. Order masuk dengan status Pending
```

### Alur Order (Owner → User)

```
Pending ──► Dikonfirmasi ──► Diproses ──► Dikirim ──► Selesai
   │               │
   └───────────────┴──► Dibatalkan (oleh owner)
   │
   └──► Dibatalkan (oleh user, hanya saat Pending)
   │
   └──► Auto-Cancel (siapapun, setelah 7 hari Pending)
```

### Alur Refund

```
Order Dibatalkan
      ↓
Dana di-earmark di kontrak (tidak bisa ditarik owner)
      ↓
User panggil claimRefund(tokenAddress)
      ↓
USDC kembali ke wallet user
```

---

## Fungsi Smart Contract

### Read (Gratis, tanpa gas)

| Fungsi | Keterangan |
|---|---|
| `getProduct(productId)` | Data satu produk |
| `getAllProducts()` | Semua produk |
| `getOrder(orderId)` | Header data order |
| `getOrderItems(orderId)` | Item-item dalam order |
| `getUserOrders(wallet)` | List orderId milik wallet |
| `getRefundBalance(wallet, token)` | Saldo refund user |
| `getWithdrawableRevenue()` | Revenue yang bisa ditarik owner |
| `isPaused()` | Status pause kontrak |
| `owner()` | Alamat owner |
| `paymentToken()` | Token aktif |
| `productCount()` | Total produk |
| `orderCount()` | Total order |

### Write — Owner Only

| Fungsi | Keterangan |
|---|---|
| `addProduct(name, desc, price)` | Tambah produk baru |
| `editProduct(id, name, desc, price)` | Edit produk |
| `updateOrderStatus(orderId, newStatus)` | Update status order |
| `withdrawRevenue(amount)` | Tarik revenue ke wallet owner |
| `setPaymentToken(newToken)` | Ganti token pembayaran |
| `pause()` | Freeze semua operasi |
| `unpause()` | Aktifkan kembali |
| `transferOwnership(newOwner)` | Transfer ownership |

### Write — User

| Fungsi | Keterangan |
|---|---|
| `createOrder(name, addr, phone, items[])` | Buat order (butuh approve USDC dulu) |
| `cancelOrder(orderId)` | Cancel order sendiri (hanya Pending) |
| `claimRefund(token)` | Klaim refund setelah order batal |

### Write — Siapapun

| Fungsi | Keterangan |
|---|---|
| `cancelExpiredOrder(orderId)` | Auto-cancel order Pending > 7 hari |

---

## Events

```solidity
// Produk
event ProductAdded(uint256 indexed productId, string name, uint256 price)
event ProductUpdated(uint256 indexed productId, string name, uint256 price)

// Order
event OrderCreated(uint256 indexed orderId, address indexed buyer, uint256 totalAmount, address paymentToken)
event OrderStatusUpdated(uint256 indexed orderId, OrderStatus oldStatus, OrderStatus newStatus)
event OrderCancelled(uint256 indexed orderId, address indexed cancelledBy)

// Keuangan
event RevenueWithdrawn(address indexed owner, uint256 amount)
event RefundClaimed(address indexed buyer, address indexed token, uint256 amount)

// Config
event PaymentTokenChanged(address indexed oldToken, address indexed newToken)
```

> Event OZ bawaan juga aktif: `Paused`, `Unpaused`, `OwnershipTransferred`

---

## Security

| Mekanisme | Implementasi |
|---|---|
| Reentrancy Guard | Semua fungsi transfer token pakai `nonReentrant` |
| SafeERC20 | Transfer token pakai `safeTransfer` / `safeTransferFrom` |
| CEI Pattern | Checks → Effects → Interactions di semua fungsi |
| Proteksi Dana Refund | `_totalPendingRefunds` memastikan owner tidak bisa menarik dana milik user |
| Pausable | Owner bisa freeze semua operasi saat darurat |
| Validasi Input | Semua parameter dicek sebelum eksekusi |
| Status Final | Order `Completed` dan `Cancelled` tidak bisa diubah lagi |
| Snapshot Harga | Harga dan nama produk di-snapshot saat order dibuat — edit produk tidak mempengaruhi order lama |
| Multi-token Refund | Refund disimpan per `(wallet, token)` — aman saat token pembayaran diganti |

---

## File

```
TokoOnline.sol     Smart contract utama (deploy di Remix IDE)
TokoWeb3.html      Frontend UI lengkap (satu file, tidak perlu server)
README.md          Dokumentasi ini
alur-smartcontract.txt  Desain alur dan struktur data detail
```

---

## Cara Menjalankan UI

Tidak perlu install apapun. Cukup:

1. Pastikan MetaMask sudah terinstall di browser
2. Buka file `TokoWeb3.html` langsung di browser (double-click)
3. Klik **Connect Wallet** — MetaMask akan minta permission dan auto-switch ke Sepolia
4. Selesai, semua data langsung load dari kontrak

> Untuk mendapatkan USDC Sepolia gratis: https://faucet.circle.com → pilih network Sepolia

---

## Catatan Penting

**Format harga USDC** — Kontrak menyimpan harga dalam unit terkecil (6 desimal). $1 = `1000000`, $10 = `10000000`. UI sudah otomatis mengkonversi.

**Approve sebelum beli** — Sebelum `createOrder`, user harus `approve` USDC ke alamat kontrak minimal sebesar total belanja. UI sudah handle ini otomatis (2 popup MetaMask).

**Ganti token pembayaran** — Jika owner ganti token, order lama tetap bisa refund dengan token lama. User perlu `claimRefund` dengan alamat token yang sesuai (tersimpan di data order).

**Produk tidak bisa dihapus** — Produk hanya bisa diedit. Data order lama tetap valid karena harga dan nama disimpan sebagai snapshot on-chain.

**Data on-chain = publik** — Nama penerima, alamat, dan no HP tersimpan di blockchain dan bisa dibaca siapapun.

**Auto-cancel** — Jika order masih Pending setelah 7 hari, siapapun (user atau owner) bisa memanggil `cancelExpiredOrder` untuk membatalkan dan mengaktifkan refund.

---

*Smart contract di-deploy dan diverifikasi di Ethereum Sepolia Testnet.*
*Lihat kontrak: https://sepolia.etherscan.io/address/0xD909C6961Cd9b6a3CefAa6198fa92f963aeB3994*