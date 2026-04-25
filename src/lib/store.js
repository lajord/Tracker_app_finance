'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  mockTransactions,
  mockAccounts,
  mockBudgets,
  mockInvestments,
} from './mock-data';
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEY = 'tracker_finance_state_v3';
const SYNCED_KEY = 'tracker_supabase_synced';

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------
function loadState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(s) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Build initial state from localStorage / mock data (offline fallback)
// ---------------------------------------------------------------------------
function getLocalState() {
  const saved = loadState();
  if (saved) {
    const mergedAccounts = [...(saved.accounts || [])]
      .filter(a => a.name !== 'Revolut' && a.id !== '11111111-1111-1111-1111-111111111111')
      .map(a => {
        if (a.id === '00000000-0000-0000-0000-000000000000' || a.name === 'Compte Principal') {
          return { ...a, name: 'Credit Agricole compte' };
        }
        if (a.id === '22222222-2222-2222-2222-222222222222' ||
            a.name === 'Compte Investissement' ||
            a.name === 'Binance et Trade Republic') {
          return { ...a, id: '44444444-4444-4444-4444-444444444444', name: 'Trade Republic' };
        }
        return a;
      });
    mockAccounts.forEach(mAcc => {
      if (!mergedAccounts.find(a => a.id === mAcc.id)) mergedAccounts.push(mAcc);
    });

    const mergedInvestments = [...(saved.investments || [])];
    mockInvestments.forEach(mInv => {
      const existing = mergedInvestments.find(i => i.id === mInv.id);
      if (!existing) mergedInvestments.push(mInv);
      else if (!existing.platform) existing.platform = 'Trade Republic';
    });

    return {
      transactions: saved.transactions || mockTransactions,
      accounts: mergedAccounts,
      budgets: saved.budgets || mockBudgets,
      investments: mergedInvestments,
    };
  }
  return {
    transactions: mockTransactions,
    accounts: mockAccounts,
    budgets: mockBudgets,
    investments: mockInvestments,
  };
}

// ---------------------------------------------------------------------------
// Load all data from Supabase
// ---------------------------------------------------------------------------
async function loadFromSupabase() {
  const [txRes, accRes, budRes, invRes] = await Promise.all([
    supabase.from('transactions').select('*').order('date', { ascending: false }),
    supabase.from('accounts').select('*'),
    supabase.from('budgets').select('*'),
    supabase.from('investments').select('*'),
  ]);
  return {
    transactions: txRes.data || [],
    accounts: accRes.data || [],
    budgets: budRes.data || [],
    investments: invRes.data || [],
  };
}

// ---------------------------------------------------------------------------
// One-time sync: push localStorage data to Supabase
// ---------------------------------------------------------------------------
async function syncLocalToSupabase(local) {
  if (typeof window === 'undefined') return;
  if (window.localStorage.getItem(SYNCED_KEY)) return;

  let errors = 0;

  for (const acc of local.accounts) {
    const { id, name, type, currency } = acc;
    const { error } = await supabase.from('accounts').upsert({ id, name, type, currency }, { onConflict: 'id' });
    if (error) { console.error('[sync] account error:', acc.name, error.message); errors++; }
  }

  for (const tx of local.transactions) {
    const { id, label, amount, date, category, account_id, source, currency, external_id } = tx;
    const { error } = await supabase.from('transactions').upsert(
      { id, label, amount: Number(amount), date, category, account_id, source: source || 'manual', currency: currency || 'EUR', external_id },
      { onConflict: 'id' }
    );
    if (error) { console.error('[sync] transaction error:', label, error.message); errors++; }
  }

  for (const b of local.budgets) {
    const { id, category, amount_limit } = b;
    const { error } = await supabase.from('budgets').upsert(
      { id, category, amount_limit: Number(amount_limit) },
      { onConflict: 'id' }
    );
    if (error) { console.error('[sync] budget error:', category, error.message); errors++; }
  }

  for (const inv of local.investments) {
    const { id, name, platform, category, invested_amount, operations } = inv;
    const { error } = await supabase.from('investments').upsert(
      { id, name, platform, category, invested_amount: Number(invested_amount), operations: operations || [] },
      { onConflict: 'id' }
    );
    if (error) { console.error('[sync] investment error:', name, error.message); errors++; }
  }

  if (errors === 0) {
    window.localStorage.setItem(SYNCED_KEY, 'true');
    console.log('[sync] localStorage data pushed to Supabase successfully');
  } else {
    console.warn(`[sync] completed with ${errors} errors — will retry on next load`);
  }
}

// ---------------------------------------------------------------------------
// Shared state + subscribers
// ---------------------------------------------------------------------------
let state = null;
let supabaseLoaded = false;
const listeners = new Set();

function ensureInit() {
  if (state === null) state = getLocalState();
}

