import { useState, useEffect, useRef } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';
import { formatUSDC, parseError } from '../lib/utils';
import { X, Loader2, Image as ImageIcon, Upload } from 'lucide-react';

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        price: formatUSDC(product.price)
      });
      // Check if product has an image
      fetch(`/api/product-image/${product.id.toString()}`)
        .then(res => res.json())
        .then(data => {
          if (data.exists) {
            setImagePreview(data.imageUrl);
          }
        })
        .catch(console.error);
    }
  }, [product]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (productId: string) => {
    if (!imageFile) return;
    
    const formData = new FormData();
    formData.append('image', imageFile);
    
    try {
      const response = await fetch(`/api/upload/${productId}`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast("Gagal mengupload gambar", "error");
    }
  };

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
      let productIdToUpload = product ? product.id.toString() : null;

      if (product) {
        showToast("Mengedit produk... Konfirmasi di MetaMask", "info");
        const tx = await contract.editProduct(product.id, name, description, priceRaw);
        await tx.wait();
      } else {
        // Get current count to predict new ID
        const countBefore = await contract.productCount();
        productIdToUpload = (countBefore.toNumber() + 1).toString();
        
        showToast("Menambah produk... Konfirmasi di MetaMask", "info");
        const tx = await contract.addProduct(name, description, priceRaw);
        await tx.wait();
      }

      // Upload image if selected
      if (imageFile && productIdToUpload) {
        showToast("Mengupload gambar...", "info");
        await uploadImage(productIdToUpload);
      }

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
      <div className="bg-white w-full max-w-md flex flex-col shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-zinc-100 sticky top-0 bg-white z-10">
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
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Product Image</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-48 bg-zinc-50 border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400 gap-3 cursor-pointer hover:bg-zinc-100 hover:border-zinc-300 transition-all relative overflow-hidden group"
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-sm font-medium flex items-center gap-2">
                      <Upload className="w-4 h-4" /> Change Image
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 opacity-50" />
                  <span className="text-xs tracking-widest uppercase font-medium">Click to upload image</span>
                </>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              accept="image/*" 
              className="hidden" 
            />
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
