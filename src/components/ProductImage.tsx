import { useState, useEffect } from 'react';
import { getProductEmoji } from '../lib/utils';

interface ProductImageProps {
  productId: string;
  productName: string;
  className?: string;
}

export default function ProductImage({ productId, productName, className = "" }: ProductImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/product-image/${productId}`)
      .then(res => res.json())
      .then(data => {
        if (data.exists) {
          // Add a timestamp to bypass browser cache if the image was just updated
          setImageUrl(`${data.imageUrl}?t=${new Date().getTime()}`);
        } else {
          setImageUrl(null);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch product image", err);
        setImageUrl(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [productId]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-zinc-100 animate-pulse ${className}`}>
        <div className="w-8 h-8 rounded-full bg-zinc-200" />
      </div>
    );
  }

  if (imageUrl) {
    return (
      <img 
        src={imageUrl} 
        alt={productName} 
        className={`object-cover ${className}`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className={`flex items-center justify-center bg-zinc-100 text-6xl ${className}`}>
      {getProductEmoji(productName)}
    </div>
  );
}
