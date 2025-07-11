import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import Image from 'next/image'; // Add this import

// Normalize the image path to ensure the image URL is correct
const normalizeImagePath = (path) => {
  if (!path) return '';
  return path.replace(/^(\.\.\/)+assets\//, '/');
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function CategoryProducts({ params }) {
  // Ensure params is awaited before using its properties
  const { id: categoryId } = await params;

  // Fetch products based on categoryId with description and quantity
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, price, image, description, quantity')
    .eq('categoryid', categoryId);

  if (error) {
    return <div className="p-6"><p>Error loading products: {error.message}</p></div>;
  }

  // Get category name
  const { data: category } = await supabase
    .from('categories')
    .select('name')
    .eq('id', categoryId)
    .single();

  const categoryName = category?.name || "Products";

  return (
    <div className="p-6 bg-gray-50">
      <h1 className="text-2xl font-bold mb-6">{categoryName}</h1>
      
      {products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-md shadow-sm overflow-hidden">
              <Link href={`/products/${product.id}`}>
                <div className="p-2">
                  <div className="h-40 flex items-center justify-center mb-2">
                    <Image
                      src={normalizeImagePath(product.image)}
                      alt={product.name}
                      width={160}
                      height={160}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="px-1">
                    <h3 className="text-sm font-medium truncate">{product.name}</h3>
                    <p className="text-xs text-gray-500 mb-2">{product.quantity}</p>
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{product.description || "No description available"}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">$ {product.price.toFixed(2)}</span>
                      <button className="bg-gray-200 hover:bg-gray-300 rounded-full p-1">
                        <span className="block w-6 h-6 flex items-center justify-center font-bold text-gray-700">+</span>
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <p>No products found in this category.</p>
      )}
    </div>
  );
}