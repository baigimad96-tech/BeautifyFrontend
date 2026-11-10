import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CircleDollarSign, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { fetchProducts } from '@/services/products/products.service';
import {
  createAdminCombo,
  createAdminComboRule,
  deleteAdminCombo,
  deleteAdminComboRule,
  fetchAdminComboRules,
  fetchAdminCombos,
  updateAdminCombo,
  updateAdminComboRule,
  updateAdminComboStatus,
} from '@/services/combos/combos.service';
import type {
  Combo,
  ComboDiscountRule,
  ComboDiscountRulePayload,
  ComboWritePayload,
} from '@/types/combo.types';
import '@/styles/combos-admin.css';

type ComboItemDraft = { productId: string; quantity: string; customPrice: string };
type ComboDraft = {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  originalPrice: string;
  sellingPrice: string;
  startDate: string;
  endDate: string;
  active: boolean;
  featured: boolean;
  items: ComboItemDraft[];
};
type RuleDraft = {
  name: string;
  description: string;
  minProducts: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: string;
  minSubtotal: string;
  maxDiscountAmount: string;
  startDate: string;
  endDate: string;
  active: boolean;
};

const EMPTY_COMBO: ComboDraft = {
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
  originalPrice: '',
  sellingPrice: '',
  startDate: '',
  endDate: '',
  active: true,
  featured: false,
  items: [{ productId: '', quantity: '1', customPrice: '' }],
};

const EMPTY_RULE: RuleDraft = {
  name: '',
  description: '',
  minProducts: '2',
  discountType: 'PERCENTAGE',
  discountValue: '10',
  minSubtotal: '',
  maxDiscountAmount: '',
  startDate: '',
  endDate: '',
  active: true,
};

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'The request failed. Please try again.';
}