function notify() {
  saveState(state);
  listeners.forEach((l) => l(state));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useFinanceStore() {
  const [snapshot, setSnapshot] = useState(() => {
    ensureInit();
    return state;
  });

  useEffect(() => {
    ensureInit();
    setSnapshot(state);
    const listener = (s) => setSnapshot({ ...s });
    listeners.add(listener);

    if (isSupabaseConfigured && !supabaseLoaded) {
      supabaseLoaded = true;
      const local = { ...state };

      loadFromSupabase().then(async (remote) => {
        const hasRemoteData = remote.transactions.length > 0 || remote.accounts.length > 0;

        if (!hasRemoteData && local.transactions.length > 0) {
          // Supabase empty, localStorage has data → push to Supabase
          await syncLocalToSupabase(local);
          state = local;
        } else if (hasRemoteData) {
          // Supabase has data → source of truth
          const mergedAccounts = [...remote.accounts];
          mockAccounts.forEach(mAcc => {
            if (!mergedAccounts.find(a => a.id === mAcc.id)) {
              mergedAccounts.push(mAcc);
              const { id, name, type, currency } = mAcc;
              supabase.from('accounts').upsert({ id, name, type, currency }, { onConflict: 'id' });
            }
          });

          // Push local budgets/investments to Supabase if remote tables are empty
          let finalBudgets = remote.budgets;
          if (remote.budgets.length === 0 && local.budgets.length > 0) {
            for (const b of local.budgets) {
              const { id, category, amount_limit } = b;
              await supabase.from('budgets').upsert({ id, category, amount_limit: Number(amount_limit) }, { onConflict: 'id' });
            }
            finalBudgets = local.budgets;
            console.log('[sync] pushed', local.budgets.length, 'budgets to Supabase');
          }

          let finalInvestments = remote.investments;
          if (remote.investments.length === 0 && local.investments.length > 0) {
            for (const inv of local.investments) {
              const { id, name, platform, category, invested_amount, operations } = inv;
              await supabase.from('investments').upsert(
                { id, name, platform, category, invested_amount: Number(invested_amount), operations: operations || [] },
                { onConflict: 'id' }
              );
            }
            finalInvestments = local.investments;
            console.log('[sync] pushed', local.investments.length, 'investments to Supabase');
          }

          state = {
            transactions: remote.transactions,
            accounts: mergedAccounts,
            budgets: finalBudgets,
            investments: finalInvestments,
          };
        }
        notify();
      }).catch(err => {
        console.error('[store] Failed to load from Supabase:', err);
      });
    }

    return () => listeners.delete(listener);
  }, []);

  // ---- Accounts ----
  const addAccount = useCallback(async (acc) => {
    const newAcc = { id: crypto.randomUUID(), currency: 'EUR', ...acc };
    if (isSupabaseConfigured) {
      const { id, name, type, currency } = newAcc;
      const { data, error } = await supabase
        .from('accounts').insert({ id, name, type, currency }).select().single();
      if (error) throw error;
      state = { ...state, accounts: [data, ...state.accounts] };
    } else {
      state = { ...state, accounts: [newAcc, ...state.accounts] };
    }
    notify();
    return newAcc;
  }, []);

  // ---- Transactions ----
  const addTransaction = useCallback(async (tx) => {
    const newTx = {
      id: tx.id || crypto.randomUUID(),
      source: tx.source || 'manual',
      currency: 'EUR',
      ...tx,
      amount: Number(tx.amount),
    };

    if (isSupabaseConfigured) {
      const { id, label, amount, date, category, account_id, source, currency, external_id } = newTx;
      const { data, error } = await supabase
        .from('transactions')
        .insert({ id, label, amount, date, category, account_id, source, currency, external_id })
        .select().single();
      if (error) throw error;
      state = { ...state, transactions: [data, ...state.transactions] };
    } else {
      state = { ...state, transactions: [newTx, ...state.transactions] };
    }
    notify();
    return newTx;
  }, []);

  const deleteTransaction = useCallback(async (id) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    }
    state = { ...state, transactions: state.transactions.filter((t) => t.id !== id) };
    notify();
  }, []);

  const updateTransaction = useCallback(async (id, patch) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('transactions').update(patch).eq('id', id);
      if (error) throw error;
    }
    state = { ...state, transactions: state.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)) };
    notify();
  }, []);

  // ---- Budgets ----
  const upsertBudget = useCallback(async (budget) => {
    const existing = state.budgets.find((b) => b.category === budget.category);
    let next;
    if (existing) {
      const updated = { ...existing, amount_limit: Number(budget.amount_limit) };
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('budgets').update({ amount_limit: updated.amount_limit }).eq('id', existing.id);
        if (error) throw error;
      }
      next = state.budgets.map((b) => (b.id === existing.id ? updated : b));
    } else {
      const newBudget = { id: crypto.randomUUID(), ...budget, amount_limit: Number(budget.amount_limit) };
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('budgets').insert({ id: newBudget.id, category: newBudget.category, amount_limit: newBudget.amount_limit });
        if (error) throw error;
      }
      next = [...state.budgets, newBudget];
    }
    state = { ...state, budgets: next };
    notify();
  }, []);

  const deleteBudget = useCallback(async (id) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('budgets').delete().eq('id', id);
      if (error) throw error;
    }
    state = { ...state, budgets: state.budgets.filter((b) => b.id !== id) };
    notify();
  }, []);

  // ---- Investments ----
  const addInvestment = useCallback(async (inv) => {
    const newInv = { id: crypto.randomUUID(), ...inv, invested_amount: Number(inv.invested_amount) };
    if (isSupabaseConfigured) {
      const { id, name, platform, category, invested_amount, operations } = newInv;
      const { data, error } = await supabase
        .from('investments')
        .insert({ id, name, platform, category, invested_amount, operations: operations || [] })
        .select().single();
      if (error) throw error;
      state = { ...state, investments: [data, ...(state.investments || [])] };
    } else {
      state = { ...state, investments: [newInv, ...(state.investments || [])] };
    }
    notify();
    return newInv;
  }, []);

  const updateInvestment = useCallback(async (id, patch) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('investments').update(patch).eq('id', id);
      if (error) throw error;
    }
    state = { ...state, investments: state.investments.map((i) => (i.id === id ? { ...i, ...patch } : i)) };
    notify();
  }, []);

  const deleteInvestment = useCallback(async (id) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('investments').delete().eq('id', id);
      if (error) throw error;
    }
    state = { ...state, investments: state.investments.filter((i) => i.id !== id) };
    notify();
  }, []);

  return {
    ...snapshot,
    addAccount,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    upsertBudget,
    deleteBudget,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    isSupabaseConfigured,
  };
}
