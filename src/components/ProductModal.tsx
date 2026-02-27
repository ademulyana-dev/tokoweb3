import { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';
import { formatUSDC, parseError } from '../lib/utils';
import { X, Loader2, Image as ImageIcon } from 'lucide-react';

interface ProductModalProps {
  product?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProductModal({ product, onClose, onSuccess }: ProductModalProps) {
  const { contract } = useWeb3();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: ''
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        price: formatUSDC(product.price)
      });
    }
  }, [product]);

  const handleSubmit = async () => {
    if (!contract) return;
    const { name, description, price } = formData;
    const priceNum = parseFloat(price);

    if (!name.trim()) { showToast("Nama produk tidak boleh kosong", "error"); return; }
    if (!description.trim()) { showToast("Deskripsi tidak boleh kosong", "error"); return; }
    if (!priceNum || priceNum <= 0) { showToast("Harga tidak valid", "error"); return; }

    const priceRaw = BigInt(Math.round(priceNum * 10**6)); // USDC decimals

    setLoading(true);
    try {
      let tx;
      if (product) {
        showToast("Mengedit produk... Konfirmasi di MetaMask", "info");
        tx = await contract.editProduct(product.id, name, description, priceRaw);
      } else {
        showToast("Menambah produk... Konfirmasi di MetaMask", "info");
        tx = await contract.addProduct(name, description, priceRaw);
      }
      await tx.wait();
      showToast(product ? "Produk berhasil diupdate! ✓" : "Produk berhasil ditambahkan! ✓", "success");
      onSuccess();
    } catch (e) {
      showToast("Gagal: " + parseError(e), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-zinc-100">
          <h2 className="text-xl font-serif text-zinc-900">
            {product ? 'Edit Product' : 'Add Product'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          <div className="w-full h-32 bg-zinc-50 border border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400 gap-2">
            <ImageIcon className="w-8 h-8 opacity-50" />
            <span className="text-xs tracking-widest uppercase">Image handled by frontend</span>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Product Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-transparent border-b border-zinc-200 px-0 py-2 text-sm focus:outline-none focus:border-zinc-900 transition-colors placeholder:text-zinc-400"
              placeholder="e.g. Premium Cotton T-Shirt"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-transparent border-b border-zinc-200 px-0 py-2 text-sm min-h-[80px] resize-y focus:outline-none focus:border-zinc-900 transition-colors placeholder:text-zinc-400"
              placeholder="Product details..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Price (USDC)</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full bg-transparent border-b border-zinc-200 px-0 py-2 text-sm focus:outline-none focus:border-zinc-900 transition-colors font-mono placeholder:text-zinc-400"
              placeholder="10.5"
              min="0"
              step="0.000001"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-4 mt-4 bg-zinc-900 text-white text-sm tracking-widest uppercase font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              product ? 'Save Changes' : 'Add Product'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
