import { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';
import { getProductEmoji, formatUSDC } from '../lib/utils';
import { ShoppingBag, Loader2 } from 'lucide-react';
import CartModal from '../components/CartModal';

export default function StorePage() {
  const { readContract, walletAddress } = useWeb3();
  const { showToast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, { product: any; qty: number }>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [readContract]);

  const loadProducts = async () => {
    if (!readContract) return;
    try {
      setLoading(true);
      const data = await readContract.getAllProducts();
      setProducts(data);
    } catch (e) {
      console.error(e);
      showToast("Gagal memuat produk", "error");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: any) => {
    if (!walletAddress) {
      showToast("Connect wallet dulu", "error");
      return;
    }
    const pid = product.id.toString();
    setCart((prev) => {
      const newCart = { ...prev };
      if (newCart[pid]) {
        newCart[pid].qty += 1;
      } else {
        newCart[pid] = { product, qty: 1 };
      }
      return newCart;
    });
    showToast(`${product.name} ditambahkan ke keranjang`, "success");
  };

  let cartCount = 0;
  Object.values(cart).forEach((item: any) => {
    cartCount += item.qty;
  });

  return (
    <div className="animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif text-zinc-900 mb-4">Latest Collection</h1>
          <p className="text-zinc-500 max-w-xl leading-relaxed">
            Discover our carefully curated selection of premium garments. 
            {loading ? " Loading..." : ` Showing ${products.length} items.`}
          </p>
        </div>
        {cartCount > 0 && (
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-3 px-6 py-3 bg-zinc-900 text-white hover:bg-zinc-800 transition-colors shrink-0"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-sm tracking-widest uppercase font-medium">Cart ({cartCount})</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p className="text-sm tracking-widest uppercase">Loading Collection...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-zinc-400 border border-zinc-200 bg-white">
          <ShoppingBag className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-sm tracking-widest uppercase">No items available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
          {products.map((p) => {
            const inCart = cart[p.id.toString()];
            return (
              <div key={p.id.toString()} className="group flex flex-col">
                <div className="aspect-[3/4] bg-zinc-100 flex items-center justify-center text-6xl mb-4 overflow-hidden relative">
                  <div className="group-hover:scale-110 transition-transform duration-700 ease-out">
                    {getProductEmoji(p.name)}
                  </div>
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                <div className="flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-serif text-lg text-zinc-900">{p.name}</h3>
                    <span className="font-mono text-xs text-zinc-400 mt-1">#{p.id.toString()}</span>
                  </div>
                  <p className="text-sm text-zinc-500 line-clamp-2 mb-4 flex-1">{p.description}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                    <div className="font-mono text-zinc-900">
                      {formatUSDC(p.price)} <span className="text-xs text-zinc-500">USDC</span>
                    </div>
                    <button
                      onClick={() => addToCart(p)}
                      disabled={!walletAddress}
                      className={`text-xs tracking-widest uppercase font-medium transition-colors ${
                        !walletAddress
                          ? 'text-zinc-300 cursor-not-allowed'
                          : inCart
                          ? 'text-zinc-900 border-b border-zinc-900'
                          : 'text-zinc-500 hover:text-zinc-900'
                      }`}
                    >
                      {inCart ? `Added (${inCart.qty})` : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isCartOpen && (
        <CartModal
          cart={cart}
          setCart={setCart}
          onClose={() => setIsCartOpen(false)}
          onCheckoutSuccess={() => {
            setCart({});
            setIsCartOpen(false);
          }}
        />
      )}
    </div>
  );
}
