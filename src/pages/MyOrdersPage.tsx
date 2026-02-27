import { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';
import { formatUSDC, parseError } from '../lib/utils';
import { STATUS_LABELS, STATUS_CLASSES } from '../lib/constants';
import { Package, Loader2, ChevronDown, ChevronUp, AlertCircle, RefreshCw } from 'lucide-react';

export default function MyOrdersPage() {
  const { contract, walletAddress } = useWeb3();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refundBalance, setRefundBalance] = useState<bigint>(0n);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (walletAddress && contract) {
      loadOrders();
      checkRefund();
    }
  }, [walletAddress, contract]);

  const loadOrders = async () => {
    if (!contract || !walletAddress) return;
    try {
      setLoading(true);
      const orderIds = await contract.getUserOrders(walletAddress);
      
      const fetchedOrders = [];
      for (const id of orderIds) {
        const o = await contract.getOrder(id);
        const items = await contract.getOrderItems(id);
        fetchedOrders.push({ id, data: o, items });
      }
      
      fetchedOrders.sort((a, b) => b.data[8].toNumber() - a.data[8].toNumber());
      setOrders(fetchedOrders);
    } catch (e) {
      console.error(e);
      showToast("Gagal memuat order", "error");
    } finally {
      setLoading(false);
    }
  };

  const checkRefund = async () => {
    if (!contract || !walletAddress) return;
    try {
      const payToken = await contract.paymentToken();
      const balance = await contract.getRefundBalance(walletAddress, payToken);
      setRefundBalance(BigInt(balance.toString()));
    } catch (e) {
      console.error(e);
    }
  };

  const claimRefund = async () => {
    if (!contract) return;
    try {
      const payToken = await contract.paymentToken();
      showToast("Klaim refund... Konfirmasi di MetaMask", "info");
      const tx = await contract.claimRefund(payToken);
      await tx.wait();
      showToast("Refund berhasil diklaim! 💰", "success");
      checkRefund();
    } catch (e) {
      showToast("Gagal klaim refund: " + parseError(e), "error");
    }
  };

  const cancelOrder = async (orderId: number) => {
    if (!contract) return;
    if (!confirm(`Yakin ingin membatalkan order #${orderId}?`)) return;
    try {
      showToast("Membatalkan order... Konfirmasi di MetaMask", "info");
      const tx = await contract.cancelOrder(orderId);
      await tx.wait();
      showToast(`Order #${orderId} berhasil dibatalkan. Refund siap diklaim.`, "success");
      loadOrders();
      checkRefund();
    } catch (e) {
      showToast("Gagal cancel: " + parseError(e), "error");
    }
  };

  const toggleOrder = (id: string) => {
    setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (!walletAddress) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-zinc-500 animate-in fade-in duration-500">
        <Package className="w-16 h-16 mb-6 opacity-20" />
        <h2 className="text-xl font-serif text-zinc-900 mb-2">Connect Wallet</h2>
        <p>Silakan connect wallet untuk melihat order Anda.</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-700">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif text-zinc-900 mb-4">My Orders</h1>
          <p className="text-zinc-500 max-w-xl leading-relaxed">
            {loading ? "Loading orders..." : `You have ${orders.length} orders in your history.`}
          </p>
        </div>
        <button
          onClick={loadOrders}
          className="p-3 bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 transition-colors rounded-full"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-zinc-900' : ''}`} />
        </button>
      </div>

      {refundBalance > 0n && (
        <div className="mb-12 p-6 bg-emerald-50 border border-emerald-100 flex items-center justify-between gap-4 animate-in slide-in-from-top-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-serif text-emerald-900">Refund Available!</h3>
              <p className="text-sm text-emerald-700 mt-1">
                Balance: <span className="font-mono font-bold">{formatUSDC(refundBalance)} USDC</span>
              </p>
            </div>
          </div>
          <button
            onClick={claimRefund}
            className="px-6 py-3 bg-emerald-600 text-white text-sm tracking-widest uppercase font-medium hover:bg-emerald-700 transition-colors"
          >
            Claim Refund
          </button>
        </div>
      )}

      {loading && orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p className="text-sm tracking-widest uppercase">Loading Orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-zinc-400 border border-zinc-200 bg-white">
          <Package className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-sm tracking-widest uppercase">No orders found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {orders.map((o) => {
            const [orderId, buyer, recipientName, recipientAddress, recipientPhone, totalAmount, status, payToken, createdAt, refundClaimed] = o.data;
            const statusNum = parseInt(status);
            const isExpanded = expandedOrders[orderId.toString()];
            const date = new Date(createdAt.toNumber() * 1000).toLocaleDateString('en-US', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            return (
              <div key={orderId.toString()} className="bg-white border border-zinc-200 transition-all hover:border-zinc-300">
                <div
                  onClick={() => toggleOrder(orderId.toString())}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-6 cursor-pointer hover:bg-zinc-50 transition-colors gap-4"
                >
                  <div className="flex items-center gap-6">
                    <div className="font-mono text-lg font-medium text-zinc-900">#{orderId.toString()}</div>
                    <div className={`px-3 py-1 text-xs font-medium border ${STATUS_CLASSES[statusNum]}`}>
                      {STATUS_LABELS[statusNum]}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-8 w-full sm:w-auto">
                    <div className="text-right">
                      <div className="font-mono font-medium text-zinc-900">{formatUSDC(totalAmount)} USDC</div>
                      <div className="text-xs text-zinc-500 mt-1">{date}</div>
                    </div>
                    <div className="text-zinc-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-6 border-t border-zinc-100 bg-zinc-50 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      <div className="space-y-5">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Recipient</p>
                          <p className="text-sm text-zinc-900">{recipientName}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Phone</p>
                          <p className="text-sm text-zinc-900">{recipientPhone}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Shipping Address</p>
                          <p className="text-sm text-zinc-900">{recipientAddress}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-5">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Payment Token</p>
                          <p className="text-xs font-mono text-zinc-500 bg-zinc-100 px-2 py-1 inline-block break-all border border-zinc-200">
                            {payToken}
                          </p>
                        </div>
                        {statusNum === 5 && (
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Refund Status</p>
                            <p className={`text-sm font-medium ${refundClaimed ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {refundClaimed ? 'Claimed ✓' : 'Pending ⏳'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-zinc-200 bg-white">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-widest border-b border-zinc-200">
                          <tr>
                            <th className="px-6 py-4 font-medium">Product</th>
                            <th className="px-6 py-4 font-medium">Price</th>
                            <th className="px-6 py-4 font-medium text-center">Qty</th>
                            <th className="px-6 py-4 font-medium text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {o.items.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                              <td className="px-6 py-4 text-zinc-900">{item.productName}</td>
                              <td className="px-6 py-4 font-mono text-zinc-500">{formatUSDC(item.productPrice)}</td>
                              <td className="px-6 py-4 font-mono text-zinc-500 text-center">{item.quantity.toString()}</td>
                              <td className="px-6 py-4 font-mono text-zinc-900 text-right">{formatUSDC(item.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {statusNum === 0 && (
                      <div className="mt-8 flex justify-end pt-6 border-t border-zinc-200">
                        <button
                          onClick={() => cancelOrder(orderId.toNumber())}
                          className="px-6 py-3 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-sm tracking-widest uppercase font-medium transition-colors"
                        >
                          Cancel Order
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
