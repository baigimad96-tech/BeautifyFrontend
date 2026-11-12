/**
 * Safely extracts an Array from various API response shapes
 * (Plain Array, Spring Boot Pageable { content: [] }, { items: [] }, or wrapped { data: [] / { data: { content: [] } } })
 */
export const normalizeList = <T>(raw: unknown): T[] => {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.content)) return obj.content as T[];
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.data)) return normalizeList<T>(obj.data);
    if (obj.data && typeof obj.data === 'object') return normalizeList<T>(obj.data);
  }
  return [];
};

export const extractArray = <T>(res: unknown): T[] => {
  return normalizeList<T>(res);
};

export const extractItem = <T>(res: unknown): T | null => {
  if (res == null) return null;
  if (typeof res === 'object') {
    const obj = res as Record<string, unknown>;
    if ('data' in obj && obj.data !== undefined) {
      return extractItem<T>(obj.data);
    }
  }
  return res as T;
};

export function toArray<T = unknown>(res: any): T[] {
  return normalizeList<T>(res);
}
