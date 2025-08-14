import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import Image from 'next/image';

// Normalize the image path to ensure the image URL is correct
const normalizeImagePath = (path) => {
  if (!path) return '/placeholder-product.jpg';
  const imagePath = Array.isArray(path) ? (path[0] || '/placeholder-product.jpg') : path;
  return imagePath.replace(/^(\.\.\/)+assets\//, '/');
};

// Normalize product name for comparison (trim, lowercase, remove extra spaces)
const normalizeProductName = (name) => {
  return name
    ?.trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
    || '';
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function CategoryProducts({ params, searchParams }) {
  const { id: categoryId } = await params; // Await params to read id
  const storeId = (await searchParams).store || null; // Await searchParams to read store

  // Build Supabase query
  let query = supabase
    .from('products')
    .select('id, name, price, image, description, quantity, supermarket_id')
    .eq('categoryid', categoryId);

  // If store filter is present, apply it
  if (storeId) {
    query = query.eq('supermarket_id', storeId);
  }

  const { data: allProducts, error } = await query;

  if (error) {
    return (
      <div className="p-6">
        <p>Error loading products: {error.message}</p>
      </div>
    );
  }

  // Debug: Log raw products to check for duplicates
  

  // Group products by normalized name and select the one with the lowest price
  const products = Object.values(
    allProducts.reduce((acc, product) => {
      const normalizedName = normalizeProductName(product.name);
      const existing = acc[normalizedName];
      if (!existing || product.price < existing.price) {
        acc[normalizedName] = product;
      } else if (product.price === existing.price && product.id < existing.id) {
        // In case of equal prices, prefer the product with the lower ID
        acc[normalizedName] = product;
      }
      return acc;
    }, {})
  );

  // Debug: Log deduplicated products
  

  // Get category name
  const { data: category } = await supabase
    .from('categories')
    .select('name')
    .eq('id', categoryId)
    .single();

  const categoryName = category?.name || "Products";

  return (
    <div className="p-6 mt-20 mb-20 bg-gray-50">
      <h1 className="text-2xl font-bold mb-6">
        {categoryName}
        {storeId && (
          <span className="text-gray-500 text-lg ml-2">(Filtered by store)</span>
        )}
      </h1>
      
      {products?.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10">
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
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                      {product.description || "No description available"}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">$ {product.price.toFixed(2)}</span>
                      
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <p>No products found in this {storeId ? "store's " : ""}category.</p>
      )}
    </div>
  );
}