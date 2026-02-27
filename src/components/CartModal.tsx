import React, { useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';
import { formatUSDC, parseError } from '../lib/utils';
import { X, Minus, Plus, Loader2, Info, ShoppingBag } from 'lucide-react';
import { CONTRACT_ADDRESS } from '../lib/constants';
import { motion, AnimatePresence } from 'motion/react';

interface CartModalProps {
  cart: Record<string, { product: any; qty: number }>;
  setCart: React.Dispatch<React.SetStateAction<Record<string, { product: any; qty: number }>>>;
  onClose: () => void;
  onCheckoutSuccess: () => void;
}

export default function CartModal({ cart, setCart, onClose, onCheckoutSuccess }: CartModalProps) {
  const { contract, usdcContract, walletAddress } = useWeb3();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [recipient, setRecipient] = useState({ name: '', address: '', phone: '' });

  const items = Object.values(cart);
  let totalRaw = BigInt(0);

  items.forEach((item) => {
    const subtotal = BigInt(item.product.price.toString()) * BigInt(item.qty);
    totalRaw += subtotal;
  });

  const changeQty = (pid: string, delta: number) => {
    setCart((prev) => {
      const newCart = { ...prev };
      if (!newCart[pid]) return prev;
      newCart[pid].qty = Math.max(1, newCart[pid].qty + delta);
      return newCart;
    });
  };

  const remove = (pid: string) => {
    setCart((prev) => {
      const newCart = { ...prev };
      delete newCart[pid];
      return newCart;
    });
  };

  const checkout = async () => {
    if (!walletAddress || !contract || !usdcContract) {
      showToast("Connect wallet dulu", "error");
      return;
    }
    if (!recipient.name || !recipient.address || !recipient.phone) {
      showToast("Lengkapi data penerima", "error");
      return;
    }

    const contractItems = items.map((item) => ({
      productId: item.product.id,
      quantity: item.qty,
    }));

    setLoading(true);
    try {
      showToast("Step 1/2: Approve USDC... Konfirmasi di MetaMask", "info");
      const currentAllowance = await usdcContract.allowance(walletAddress, CONTRACT_ADDRESS);
      
      if (BigInt(currentAllowance.toString()) < totalRaw) {
        const approveTx = await usdcContract.approve(CONTRACT_ADDRESS, totalRaw.toString());
        showToast("Menunggu konfirmasi approve...", "info");
        await approveTx.wait();
        showToast("Approve berhasil! ✓", "success");
      }

      showToast("Step 2/2: Membuat order... Konfirmasi di MetaMask", "info");
      const tx = await contract.createOrder(recipient.name, recipient.address, recipient.phone, contractItems);
      showToast("Menunggu konfirmasi order...", "info");
      await tx.wait();

      showToast("Order berhasil dibuat! 🎉", "success");
      onCheckoutSuccess();
    } catch (e) {
      console.error(e);
      showToast("Gagal: " + parseError(e), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-zinc-200 w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-zinc-100">
          <h2 className="text-xl font-serif text-zinc-900 flex items-center gap-3">
            <ShoppingBag className="w-5 h-5" />
            Keranjang Belanja
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {items.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-10 text-zinc-500 tracking-widest uppercase text-xs"
            >
              Keranjang kosong
            </motion.div>
          ) : (
            <div className="flex flex-col gap-4">
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, x: -20 }}
                    transition={{ duration: 0.2 }}
                    key={item.product.id.toString()} 
                    className="flex items-center gap-4 py-3 border-b border-zinc-100"
                  >
                    <div className="flex-1">
                      <h4 className="font-serif text-zinc-900">{item.product.name}</h4>
                      <div className="text-xs font-mono text-zinc-500 mt-1">
                        {formatUSDC(item.product.price)} USDC
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => changeQty(item.product.id.toString(), -1)}
                        className="p-1.5 bg-zinc-50 border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 transition-colors active:scale-95"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <motion.span 
                        key={item.qty}
                        initial={{ scale: 1.5, color: '#10b981' }}
                        animate={{ scale: 1, color: '#18181b' }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="font-mono w-6 text-center text-zinc-900 inline-block"
                      >
                        {item.qty}
                      </motion.span>
                      <button
                        onClick={() => changeQty(item.product.id.toString(), 1)}
                        className="p-1.5 bg-zinc-50 border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 transition-colors active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <motion.div 
                      key={item.qty + "price"}
                      initial={{ opacity: 0.5 }}
                      animate={{ opacity: 1 }}
                      className="font-mono font-medium text-zinc-900 min-w-[80px] text-right"
                    >
                      {formatUSDC(BigInt(item.product.price.toString()) * BigInt(item.qty))}
                    </motion.div>
                    <button
                      onClick={() => remove(item.product.id.toString())}
                      className="p-2 text-zinc-400 hover:text-rose-600 transition-colors active:scale-90"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              <motion.div layout className="flex items-center justify-between py-4 text-lg font-serif text-zinc-900">
                <span>Total</span>
                <motion.span 
                  key={totalRaw.toString()}
                  initial={{ scale: 1.1, color: '#10b981' }}
                  animate={{ scale: 1, color: '#18181b' }}
                  className="font-mono font-medium"
                >
                  {formatUSDC(totalRaw)} USDC
                </motion.span>
              </motion.div>

              <motion.div layout className="bg-zinc-50 p-6 border border-zinc-200 flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Data Penerima</h3>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-zinc-500">Nama Lengkap</label>
                  <input
                    type="text"
                    value={recipient.name}
                    onChange={(e) => setRecipient({ ...recipient, name: e.target.value })}
                    className="w-full bg-white border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-900 transition-colors text-zinc-900 placeholder:text-zinc-400"
                    placeholder=""
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-zinc-500">Alamat Pengiriman</label>
                  <textarea
                    value={recipient.address}
                    onChange={(e) => setRecipient({ ...recipient, address: e.target.value })}
                    className="w-full bg-white border border-zinc-200 px-4 py-2.5 text-sm min-h-[80px] resize-y focus:outline-none focus:border-zinc-900 transition-colors text-zinc-900 placeholder:text-zinc-400"
                    placeholder=""
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-zinc-500">No. HP</label>
                  <input
                    type="tel"
                    value={recipient.phone}
                    onChange={(e) => setRecipient({ ...recipient, phone: e.target.value })}
                    className="w-full bg-white border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-900 transition-colors text-zinc-900 placeholder:text-zinc-400"
                    placeholder=""
                  />
                </div>
              </motion.div>

              <motion.div layout className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 text-blue-800 text-xs leading-relaxed">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Transaksi memerlukan 2 step: <strong>Approve</strong> USDC → <strong>Beli</strong>. 
                  Konfirmasi dua kali di MetaMask.
                </p>
              </motion.div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-100 bg-zinc-50">
          <button
            onClick={checkout}
            disabled={loading || items.length === 0}
            className="w-full flex items-center justify-center gap-2 py-4 bg-zinc-900 text-white text-xs tracking-widest uppercase font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Memproses...
              </>
            ) : (
              'Lanjut Bayar dengan USDC'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
