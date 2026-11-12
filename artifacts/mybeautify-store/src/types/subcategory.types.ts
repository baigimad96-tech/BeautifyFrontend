export interface SubcategoryRequest {
  name: string;
  categoryId: number;
  description?: string | null;
  imageUrl?: string | null;
  active?: boolean;
}

export interface SubcategoryResponse {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  categoryId: number;
  categoryName?: string | null;
  active: boolean;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubcategoryPageResponse {
  content: SubcategoryResponse[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