function localDateTime(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function datePayload(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function money(value: number | null | undefined): string {
  return `₹${Number(value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function comboDraftFrom(combo: Combo): ComboDraft {
  return {
    name: combo.name,
    slug: combo.slug,
    description: combo.description ?? '',
    imageUrl: combo.imageUrl ?? '',
    originalPrice: String(combo.originalPrice),
    sellingPrice: String(combo.sellingPrice),
    startDate: localDateTime(combo.startDate),
    endDate: localDateTime(combo.endDate),
    active: combo.active,
    featured: combo.featured,
    items: combo.items.map((item) => ({
      productId: String(item.productId),
      quantity: String(item.quantity),
      customPrice: item.customPrice == null ? '' : String(item.customPrice),
    })),
  };
}

function ruleDraftFrom(rule: ComboDiscountRule): RuleDraft {
  return {
    name: rule.name,
    description: rule.description ?? '',
    minProducts: String(rule.minProducts),
    discountType: rule.discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE',
    discountValue: String(rule.discountValue),
    minSubtotal: rule.minSubtotal == null ? '' : String(rule.minSubtotal),
    maxDiscountAmount: rule.maxDiscountAmount == null ? '' : String(rule.maxDiscountAmount),
    startDate: localDateTime(rule.startDate),
    endDate: localDateTime(rule.endDate),
    active: rule.active,
  };
}

export function CombosOffersAdminView() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'combos' | 'rules'>('combos');
  const [search, setSearch] = useState('');
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [comboDraft, setComboDraft] = useState<ComboDraft>(EMPTY_COMBO);
  const [editingRule, setEditingRule] = useState<ComboDiscountRule | null>(null);
  const [ruleDraft, setRuleDraft] = useState<RuleDraft>(EMPTY_RULE);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const combosQuery = useQuery({
    queryKey: ['admin-combos', search],
    queryFn: () => fetchAdminCombos(search),
    enabled: view === 'combos',
  });
  const rulesQuery = useQuery({
    queryKey: ['admin-combo-rules'],
    queryFn: fetchAdminComboRules,
    enabled: view === 'rules',
  });
  const productsQuery = useQuery({
    queryKey: ['admin-combo-products'],
    queryFn: async () => (await fetchProducts({ page: 0, size: 100, sort: 'name,asc' })).content,
  });

  const refreshCombos = async () => queryClient.invalidateQueries({ queryKey: ['admin-combos'] });
  const refreshRules = async () => queryClient.invalidateQueries({ queryKey: ['admin-combo-rules'] });

  const comboMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: ComboWritePayload }) =>
      id === undefined ? createAdminCombo(payload) : updateAdminCombo(id, payload),
    onSuccess: async (_, request) => {
      await refreshCombos();
      setEditingCombo(null);
      setComboDraft(EMPTY_COMBO);
      setError('');
      setFeedback(request.id === undefined ? 'Combo created.' : 'Combo updated.');
    },
    onError: (mutationError) => {
      setFeedback('');
      setError(messageOf(mutationError));
    },
  });
  const comboStatusMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => updateAdminComboStatus(id, active),
    onSuccess: async () => {
      await refreshCombos();
      setFeedback('Combo status updated.');
      setError('');
    },
    onError: (mutationError) => setError(messageOf(mutationError)),
  });
  const comboDeleteMutation = useMutation({
    mutationFn: deleteAdminCombo,
    onSuccess: async () => {
      await refreshCombos();
      setFeedback('Combo deleted.');
      setError('');
    },
    onError: (mutationError) => setError(messageOf(mutationError)),
  });
  const ruleMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: ComboDiscountRulePayload }) =>
      id === undefined ? createAdminComboRule(payload) : updateAdminComboRule(id, payload),
    onSuccess: async (_, request) => {
      await refreshRules();
      setEditingRule(null);
      setRuleDraft(EMPTY_RULE);
      setError('');
      setFeedback(request.id === undefined ? 'Discount rule created.' : 'Discount rule updated.');
    },
    onError: (mutationError) => {
      setFeedback('');
      setError(messageOf(mutationError));
    },
  });
  const ruleDeleteMutation = useMutation({
    mutationFn: deleteAdminComboRule,
    onSuccess: async () => {
      await refreshRules();
      setFeedback('Discount rule deleted.');
      setError('');
    },
    onError: (mutationError) => setError(messageOf(mutationError)),
  });

  const changeCombo = <K extends keyof ComboDraft,>(key: K, value: ComboDraft[K]) =>
    setComboDraft((current) => ({ ...current, [key]: value }));
  const changeRule = <K extends keyof RuleDraft,>(key: K, value: RuleDraft[K]) =>
    setRuleDraft((current) => ({ ...current, [key]: value }));

  const beginCombo = (combo?: Combo) => {
    setEditingCombo(combo ?? null);
    setComboDraft(combo ? comboDraftFrom(combo) : EMPTY_COMBO);
    setFeedback('');
    setError('');
  };

  const submitCombo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setFeedback('');
    const items = comboDraft.items
      .filter((item) => item.productId)
      .map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        ...(item.customPrice ? { customPrice: Number(item.customPrice) } : {}),
      }));
    if (!items.length || items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1)) {
      setError('Add at least one product and use a quantity of 1 or more.');
      return;
    }
    const originalPrice = Number(comboDraft.originalPrice);
    const sellingPrice = Number(comboDraft.sellingPrice);
    if (!Number.isFinite(originalPrice) || !Number.isFinite(sellingPrice) || originalPrice < 0 || sellingPrice < 0) {
      setError('Enter valid original and combo prices.');
      return;
    }
    comboMutation.mutate({
      id: editingCombo?.id,
      payload: {
        name: comboDraft.name.trim(),
        slug: comboDraft.slug.trim(),
        description: comboDraft.description.trim() || null,
        imageUrl: comboDraft.imageUrl.trim() || null,
        originalPrice,
        sellingPrice,
        startDate: datePayload(comboDraft.startDate),
        endDate: datePayload(comboDraft.endDate),
        active: comboDraft.active,
        featured: comboDraft.featured,
        items,
      },
    });
  };

  const submitRule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setFeedback('');
    const minProducts = Number(ruleDraft.minProducts);
    const discountValue = Number(ruleDraft.discountValue);
    if (!Number.isInteger(minProducts) || minProducts < 1 || !Number.isFinite(discountValue) || discountValue <= 0) {
      setError('Minimum products must be at least 1 and discount value must be positive.');
      return;
    }
    ruleMutation.mutate({
      id: editingRule?.id,
      payload: {
        name: ruleDraft.name.trim(),
        description: ruleDraft.description.trim() || undefined,
        minProducts,
        discountType: ruleDraft.discountType,
        discountValue,
        minSubtotal: ruleDraft.minSubtotal ? Number(ruleDraft.minSubtotal) : null,
        maxDiscountAmount: ruleDraft.maxDiscountAmount ? Number(ruleDraft.maxDiscountAmount) : null,
        startDate: datePayload(ruleDraft.startDate),
        endDate: datePayload(ruleDraft.endDate),
        active: ruleDraft.active,
      },
    });
  };

  const updateProductItem = (index: number, patch: Partial<ComboItemDraft>) => {
    setComboDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  };

  return (
    <section className="admin-combos">
      <div className="admin-combos-heading">
        <div>
          <div className="eyebrow">MALKAZ promotions</div>
          <h2>Combos &amp; Offers</h2>
          <p>Manage curated jewellery sets and server-calculated custom combo discounts.</p>
        </div>
        <div className="admin-combos-tabs" role="tablist" aria-label="Combo administration">
          <button type="button" className={view === 'combos' ? 'active' : ''} onClick={() => { setView('combos'); setError(''); setFeedback(''); }} role="tab" aria-selected={view === 'combos'}>Predefined combos</button>
          <button type="button" className={view === 'rules' ? 'active' : ''} onClick={() => { setView('rules'); setError(''); setFeedback(''); }} role="tab" aria-selected={view === 'rules'}>Custom discount rules</button>
        </div>
      </div>

      {error && <p className="admin-combo-message error" role="alert">{error}</p>}
      {feedback && <p className="admin-combo-message success" role="status">{feedback}</p>}

      {view === 'combos' ? (
        <div className="admin-combo-layout">
          <section className="admin-card admin-combo-editor">
            <div className="admin-card-heading">
              <div><div className="eyebrow">{editingCombo ? 'Update bundle' : 'Create bundle'}</div><h2>{editingCombo ? 'Edit combo' : 'New combo'}</h2></div>
              <button type="button" className="button secondary small" onClick={() => beginCombo()}><Plus size={15} /> New</button>
            </div>
            {productsQuery.isError
              ? <div className="error-state" role="alert"><p>{messageOf(productsQuery.error)}</p><button className="button secondary" onClick={() => { void productsQuery.refetch(); }}>Try again</button></div>
              : <form className="admin-form" onSubmit={submitCombo}>
                <label className="form-field"><span>Combo name</span><input className="input" required maxLength={180} value={comboDraft.name} onChange={(event) => changeCombo('name', event.target.value)} /></label>
                <label className="form-field"><span>URL slug</span><input className="input" required maxLength={220} value={comboDraft.slug} onChange={(event) => changeCombo('slug', event.target.value)} /></label>
                <label className="form-field"><span>Description</span><textarea className="input" rows={3} maxLength={2000} value={comboDraft.description} onChange={(event) => changeCombo('description', event.target.value)} /></label>
                <label className="form-field"><span>Combo image URL</span><input className="input" type="url" value={comboDraft.imageUrl} onChange={(event) => changeCombo('imageUrl', event.target.value)} /></label>
                <div className="admin-combo-fields-2">
                  <label className="form-field"><span>Original price (₹)</span><input className="input" type="number" min="0" step="0.01" required value={comboDraft.originalPrice} onChange={(event) => changeCombo('originalPrice', event.target.value)} /></label>
                  <label className="form-field"><span>Selling price (₹)</span><input className="input" type="number" min="0" step="0.01" required value={comboDraft.sellingPrice} onChange={(event) => changeCombo('sellingPrice', event.target.value)} /></label>
                </div>
                <div className="admin-combo-fields-2">
                  <label className="form-field"><span>Starts at</span><input className="input" type="datetime-local" value={comboDraft.startDate} onChange={(event) => changeCombo('startDate', event.target.value)} /></label>
                  <label className="form-field"><span>Ends at</span><input className="input" type="datetime-local" value={comboDraft.endDate} onChange={(event) => changeCombo('endDate', event.target.value)} /></label>
                </div>
                <div className="admin-combo-items-heading"><strong>Included products</strong><button type="button" className="button secondary small" onClick={() => changeCombo('items', [...comboDraft.items, { productId: '', quantity: '1', customPrice: '' }])}><Plus size={14} /> Add product</button></div>
                {comboDraft.items.map((item, index) => (
                  <div className="admin-combo-item-row" key={`combo-item-${index}`}>
                    <select className="select" aria-label={`Combo product ${index + 1}`} required value={item.productId} onChange={(event) => updateProductItem(index, { productId: event.target.value })}>
                      <option value="">Select product</option>
                      {(productsQuery.data ?? []).map((product) => <option key={product.id} value={product.id}>{product.name} · {money(product.sellingPrice || product.discountPrice || product.price)}</option>)}
                    </select>
                    <input className="input" type="number" min="1" step="1" aria-label={`Quantity for product ${index + 1}`} value={item.quantity} onChange={(event) => updateProductItem(index, { quantity: event.target.value })} />
                    <input className="input" type="number" min="0" step="0.01" aria-label={`Custom price for product ${index + 1}`} placeholder="Optional price" value={item.customPrice} onChange={(event) => updateProductItem(index, { customPrice: event.target.value })} />
                    <button type="button" className="icon-button admin-delete" aria-label={`Remove product ${index + 1}`} disabled={comboDraft.items.length === 1} onClick={() => changeCombo('items', comboDraft.items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button>
                  </div>
                ))}
                <div className="admin-combo-checks">
                  <label><input type="checkbox" checked={comboDraft.active} onChange={(event) => changeCombo('active', event.target.checked)} /> Active</label>
                  <label><input type="checkbox" checked={comboDraft.featured} onChange={(event) => changeCombo('featured', event.target.checked)} /> Feature on storefront</label>
                </div>
                <div className="admin-form-actions">
                  <button className="button" type="submit" disabled={comboMutation.isPending || productsQuery.isLoading}>{comboMutation.isPending ? 'Saving…' : editingCombo ? 'Save combo' : 'Create combo'}</button>
                  {editingCombo && <button className="button secondary" type="button" onClick={() => beginCombo()}>Cancel</button>}
                </div>
              </form>}
          </section>

          <section className="admin-card admin-combo-list">
            <div className="admin-card-heading">
              <div><div className="eyebrow">Offers catalogue</div><h2>Predefined combos ({combosQuery.data?.length ?? 0})</h2></div>
              <label className="admin-combo-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search combos" aria-label="Search combos" /></label>
            </div>
            {combosQuery.isLoading ? <div className="skeleton line" />
              : combosQuery.isError ? <div className="error-state" role="alert"><p>{messageOf(combosQuery.error)}</p><button className="button secondary" onClick={() => { void combosQuery.refetch(); }}>Try again</button></div>
                : <div className="admin-table-wrap"><table className="admin-table">
                  <thead><tr><th>Combo</th><th>Items</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>{(combosQuery.data ?? []).map((combo) => <tr key={combo.id}>
                    <td><strong>{combo.name}</strong><small className="admin-combo-slug">{combo.slug}</small></td>
                    <td>{combo.items?.length ?? 0} products</td>
                    <td>{money(combo.sellingPrice)}<small className="admin-combo-slug">Was {money(combo.originalPrice)}</small></td>
                    <td><span className={`admin-status ${combo.active ? 'is-active' : 'is-inactive'}`}>{combo.active ? 'Active' : 'Inactive'}</span>{combo.featured && <small className="admin-combo-featured">Featured</small>}</td>
                    <td className="admin-actions">
                      <button type="button" className="icon-button" title="Edit combo" aria-label={`Edit ${combo.name}`} onClick={() => beginCombo(combo)}><Pencil size={15} /></button>
                      <button type="button" className="button secondary small" disabled={comboStatusMutation.isPending} onClick={() => comboStatusMutation.mutate({ id: combo.id, active: !combo.active })}>{combo.active ? 'Pause' : 'Activate'}</button>
                      <button type="button" className="icon-button admin-delete" title="Delete combo" aria-label={`Delete ${combo.name}`} disabled={comboDeleteMutation.isPending} onClick={() => { if (window.confirm(`Delete "${combo.name}"?`)) comboDeleteMutation.mutate(combo.id); }}><Trash2 size={15} /></button>
                    </td>
                  </tr>)}
                  {!combosQuery.data?.length && <tr><td colSpan={5} className="admin-empty">No combos found.</td></tr>}</tbody>
                </table></div>}
          </section>
        </div>
      ) : (
        <div className="admin-combo-layout admin-combo-rules-layout">
          <section className="admin-card admin-combo-editor">
            <div className="admin-card-heading"><div><div className="eyebrow">{editingRule ? 'Update promotion' : 'Create promotion'}</div><h2>{editingRule ? 'Edit discount rule' : 'New discount rule'}</h2></div><button type="button" className="button secondary small" onClick={() => { setEditingRule(null); setRuleDraft(EMPTY_RULE); }}><Plus size={15} /> New</button></div>
            <form className="admin-form" onSubmit={submitRule}>
              <label className="form-field"><span>Rule name</span><input className="input" required maxLength={150} value={ruleDraft.name} onChange={(event) => changeRule('name', event.target.value)} /></label>
              <label className="form-field"><span>Description</span><textarea className="input" rows={3} maxLength={500} value={ruleDraft.description} onChange={(event) => changeRule('description', event.target.value)} /></label>
              <div className="admin-combo-fields-2">
                <label className="form-field"><span>Minimum distinct products</span><input className="input" type="number" min="1" step="1" required value={ruleDraft.minProducts} onChange={(event) => changeRule('minProducts', event.target.value)} /></label>
                <label className="form-field"><span>Discount type</span><select className="select" value={ruleDraft.discountType} onChange={(event) => changeRule('discountType', event.target.value as RuleDraft['discountType'])}><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed amount</option></select></label>
              </div>
              <div className="admin-combo-fields-2">
                <label className="form-field"><span>{ruleDraft.discountType === 'PERCENTAGE' ? 'Discount (%)' : 'Discount (₹)'}</span><input className="input" type="number" min="0.01" step="0.01" required value={ruleDraft.discountValue} onChange={(event) => changeRule('discountValue', event.target.value)} /></label>
                <label className="form-field"><span>Minimum subtotal (₹)</span><input className="input" type="number" min="0" step="0.01" value={ruleDraft.minSubtotal} onChange={(event) => changeRule('minSubtotal', event.target.value)} /></label>
              </div>
              <div className="admin-combo-fields-2">
                <label className="form-field"><span>Maximum discount cap (₹)</span><input className="input" type="number" min="0" step="0.01" value={ruleDraft.maxDiscountAmount} onChange={(event) => changeRule('maxDiscountAmount', event.target.value)} /></label>
                <label className="form-field"><span>Starts at</span><input className="input" type="datetime-local" value={ruleDraft.startDate} onChange={(event) => changeRule('startDate', event.target.value)} /></label>
              </div>
              <label className="form-field"><span>Ends at</span><input className="input" type="datetime-local" value={ruleDraft.endDate} onChange={(event) => changeRule('endDate', event.target.value)} /></label>
              <div className="admin-combo-checks"><label><input type="checkbox" checked={ruleDraft.active} onChange={(event) => changeRule('active', event.target.checked)} /> Active</label></div>
              <div className="admin-form-actions">
                <button className="button" type="submit" disabled={ruleMutation.isPending}>{ruleMutation.isPending ? 'Saving…' : editingRule ? 'Save rule' : 'Create rule'}</button>
                {editingRule && <button className="button secondary" type="button" onClick={() => { setEditingRule(null); setRuleDraft(EMPTY_RULE); }}>Cancel</button>}
              </div>
            </form>
          </section>
          <section className="admin-card admin-combo-list">
            <div className="admin-card-heading"><div><div className="eyebrow">Server-side pricing</div><h2>Custom combo rules ({rulesQuery.data?.length ?? 0})</h2></div><CircleDollarSign size={22} /></div>
            {rulesQuery.isLoading ? <div className="skeleton line" />
              : rulesQuery.isError ? <div className="error-state" role="alert"><p>{messageOf(rulesQuery.error)}</p><button className="button secondary" onClick={() => { void rulesQuery.refetch(); }}>Try again</button></div>
                : <div className="admin-table-wrap"><table className="admin-table">
                  <thead><tr><th>Rule</th><th>Minimum</th><th>Discount</th><th>Limit</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>{(rulesQuery.data ?? []).map((rule) => <tr key={rule.id}>
                    <td><strong>{rule.name}</strong><small className="admin-combo-slug">{rule.description}</small></td>
                    <td>{rule.minProducts}+ products{rule.minSubtotal != null ? <small className="admin-combo-slug">From {money(rule.minSubtotal)}</small> : null}</td>
                    <td>{rule.discountType === 'PERCENTAGE' ? `${rule.discountValue}%` : money(rule.discountValue)}</td>
                    <td>{rule.maxDiscountAmount != null ? money(rule.maxDiscountAmount) : 'No cap'}</td>
                    <td><span className={`admin-status ${rule.active ? 'is-active' : 'is-inactive'}`}>{rule.active ? 'Active' : 'Inactive'}</span></td>
                    <td className="admin-actions">
                      <button type="button" className="icon-button" title="Edit rule" aria-label={`Edit ${rule.name}`} onClick={() => { setEditingRule(rule); setRuleDraft(ruleDraftFrom(rule)); setError(''); setFeedback(''); }}><Pencil size={15} /></button>
                      <button type="button" className="icon-button admin-delete" title="Delete rule" aria-label={`Delete ${rule.name}`} disabled={ruleDeleteMutation.isPending} onClick={() => { if (window.confirm(`Delete "${rule.name}"?`)) ruleDeleteMutation.mutate(rule.id); }}><Trash2 size={15} /></button>
                    </td>
                  </tr>)}
                  {!rulesQuery.data?.length && <tr><td colSpan={6} className="admin-empty">No custom combo rules found.</td></tr>}</tbody>
                </table></div>}
          </section>
          <p className="admin-combo-security-note"><CalendarClock size={16} /> Pricing and discount allocation are recalculated by the server; customers never submit prices.</p>
        </div>
      )}
    </section>
  );
}
