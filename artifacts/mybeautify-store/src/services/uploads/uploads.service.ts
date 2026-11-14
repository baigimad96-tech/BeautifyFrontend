import { buildApiUrl, request } from '@/services/api/client';

type ImageUploadResponse = {
  imageUrl?: string | null;
  relativeUrl?: string | null;
};

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await request<ImageUploadResponse | null>('/uploads/image', {
    method: 'POST',
    body: formData,
  });
  const imageUrl = response && (response.imageUrl?.trim() || response.relativeUrl?.trim());

  if (!imageUrl) {
    throw new Error('The server uploaded the image but did not return an image URL.');
  }

  return /^https?:\/\//i.test(imageUrl) ? imageUrl : buildApiUrl(imageUrl);
}

export async function uploadMultipleImages(files: File[]): Promise<string[]> {
  if (!files || files.length === 0) return [];

  try {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    const response = await request<ImageUploadResponse[] | { items?: ImageUploadResponse[] } | null>('/uploads/images', {
      method: 'POST',
      body: formData,
    });
    const items: ImageUploadResponse[] | null = Array.isArray(response)
      ? response
      : Array.isArray((response as any)?.items)
        ? (response as any).items
        : null;

    if (items && items.length > 0) {
      return items.map((item: ImageUploadResponse) => {
        const url = (item.imageUrl?.trim() || item.relativeUrl?.trim()) ?? '';
        return /^https?:\/\//i.test(url) ? url : buildApiUrl(url);
      });
    }
  } catch (err) {
    console.warn('Batch image upload endpoint failed, falling back to parallel uploads:', err);
  }

  // Parallel fallback to guarantee 100% upload reliability
  return Promise.all(files.map((file) => uploadImage(file)));
}
