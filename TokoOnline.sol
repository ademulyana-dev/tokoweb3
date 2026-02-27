// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ================================================================
 *  TOKO ONLINE WEB3
 *  Network  : Ethereum Sepolia Testnet
 *  Token    : USDC Sepolia
 *  Solidity : ^0.8.20
 *  OZ       : v5
 * ================================================================
 *
 * Security:
 *  - ReentrancyGuard pada semua fungsi yang transfer token
 *  - Pausable untuk freeze operasi darurat
 *  - Ownable untuk akses kontrol owner
 *  - SafeERC20 untuk transfer token yang aman
 *  - Checks-Effects-Interactions pattern di semua fungsi
 *  - Validasi input di semua fungsi publik
 *  - Dana refund user terlindungi dari withdrawRevenue owner
 * ================================================================
 */

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TokoOnline is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // ================================================================
    // CONSTANTS
    // ================================================================

    uint256 public constant AUTO_CANCEL_PERIOD = 7 days; // 604_800 detik

    // ================================================================
    // ENUMS
    // ================================================================

    enum OrderStatus {
        Pending,    // 0 - Menunggu konfirmasi owner
        Confirmed,  // 1 - Sudah dikonfirmasi owner
        Processing, // 2 - Sedang diproses / dikemas
        Shipped,    // 3 - Sudah dikirim
        Completed,  // 4 - Selesai
        Cancelled   // 5 - Dibatalkan
    }

    // ================================================================
    // STRUCTS
    // ================================================================

    struct Product {
        uint256 id;
        string  name;
        string  description;
        uint256 price; // unit terkecil USDC (6 desimal), $10 = 10_000_000
    }

    struct OrderItem {
        uint256 productId;
        string  productName;    // snapshot nama saat order dibuat
        uint256 productPrice;   // snapshot harga saat order dibuat
        uint256 quantity;
        uint256 subtotal;       // productPrice * quantity
    }

    struct Order {
        uint256      orderId;
        address      buyer;
        string       recipientName;
        string       recipientAddress;
        string       recipientPhone;
        OrderItem[]  items;
        uint256      totalAmount;
        OrderStatus  status;
        address      paymentToken; // token yang dipakai saat order dibuat
        uint256      createdAt;
        bool         refundClaimed;
    }

    // Helper input createOrder agar tidak stack-too-deep
    struct OrderItemInput {
        uint256 productId;
        uint256 quantity;
    }

    // ================================================================
    // STATE VARIABLES
    // ================================================================

    address public paymentToken;

    uint256 public productCount;
    uint256 public orderCount;

    // Total dana refund user yang masih tersimpan di kontrak.
    // Diproteksi agar owner tidak bisa withdraw dana refund milik user.
    uint256 private _totalPendingRefunds;

    mapping(uint256 => Product)   private _products;
    mapping(uint256 => Order)     private _orders;

    // wallet => list orderId milik user
    mapping(address => uint256[]) private _userOrders;

    // wallet => tokenAddress => saldo refund yang bisa diklaim
    // future-proof: mendukung multi-token jika suatu saat token diganti
    mapping(address => mapping(address => uint256)) private _refundBalance;

    // ================================================================
    // EVENTS
    // ================================================================

    event ProductAdded(
        uint256 indexed productId,
        string  name,
        uint256 price
    );

    event ProductUpdated(
        uint256 indexed productId,
        string  name,
        uint256 price
    );

    event OrderCreated(
        uint256 indexed orderId,
        address indexed buyer,
        uint256 totalAmount,
        address paymentToken
    );

    event OrderStatusUpdated(
        uint256     indexed orderId,
        OrderStatus         oldStatus,
        OrderStatus         newStatus
    );

    event OrderCancelled(
        uint256 indexed orderId,
        address indexed cancelledBy
    );

    event RevenueWithdrawn(
        address indexed owner,
        uint256 amount
    );

    event RefundClaimed(
        address indexed buyer,
        address indexed token,
        uint256 amount
    );

    event PaymentTokenChanged(
        address indexed oldToken,
        address indexed newToken
    );

    // ================================================================
    // MODIFIERS
    // ================================================================

    modifier validProduct(uint256 productId) {
        require(productId > 0 && productId <= productCount, "Produk tidak ditemukan");
        _;
    }

    modifier validOrder(uint256 orderId) {
        require(orderId > 0 && orderId <= orderCount, "Order tidak ditemukan");
        _;
    }

    modifier onlyBuyer(uint256 orderId) {
        require(_orders[orderId].buyer == msg.sender, "Bukan pembeli order ini");
        _;
    }

    // ================================================================
    // CONSTRUCTOR
    // ================================================================

    /**
     * @param _paymentToken Alamat USDC Sepolia:
     *        0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
     */
    constructor(address _paymentToken) Ownable(msg.sender) {
        require(_paymentToken != address(0), "Token tidak valid");
        paymentToken = _paymentToken;
    }

    // ================================================================
    // OWNER: MANAJEMEN PRODUK
    // ================================================================

    /**
     * @notice Tambah produk baru
     * @param name        Nama produk
     * @param description Deskripsi produk
     * @param price       Harga dalam unit terkecil USDC ($1 = 1_000_000)
     */
    function addProduct(
        string calldata name,
        string calldata description,
        uint256 price
    ) external onlyOwner whenNotPaused {
        require(bytes(name).length > 0,        "Nama produk tidak boleh kosong");
        require(bytes(description).length > 0, "Deskripsi tidak boleh kosong");
        require(price > 0,                     "Harga harus lebih dari 0");

        productCount++;
        _products[productCount] = Product({
            id:          productCount,
            name:        name,
            description: description,
            price:       price
        });

        emit ProductAdded(productCount, name, price);
    }

    /**
     * @notice Edit produk yang sudah ada
     * @param productId   ID produk yang akan diedit
     * @param name        Nama baru
     * @param description Deskripsi baru
     * @param price       Harga baru
     */
    function editProduct(
        uint256 productId,
        string calldata name,
        string calldata description,
        uint256 price
    ) external onlyOwner whenNotPaused validProduct(productId) {
        require(bytes(name).length > 0,        "Nama produk tidak boleh kosong");
        require(bytes(description).length > 0, "Deskripsi tidak boleh kosong");
        require(price > 0,                     "Harga harus lebih dari 0");

        Product storage p = _products[productId];
        p.name        = name;
        p.description = description;
        p.price       = price;

        emit ProductUpdated(productId, name, price);
    }

    // ================================================================
    // OWNER: MANAJEMEN ORDER
    // ================================================================

    /**
     * @notice Owner update status order
     * @dev - Status hanya boleh maju (angka enum naik)
     *      - Owner boleh set Cancelled hanya saat Pending atau Confirmed
     *      - Setelah Processing, owner tidak bisa cancel
     *      - Status Completed dan Cancelled adalah status final
     *
     * @param orderId   ID order
     * @param newStatus Status baru yang diinginkan
     */
    function updateOrderStatus(
        uint256 orderId,
        OrderStatus newStatus
    ) external onlyOwner validOrder(orderId) {
        Order storage o = _orders[orderId];

        require(
            o.status != OrderStatus.Completed && o.status != OrderStatus.Cancelled,
            "Order sudah final, tidak bisa diubah"
        );

        if (newStatus == OrderStatus.Cancelled) {
            require(
                o.status == OrderStatus.Pending || o.status == OrderStatus.Confirmed,
                "Owner hanya bisa cancel saat Pending atau Confirmed"
            );
            _processCancel(orderId, msg.sender);
            return;
        }

        require(
            uint8(newStatus) > uint8(o.status),
            "Status hanya bisa maju"
        );

        OrderStatus oldStatus = o.status;
        o.status = newStatus;
        emit OrderStatusUpdated(orderId, oldStatus, newStatus);
    }

    // ================================================================
    // OWNER: KEUANGAN
    // ================================================================

    /**
     * @notice Withdraw revenue hasil penjualan ke wallet owner
     * @dev Dana refund user TIDAK bisa ikut ditarik.
     *      withdrawable = saldo token di kontrak - _totalPendingRefunds
     * @param amount Jumlah yang ditarik (unit terkecil USDC)
     */
    function withdrawRevenue(uint256 amount)
        external
        onlyOwner
        nonReentrant
        whenNotPaused
    {
        require(amount > 0, "Jumlah harus lebih dari 0");

        uint256 withdrawable = _getWithdrawableRevenue();
        require(amount <= withdrawable, "Melebihi saldo revenue yang tersedia");

        IERC20(paymentToken).safeTransfer(owner(), amount);
        emit RevenueWithdrawn(owner(), amount);
    }

    // ================================================================
    // OWNER: KONFIGURASI
    // ================================================================

    /**
     * @notice Ganti token pembayaran aktif
     * @dev Order lama tetap refund menggunakan token saat order dibuat.
     *      Saldo refund pending dari token lama harus diklaim terpisah.
     * @param newToken Alamat token ERC20 baru
     */
    function setPaymentToken(address newToken) external onlyOwner {
        require(newToken != address(0),      "Token tidak valid");
        require(newToken != paymentToken,    "Token sudah sama dengan yang aktif");

        address oldToken = paymentToken;
        paymentToken = newToken;
        emit PaymentTokenChanged(oldToken, newToken);
    }

    /**
     * @notice Pause seluruh operasi kontrak (darurat)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause kontrak
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Transfer ownership ke alamat baru
     */
    function transferOwnership(address newOwner) public override onlyOwner {
        require(newOwner != address(0), "Owner baru tidak valid");
        super.transferOwnership(newOwner);
    }

    // ================================================================
    // USER: BUAT ORDER
    // ================================================================

    /**
     * @notice Buat order baru (bisa multi-item)
     *
     * @dev PENTING — sebelum memanggil fungsi ini, user HARUS approve USDC
     *      ke alamat kontrak ini minimal sebesar total harga semua item.
     *
     *      Cara approve di frontend (ethers.js):
     *      await usdcContract.approve(tokoOnlineAddress, totalAmount)
     *
     * @param recipientName     Nama penerima paket
     * @param recipientAddress_ Alamat pengiriman lengkap
     * @param recipientPhone    No HP penerima
     * @param items             Array [{productId, quantity}] item yang dibeli
     */
    function createOrder(
        string calldata recipientName,
        string calldata recipientAddress_,
        string calldata recipientPhone,
        OrderItemInput[] calldata items
    ) external nonReentrant whenNotPaused {
        // ---- CHECKS ----
        require(bytes(recipientName).length > 0,     "Nama penerima tidak boleh kosong");
        require(bytes(recipientAddress_).length > 0, "Alamat penerima tidak boleh kosong");
        require(bytes(recipientPhone).length > 0,    "No HP tidak boleh kosong");
        require(items.length > 0,                    "Minimal 1 item");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < items.length; i++) {
            uint256 pid = items[i].productId;
            uint256 qty = items[i].quantity;
            require(pid > 0 && pid <= productCount, "Produk tidak ditemukan");
            require(qty > 0,                        "Quantity minimal 1");
            totalAmount += _products[pid].price * qty;
        }
        require(totalAmount > 0, "Total order tidak valid");
        require(
            IERC20(paymentToken).allowance(msg.sender, address(this)) >= totalAmount,
            "Allowance USDC tidak cukup, silakan approve terlebih dahulu"
        );

        // ---- EFFECTS ----
        orderCount++;
        uint256 newOrderId = orderCount;

        Order storage o    = _orders[newOrderId];
        o.orderId          = newOrderId;
        o.buyer            = msg.sender;
        o.recipientName    = recipientName;
        o.recipientAddress = recipientAddress_;
        o.recipientPhone   = recipientPhone;
        o.totalAmount      = totalAmount;
        o.status           = OrderStatus.Pending;
        o.paymentToken     = paymentToken;
        o.createdAt        = block.timestamp;
        o.refundClaimed    = false;

        for (uint256 i = 0; i < items.length; i++) {
            Product storage p = _products[items[i].productId];
            o.items.push(OrderItem({
                productId:    items[i].productId,
                productName:  p.name,
                productPrice: p.price,
                quantity:     items[i].quantity,
                subtotal:     p.price * items[i].quantity
            }));
        }

        _userOrders[msg.sender].push(newOrderId);

        // ---- INTERACTIONS ----
        IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), totalAmount);

        emit OrderCreated(newOrderId, msg.sender, totalAmount, paymentToken);
    }

    // ================================================================
    // USER: CANCEL ORDER
    // ================================================================

    /**
     * @notice User cancel ordernya sendiri (hanya saat status Pending)
     * @param orderId ID order yang akan dibatalkan
     */
    function cancelOrder(uint256 orderId)
        external
        nonReentrant
        whenNotPaused
        validOrder(orderId)
        onlyBuyer(orderId)
    {
        require(
            _orders[orderId].status == OrderStatus.Pending,
            "Hanya bisa cancel saat status Pending"
        );
        _processCancel(orderId, msg.sender);
    }

    /**
     * @notice Trigger auto-cancel untuk order Pending yang sudah lewat 7 hari
     * @dev Bisa dipanggil oleh siapapun: user atau owner
     * @param orderId ID order yang akan di-cancel
     */
    function cancelExpiredOrder(uint256 orderId)
        external
        nonReentrant
        validOrder(orderId)
    {
        Order storage o = _orders[orderId];
        require(o.status == OrderStatus.Pending,
            "Auto-cancel hanya untuk status Pending");
        require(
            block.timestamp >= o.createdAt + AUTO_CANCEL_PERIOD,
            "Order belum melewati batas waktu 7 hari"
        );
        _processCancel(orderId, msg.sender);
    }

    // ================================================================
    // USER: KLAIM REFUND
    // ================================================================

    /**
     * @notice Klaim refund USDC setelah order dibatalkan
     * @dev Bisa dipanggil kapanpun, tidak ada batas waktu.
     *      CEI pattern: saldo di-nol-kan SEBELUM transfer untuk cegah reentrancy.
     *
     * @param token Alamat token yang ingin diklaim.
     *              Gunakan alamat paymentToken yang tersimpan di order saat dibuat.
     *              (bisa cek via getOrder -> field 'token')
     */
    function claimRefund(address token)
        external
        nonReentrant
        whenNotPaused
    {
        require(token != address(0), "Token tidak valid");

        uint256 amount = _refundBalance[msg.sender][token];
        require(amount > 0, "Tidak ada refund tersedia untuk token ini");

        // ---- EFFECTS (reset SEBELUM transfer) ----
        _refundBalance[msg.sender][token] = 0;
        _totalPendingRefunds -= amount;

        // ---- INTERACTIONS ----
        IERC20(token).safeTransfer(msg.sender, amount);
        emit RefundClaimed(msg.sender, token, amount);
    }

    // ================================================================
    // VIEW / READ FUNCTIONS
    // ================================================================

    /**
     * @notice Ambil data satu produk berdasarkan ID
     */
    function getProduct(uint256 productId)
        external
        view
        validProduct(productId)
        returns (Product memory)
    {
        return _products[productId];
    }

    /**
     * @notice Ambil semua produk sekaligus
     */
    function getAllProducts() external view returns (Product[] memory) {
        Product[] memory result = new Product[](productCount);
        for (uint256 i = 1; i <= productCount; i++) {
            result[i - 1] = _products[i];
        }
        return result;
    }

    /**
     * @notice Ambil data order (header, tanpa items array)
     * @dev    Untuk items gunakan getOrderItems(orderId) terpisah
     */
    function getOrder(uint256 orderId)
        external
        view
        validOrder(orderId)
        returns (
            uint256     id,
            address     buyer,
            string memory recipientName,
            string memory recipientAddress_,
            string memory recipientPhone,
            uint256     totalAmount,
            OrderStatus status,
            address     token,
            uint256     createdAt,
            bool        refundClaimed
        )
    {
        Order storage o = _orders[orderId];
        return (
            o.orderId,
            o.buyer,
            o.recipientName,
            o.recipientAddress,
            o.recipientPhone,
            o.totalAmount,
            o.status,
            o.paymentToken,
            o.createdAt,
            o.refundClaimed
        );
    }

    /**
     * @notice Ambil semua item dalam satu order
     */
    function getOrderItems(uint256 orderId)
        external
        view
        validOrder(orderId)
        returns (OrderItem[] memory)
    {
        return _orders[orderId].items;
    }

    /**
     * @notice Ambil semua orderId milik satu wallet
     * @param wallet Alamat wallet user
     */
    function getUserOrders(address wallet) external view returns (uint256[] memory) {
        return _userOrders[wallet];
    }

    /**
     * @notice Cek saldo refund user untuk token tertentu
     * @param wallet Alamat wallet user
     * @param token  Alamat token (USDC atau token lama)
     */
    function getRefundBalance(address wallet, address token)
        external
        view
        returns (uint256)
    {
        return _refundBalance[wallet][token];
    }

    /**
     * @notice Cek berapa USDC yang bisa ditarik owner saat ini
     */
    function getWithdrawableRevenue() external view returns (uint256) {
        return _getWithdrawableRevenue();
    }

    /**
     * @notice Cek apakah kontrak sedang pause
     */
    function isPaused() external view returns (bool) {
        return paused();
    }

    // ================================================================
    // INTERNAL FUNCTIONS
    // ================================================================

    /**
     * @dev Proses cancel: update status order dan earmark dana untuk refund user.
     *      Dana fisik tetap di kontrak sampai user panggil claimRefund().
     */
    function _processCancel(uint256 orderId, address cancelledBy) internal {
        Order storage o = _orders[orderId];

        require(
            o.status != OrderStatus.Completed && o.status != OrderStatus.Cancelled,
            "Order sudah final"
        );

        OrderStatus oldStatus = o.status;
        o.status = OrderStatus.Cancelled;

        // Earmark dana untuk refund, per token yang dipakai saat order
        _refundBalance[o.buyer][o.paymentToken] += o.totalAmount;

        // Tambah ke total refund yang dikunci
        // (owner tidak bisa tarik dana ini via withdrawRevenue)
        _totalPendingRefunds += o.totalAmount;

        emit OrderCancelled(orderId, cancelledBy);
        emit OrderStatusUpdated(orderId, oldStatus, OrderStatus.Cancelled);
    }

    /**
     * @dev Hitung revenue yang bisa ditarik owner:
     *      = saldo token di kontrak - total refund pending semua user
     */
    function _getWithdrawableRevenue() internal view returns (uint256) {
        uint256 balance = IERC20(paymentToken).balanceOf(address(this));
        if (_totalPendingRefunds >= balance) return 0;
        return balance - _totalPendingRefunds;
    }
}
