/**
 * Product, Category, Brand, and Review Types
 */

export type ProductRelationshipType = 'VARIANT' | 'SIMILAR' | 'CROSS_SELL';

export interface SimilarProductResponse {
  id: number;
  name: string;
  slug: string;
  sku?: string;
  price: number;
  originalPrice?: number;
  sellingPrice?: number;
  imageUrl?: string;
  categoryName?: string;
  brandName?: string;
  relationshipType?: ProductRelationshipType;
  score?: number;
  matchReason?: string;
}

export interface ProductRelationshipResponse {
  id: number;
  sourceProductId: number;
  sourceProductName: string;
  relatedProductId: number;
  relatedProductName: string;
  relationshipType: ProductRelationshipType;
  displayOrder: number;
  createdAt: string;
}

export interface ProductResponse {
  id: number;
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription?: string;
  price: number;
  discountPrice?: number;
  sellingPrice: number;
  stockQuantity: number;
  lowStockThreshold?: number;
  brandId: number;
  brandName: string;
  categoryId: number;
  categoryName: string;
  imageUrl?: string;
  active: boolean;
  featured?: boolean;
  ingredients?: string;
  benefits?: string;
  howToUse?: string;
  skinType?: string;
  shade?: string;
  size?: string;
  reviewCount?: number;
  expiryDate?: string | null;
  averageRating: number;
  similarProducts?: SimilarProductResponse[];
}

export interface ProductFilterParams {
  query?: string;
  categoryId?: number;
  brandId?: number;
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  size?: number;
  sort?: string;
}

export interface CategoryResponse {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string | null;
  active: boolean;
}

export interface BrandResponse {
  id: number;
  name: string;
  description?: string;
  logoUrl?: string | null;
  active: boolean;
}

export interface ReviewResponse {
  id: number;
  productId: number;
  productName?: string;
  customerName?: string;
  authorName?: string;
  rating: number;
  title?: string;
  comment?: string;
  createdAt: string;
  approved?: boolean;
}
