import { useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';
import { parseError } from '../lib/utils';
import { STATUS_LABELS, STATUS_CLASSES } from '../lib/constants';
import { X, Loader2 } from 'lucide-react';

interface StatusModalProps {
  orderId: number;
  currentStatus: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StatusModal({ orderId, currentStatus, onClose, onSuccess }: StatusModalProps) {
  const { contract } = useWeb3();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState(currentStatus + 1);

  const handleSubmit = async () => {
    if (!contract) return;
    setLoading(true);
    try {
      showToast(`Update status order #${orderId}... Konfirmasi di MetaMask`, "info");
      const tx = await contract.updateOrderStatus(orderId, newStatus);
      await tx.wait();
      showToast(`Status order #${orderId} berhasil diupdate ke "${STATUS_LABELS[newStatus]}"`, "success");
      onSuccess();
    } catch (e) {
      showToast("Gagal update status: " + parseError(e), "error");
    } finally {
      setLoading(false);
    }
  };

  const options = [];
  for (let i = currentStatus + 1; i <= 4; i++) {
    options.push({ value: i, label: STATUS_LABELS[i] });
  }
  if (currentStatus <= 1) {
    options.push({ value: 5, label: 'Dibatalkan (Cancel)' });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-zinc-100">
          <h2 className="text-xl font-serif text-zinc-900">Update Status</h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between bg-zinc-50 p-4 border border-zinc-100">
            <span className="text-sm text-zinc-500">Order <span className="font-mono text-zinc-900 font-bold">#{orderId}</span></span>
            <span className={`px-2 py-1 text-xs font-medium border ${STATUS_CLASSES[currentStatus]}`}>
              {STATUS_LABELS[currentStatus]}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">New Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(parseInt(e.target.value))}
              className="w-full bg-transparent border-b border-zinc-200 px-0 py-2 text-sm focus:outline-none focus:border-zinc-900 transition-colors text-zinc-900 appearance-none"
            >
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || options.length === 0}
            className="w-full flex items-center justify-center gap-2 py-4 mt-4 bg-zinc-900 text-white text-sm tracking-widest uppercase font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Update Status'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
