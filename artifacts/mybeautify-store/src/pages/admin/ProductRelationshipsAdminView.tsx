import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import {
  createAdminProductRelationship,
  deleteAdminProductRelationship,
  fetchAdminProductRelationships,
  fetchProducts,
} from '@/services/products/products.service';
import type { ProductRelationshipType } from '@/types/product.types';

const RELATIONSHIP_TYPES: Array<{ value: ProductRelationshipType; label: string }> = [
  { value: 'VARIANT', label: 'Variant' },
  { value: 'SIMILAR', label: 'Similar style' },
  { value: 'CROSS_SELL', label: 'Cross-sell' },
];

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'The request failed. Please try again.';
}

export function ProductRelationshipsAdminView() {
  const queryClient = useQueryClient();
  const [sourceProductId, setSourceProductId] = useState('');
  const [relatedProductId, setRelatedProductId] = useState('');
  const [relationshipType, setRelationshipType] = useState<ProductRelationshipType>('VARIANT');
  const [displayOrder, setDisplayOrder] = useState('0');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const productsQuery = useQuery({
    queryKey: ['admin-product-relationship-products'],
    queryFn: () => fetchProducts({ page: 0, size: 200, sort: 'name,asc' }),
  });
  const sourceId = Number(sourceProductId);
  const relationshipsQuery = useQuery({
    queryKey: ['admin-product-relationships', sourceId],
    queryFn: () => fetchAdminProductRelationships(sourceId),
    enabled: Number.isInteger(sourceId) && sourceId > 0,
  });

  const refreshRelationships = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-product-relationships', sourceId] });
  };
  const createMutation = useMutation({
    mutationFn: () => createAdminProductRelationship(sourceId, {
      relatedProductId: Number(relatedProductId),
      relationshipType,
      displayOrder: Number(displayOrder),
    }),
    onSuccess: async () => {
      await refreshRelationships();
      setRelatedProductId('');
      setFeedback('Product relationship saved.');
      setError('');
    },
    onError: (mutationError) => {
      setFeedback('');
      setError(messageOf(mutationError));
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminProductRelationship(sourceId, id),
    onSuccess: async () => {
      await refreshRelationships();
      setFeedback('Product relationship removed.');
      setError('');
    },
    onError: (mutationError) => {
      setFeedback('');
      setError(messageOf(mutationError));
    },
  });

  const products = productsQuery.data?.content ?? [];
  const relatedOptions = products.filter((product) =>
    product.id !== sourceId
    && !relationshipsQuery.data?.some((relationship) => relationship.relatedProductId === product.id)
  );
  const submitRelationship = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback('');
    setError('');
    if (!sourceId || !Number.isInteger(Number(relatedProductId)) || Number(relatedProductId) <= 0) {
      setError('Choose both a source product and a related product.');
      return;
    }
    if (!Number.isInteger(Number(displayOrder)) || Number(displayOrder) < 0) {
      setError('Display order must be a whole number greater than or equal to zero.');
      return;
    }
    createMutation.mutate();
  };

  return (
    <section className="admin-relationship-management">
      <div className="admin-relationship-intro">
        <div className="eyebrow">Product catalogue</div>
        <h2>Similar products &amp; variants</h2>
        <p>Curate product variants, similar styles, and cross-sells shown on each product detail page.</p>
      </div>

      <section className="admin-card">
        <div className="admin-card-heading">
          <div><div className="eyebrow">Relationship editor</div><h2>Link jewellery pieces</h2></div>
        </div>
        {productsQuery.isError
          ? <div className="error-state" role="alert">
            <p>{messageOf(productsQuery.error)}</p>
            <button type="button" className="button secondary" onClick={() => { void productsQuery.refetch(); }}>Try again</button>
          </div>
          : <form className="admin-relationship-form" onSubmit={submitRelationship}>
            <label className="form-field">
              <span>Source product</span>
              <select
                className="select"
                required
                value={sourceProductId}
                onChange={(event) => {
                  setSourceProductId(event.target.value);
                  setRelatedProductId('');
                  setFeedback('');
                  setError('');
                }}
                disabled={productsQuery.isLoading}
              >
                <option value="">Select product</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Related product</span>
              <select
                className="select"
                required
                value={relatedProductId}
                onChange={(event) => setRelatedProductId(event.target.value)}
                disabled={!sourceId || productsQuery.isLoading || relationshipsQuery.isLoading}
              >
                <option value="">Select related product</option>
                {relatedOptions.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Relationship type</span>
              <select
                className="select"
                value={relationshipType}
                onChange={(event) => setRelationshipType(event.target.value as ProductRelationshipType)}
              >
                {RELATIONSHIP_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Display order</span>
              <input
                className="input"
                type="number"
                min="0"
                step="1"
                value={displayOrder}
                onChange={(event) => setDisplayOrder(event.target.value)}
              />
            </label>
            <div className="admin-relationship-actions">
              <button className="button" type="submit" disabled={!sourceId || createMutation.isPending || relationshipsQuery.isLoading}>
                <Plus size={15} /> {createMutation.isPending ? 'Saving…' : 'Add relationship'}
              </button>
            </div>
          </form>}
        {error && <p className="admin-combo-message error" role="alert">{error}</p>}
        {feedback && <p className="admin-combo-message success" role="status">{feedback}</p>}
      </section>

      {sourceId > 0 && (
        <section className="admin-card">
          <div className="admin-card-heading">
            <div><div className="eyebrow">Configured links</div><h2>Product relationships ({relationshipsQuery.data?.length ?? 0})</h2></div>
          </div>
          {relationshipsQuery.isLoading
            ? <div className="skeleton line" />
            : relationshipsQuery.isError
              ? <div className="error-state" role="alert">
                <p>{messageOf(relationshipsQuery.error)}</p>
                <button type="button" className="button secondary" onClick={() => { void relationshipsQuery.refetch(); }}>Try again</button>
              </div>
              : <div className="admin-relationship-list">
                {[...(relationshipsQuery.data ?? [])]
                  .sort((left, right) => left.displayOrder - right.displayOrder)
                  .map((relationship) => (
                    <div className="admin-relationship-row" key={relationship.id}>
                      <div className="admin-relationship-order">{relationship.displayOrder + 1}</div>
                      <div className="admin-relationship-products">
                        <strong>{relationship.relatedProductName}</strong>
                        <span>{RELATIONSHIP_TYPES.find((type) => type.value === relationship.relationshipType)?.label ?? relationship.relationshipType}</span>
                      </div>
                      <button
                        type="button"
                        className="icon-button admin-delete"
                        aria-label={`Remove ${relationship.relatedProductName}`}
                        title={`Remove ${relationship.relatedProductName}`}
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Remove "${relationship.relatedProductName}" from this product's relationships?`)) {
                            deleteMutation.mutate(relationship.relatedProductId);
                          }
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                ))}
                {!relationshipsQuery.data?.length && <p className="admin-empty">No related products configured yet.</p>}
              </div>}
        </section>
      )}
    </section>
  );
}
