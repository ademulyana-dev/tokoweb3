import { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';
import { formatUSDC, parseError } from '../lib/utils';
import { STATUS_LABELS, STATUS_CLASSES } from '../lib/constants';
import { ShieldAlert, RefreshCw, Plus, Edit2, Settings, DollarSign, PackageOpen, ListOrdered } from 'lucide-react';
import ProductModal from '../components/ProductModal';
import StatusModal from '../components/StatusModal';

export default function OwnerPage() {
  const { contract, walletAddress, isOwner } = useWeb3();
  const { showToast } = useToast();
  
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    revenue: 0n,
    paused: false,
    owner: '',
    token: ''
  });
  
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  
  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<{ id: number, status: number } | null>(null);

  // Forms
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [newTokenAddress, setNewTokenAddress] = useState('');
  const [newOwnerAddress, setNewOwnerAddress] = useState('');

  useEffect(() => {
    if (isOwner && contract) {
      loadData();
    }
  }, [isOwner, contract]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadStats(), loadOrders(), loadProducts()]);
    setLoading(false);
  };

  const loadStats = async () => {
    if (!contract) return;
    try {
      const [prodCount, ordCount, revenue, paused, ownerAddr, payToken] = await Promise.all([
        contract.productCount(),
        contract.orderCount(),
        contract.getWithdrawableRevenue(),
        contract.isPaused(),
        contract.owner(),
        contract.paymentToken(),
      ]);
      setStats({
        products: prodCount.toNumber(),
        orders: ordCount.toNumber(),
        revenue: BigInt(revenue.toString()),
        paused,
        owner: ownerAddr,
        token: payToken
      });
    } catch (e) {
      console.error(e);
    }
  };

  const loadOrders = async () => {
    if (!contract) return;
    try {
      const count = await contract.orderCount();
      const total = count.toNumber();
      const fetched = [];
      for (let i = total; i >= 1; i--) {
        const o = await contract.getOrder(i);
        const items = await contract.getOrderItems(i);
        fetched.push({ id: i, data: o, items });
      }
      setOrders(fetched);
    } catch (e) {
      console.error(e);
    }
  };

  const loadProducts = async () => {
    if (!contract) return;
    try {
      const data = await contract.getAllProducts();
      setProducts(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleWithdraw = async () => {
    if (!contract) return;
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      showToast("Jumlah tidak valid", "error");
      return;
    }
    try {
      const raw = BigInt(Math.round(amount * 10**6)); // USDC decimals
      showToast("Withdraw revenue... Konfirmasi di MetaMask", "info");
      const tx = await contract.withdrawRevenue(raw);
      await tx.wait();
      showToast("Withdraw berhasil!", "success");
      setWithdrawAmount('');
      loadStats();
    } catch (e) {
      showToast("Gagal withdraw: " + parseError(e), "error");
    }
  };

  const handleSetToken = async () => {
    if (!contract) return;
    if (!confirm(`Yakin ganti token ke ${newTokenAddress}?`)) return;
    try {
      showToast("Ganti token... Konfirmasi di MetaMask", "info");
      const tx = await contract.setPaymentToken(newTokenAddress);
      await tx.wait();
      showToast("Token berhasil diganti!", "success");
      setNewTokenAddress('');
      loadStats();
    } catch (e) {
      showToast("Gagal ganti token: " + parseError(e), "error");
    }
  };

  const handleTogglePause = async () => {
    if (!contract) return;
    const action = stats.paused ? 'unpause' : 'pause';
    if (!confirm(`Yakin ingin ${action.toUpperCase()} kontrak?`)) return;
    try {
      showToast(`${action} kontrak... Konfirmasi di MetaMask`, "info");
      const tx = await contract[action]();
      await tx.wait();
      showToast(`Kontrak berhasil di-${action}!`, "success");
      loadStats();
    } catch (e) {
      showToast(`Gagal ${action}: ` + parseError(e), "error");
    }
  };

  const handleTransferOwnership = async () => {
    if (!contract) return;
    if (!confirm(`PERINGATAN! Transfer ownership ke ${newOwnerAddress}? Anda akan kehilangan akses.`)) return;
    try {
      showToast("Transfer ownership... Konfirmasi di MetaMask", "info");
      const tx = await contract.transferOwnership(newOwnerAddress);
      await tx.wait();
      showToast("Ownership berhasil ditransfer!", "success");
      setNewOwnerAddress('');
      window.location.reload();
    } catch (e) {
      showToast("Gagal transfer: " + parseError(e), "error");
    }
  };

  if (!walletAddress || !isOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-zinc-500 animate-in fade-in duration-500">
        <ShieldAlert className="w-16 h-16 mb-6 text-rose-500/50" />
        <h2 className="text-xl font-serif text-zinc-900 mb-2">Access Denied</h2>
        <p>Halaman ini hanya untuk owner kontrak.</p>
      </div>
    );
  }

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(o => o.data[6].toString() === filter);

  return (
    <div className="animate-in fade-in duration-700 space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif text-zinc-900 mb-4 flex items-center gap-4">
            <Settings className="w-10 h-10 text-zinc-900" />
            Dashboard
          </h1>
          <p className="text-xs font-mono text-zinc-500 bg-zinc-100 px-3 py-1.5 inline-block border border-zinc-200">
            {stats.owner}
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-3 bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 transition-colors rounded-full"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-zinc-900' : ''}`} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-zinc-200 p-8">
          <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Total Products</div>
          <div className="text-4xl font-mono text-zinc-900">{stats.products}</div>
        </div>
        <div className="bg-white border border-zinc-200 p-8">
          <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Total Orders</div>
          <div className="text-4xl font-mono text-zinc-900">{stats.orders}</div>
        </div>
        <div className="bg-white border border-zinc-200 p-8">
          <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Revenue</div>
          <div className="text-4xl font-mono text-zinc-900">{formatUSDC(stats.revenue)}</div>
        </div>
        <div className="bg-white border border-zinc-200 p-8">
          <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Status</div>
          <div className={`text-2xl font-serif ${stats.paused ? 'text-rose-600' : 'text-emerald-600'}`}>
            {stats.paused ? 'PAUSED' : 'ACTIVE'}
          </div>
        </div>
      </div>

      {/* Orders Management */}
      <div className="bg-white border border-zinc-200">
        <div className="p-6 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <h2 className="text-xl font-serif text-zinc-900 flex items-center gap-3">
            <ListOrdered className="w-6 h-6" />
            Order Management
          </h2>
          <div className="flex flex-wrap gap-2">
            {['all', '0', '1', '2', '3', '4', '5'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-xs font-medium tracking-widest uppercase transition-colors border ${
                  filter === f 
                    ? 'bg-zinc-900 text-white border-zinc-900' 
                    : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:text-zinc-900'
                }`}
              >
                {f === 'all' ? 'All' : STATUS_LABELS[parseInt(f)]}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-widest border-b border-zinc-200">
              <tr>
                <th className="px-6 py-4 font-medium">ID</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Total</th>
                <th className="px-6 py-4 font-medium">Buyer</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500 tracking-widest uppercase text-xs">No orders found</td>
                </tr>
              ) : (
                filteredOrders.map(o => {
                  const statusNum = parseInt(o.data[6]);
                  return (
                    <tr key={o.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-zinc-900">#{o.id}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium border ${STATUS_CLASSES[statusNum]}`}>
                          {STATUS_LABELS[statusNum]}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-zinc-900">{formatUSDC(o.data[5])} USDC</td>
                      <td className="px-6 py-4 font-mono text-xs text-zinc-500">{o.data[1].slice(0,6)}...{o.data[1].slice(-4)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setEditingOrder({ id: o.id, status: statusNum });
                            setIsStatusModalOpen(true);
                          }}
                          disabled={statusNum >= 4}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium tracking-widest uppercase"
                        >
                          <Edit2 className="w-3 h-3" />
                          Update
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Products Management */}
      <div className="bg-white border border-zinc-200">
        <div className="p-6 border-b border-zinc-200 flex items-center justify-between">
          <h2 className="text-xl font-serif text-zinc-900 flex items-center gap-3">
            <PackageOpen className="w-6 h-6" />
            Product Management
          </h2>
          <button
            onClick={() => {
              setEditingProduct(null);
              setIsProductModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white text-xs tracking-widest uppercase font-medium hover:bg-zinc-800 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.length === 0 ? (
            <div className="col-span-full py-12 text-center text-zinc-500 tracking-widest uppercase text-xs">No products found</div>
          ) : (
            products.map(p => (
              <div key={p.id.toString()} className="bg-white border border-zinc-200 p-6 flex flex-col gap-4 hover:border-zinc-300 transition-colors">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-serif text-lg text-zinc-900 mb-1">{p.name}</h3>
                    <div className="text-xs font-mono text-zinc-500">ID: {p.id.toString()}</div>
                  </div>
                  <div className="font-mono text-zinc-900 font-medium">{formatUSDC(p.price)}</div>
                </div>
                <p className="text-sm text-zinc-500 line-clamp-2 flex-1">{p.description}</p>
                <button
                  onClick={() => {
                    setEditingProduct(p);
                    setIsProductModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 transition-colors text-xs font-medium tracking-widest uppercase mt-4"
                >
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Config Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Withdraw */}
        <div className="bg-white border border-zinc-200 p-8 flex flex-col gap-6">
          <h3 className="font-serif text-xl text-zinc-900 flex items-center gap-3">
            <DollarSign className="w-6 h-6" />
            Withdraw Revenue
          </h3>
          <div className="text-sm text-zinc-500">
            Available: <span className="text-zinc-900 font-mono font-medium">{formatUSDC(stats.revenue)} USDC</span>
          </div>
          <input
            type="number"
            placeholder="Amount in USDC"
            value={withdrawAmount}
            onChange={e => setWithdrawAmount(e.target.value)}
            className="w-full bg-transparent border-b border-zinc-200 px-0 py-2 text-sm focus:outline-none focus:border-zinc-900 transition-colors placeholder:text-zinc-400"
          />
          <button
            onClick={handleWithdraw}
            className="w-full py-3 bg-zinc-900 text-white text-xs tracking-widest uppercase font-medium hover:bg-zinc-800 transition-colors mt-auto"
          >
            Withdraw
          </button>
        </div>

        {/* Contract Control */}
        <div className="bg-white border border-zinc-200 p-8 flex flex-col gap-6">
          <h3 className="font-serif text-xl text-zinc-900 flex items-center gap-3">
            <Settings className="w-6 h-6" />
            Contract Control
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Payment Token</label>
              <div className="text-xs font-mono text-zinc-500 bg-zinc-50 p-3 border border-zinc-200 break-all">
                {stats.token}
              </div>
            </div>
            <input
              type="text"
              placeholder="0x... (New Token)"
              value={newTokenAddress}
              onChange={e => setNewTokenAddress(e.target.value)}
              className="w-full bg-transparent border-b border-zinc-200 px-0 py-2 text-sm focus:outline-none focus:border-zinc-900 transition-colors placeholder:text-zinc-400"
            />
            <button
              onClick={handleSetToken}
              className="w-full py-3 bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 transition-colors text-xs font-medium tracking-widest uppercase"
            >
              Change Token
            </button>
          </div>
          <div className="pt-6 border-t border-zinc-100 mt-auto">
            <button
              onClick={handleTogglePause}
              className={`w-full py-3 text-xs tracking-widest uppercase font-medium transition-colors border ${
                stats.paused 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
            >
              {stats.paused ? 'UNPAUSE CONTRACT' : 'PAUSE CONTRACT'}
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-rose-50 border border-rose-200 p-8 flex flex-col gap-6">
          <h3 className="font-serif text-xl text-rose-900 flex items-center gap-3">
            <ShieldAlert className="w-6 h-6" />
            Danger Zone
          </h3>
          <p className="text-sm text-rose-700 leading-relaxed">
            Transferring ownership is permanent. You will lose access to this dashboard.
          </p>
          <input
            type="text"
            placeholder="0x... (New Owner)"
            value={newOwnerAddress}
            onChange={e => setNewOwnerAddress(e.target.value)}
            className="w-full bg-transparent border-b border-rose-300 px-0 py-2 text-sm focus:outline-none focus:border-rose-900 transition-colors placeholder:text-rose-400 text-rose-900"
          />
          <button
            onClick={handleTransferOwnership}
            className="w-full py-3 bg-rose-600 text-white text-xs tracking-widest uppercase font-medium hover:bg-rose-700 transition-colors mt-auto"
          >
            Transfer Ownership
          </button>
        </div>
      </div>

      {/* Modals */}
      {isProductModalOpen && (
        <ProductModal
          product={editingProduct}
          onClose={() => setIsProductModalOpen(false)}
          onSuccess={() => {
            setIsProductModalOpen(false);
            loadData();
          }}
        />
      )}

      {isStatusModalOpen && editingOrder && (
        <StatusModal
          orderId={editingOrder.id}
          currentStatus={editingOrder.status}
          onClose={() => setIsStatusModalOpen(false)}
          onSuccess={() => {
            setIsStatusModalOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
