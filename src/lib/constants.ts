export const CONTRACT_ADDRESS = "0xD909C6961Cd9b6a3CefAa6198fa92f963aeB3994";
export const USDC_ADDRESS = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";
export const SEPOLIA_CHAIN_ID = 11155111;
export const RPC_URL = "https://lb.drpc.live/sepolia/AnmpasF2C0JBqeAEzxVO8aTDnH6wviUR8JD3QmlfqV1j";
export const USDC_DECIMALS = 6;

export const CONTRACT_ABI = [
  "function owner() view returns (address)",
  "function paymentToken() view returns (address)",
  "function productCount() view returns (uint256)",
  "function orderCount() view returns (uint256)",
  "function isPaused() view returns (bool)",
  "function AUTO_CANCEL_PERIOD() view returns (uint256)",
  "function getProduct(uint256) view returns (tuple(uint256 id, string name, string description, uint256 price))",
  "function getAllProducts() view returns (tuple(uint256 id, string name, string description, uint256 price)[])",
  "function getOrder(uint256) view returns (uint256,address,string,string,string,uint256,uint8,address,uint256,bool)",
  "function getOrderItems(uint256) view returns (tuple(uint256 productId, string productName, uint256 productPrice, uint256 quantity, uint256 subtotal)[])",
  "function getUserOrders(address) view returns (uint256[])",
  "function getRefundBalance(address,address) view returns (uint256)",
  "function getWithdrawableRevenue() view returns (uint256)",
  "function addProduct(string,string,uint256)",
  "function editProduct(uint256,string,string,uint256)",
  "function updateOrderStatus(uint256,uint8)",
  "function withdrawRevenue(uint256)",
  "function setPaymentToken(address)",
  "function pause()",
  "function unpause()",
  "function transferOwnership(address)",
  "function createOrder(string,string,string,tuple(uint256 productId,uint256 quantity)[])",
  "function cancelOrder(uint256)",
  "function cancelExpiredOrder(uint256)",
  "function claimRefund(address)",
];

export const USDC_ABI = [
  "function approve(address,uint256) returns (bool)",
  "function allowance(address,address) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

export const STATUS_LABELS = ['Pending','Dikonfirmasi','Diproses','Dikirim','Selesai','Dibatalkan'];
export const STATUS_CLASSES = [
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-purple-50 text-purple-700 border-purple-200',
  'bg-indigo-50 text-indigo-700 border-indigo-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-rose-50 text-rose-700 border-rose-200'
];
