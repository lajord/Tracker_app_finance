// In-memory data store used as a fallback when Supabase is not configured.
// Lives on the client only; resets on page reload.
// Once Supabase env vars are set, the app switches transparently.

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

function saveState(state) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function getInitialState() {
  const saved = loadState();
  if (saved) {
    // Wiping any old Revolut account, aggressively renaming the others
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
      if (!mergedAccounts.find(a => a.id === mAcc.id)) {
        mergedAccounts.push(mAcc);
      }
    });

    const mergedInvestments = [...(saved.investments || [])];
    mockInvestments.forEach(mInv => {
      const existing = mergedInvestments.find(i => i.id === mInv.id);
      if (!existing) {
        mergedInvestments.push(mInv);
      } else if (!existing.platform) {
        existing.platform = 'Trade Republic';
      }
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

// Simple shared state with subscribers
let state = null;
const listeners = new Set();
let accountsSynced = false;

async function syncAccountsToSupabase(accounts) {
  if (accountsSynced || !isSupabaseConfigured) return;
  accountsSynced = true;
  try {
    for (const acc of accounts) {
      // Only send columns that exist in the Supabase schema
      const { id, name, type, currency } = acc;
      const { error } = await supabase
        .from('accounts')
        .upsert({ id, name, type, currency }, { onConflict: 'id' });
      if (error) {
        console.error(`[sync] Failed to upsert account "${name}":`, error.message);
      }
    }
  } catch (err) {
    console.error('[sync] Account sync failed:', err);
    accountsSynced = false;
  }
}

function ensureInit() {
  if (state === null) state = getInitialState();
}

function notify() {
  saveState(state);
  listeners.forEach((l) => l(state));
}

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

    // Ensure all local accounts exist in Supabase
    syncAccountsToSupabase(state.accounts);

    return () => listeners.delete(listener);
  }, []);

  const addAccount = useCallback(async (acc) => {
    const newAcc = {
      id: crypto.randomUUID(),
      currency: 'EUR',
      ...acc,
    };
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('accounts')
        .insert(newAcc)
        .select()
        .single();
      if (error) throw error;
      state = { ...state, accounts: [data, ...state.accounts] };
    } else {
      state = { ...state, accounts: [newAcc, ...state.accounts] };
    }
    notify();
    return newAcc;
  }, []);

  const addTransaction = useCallback(async (tx) => {
    const newTx = {
      id: tx.id || crypto.randomUUID(),
      source: tx.source || 'manual',
      currency: 'EUR',
      ...tx,
      amount: Number(tx.amount),
    };

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('transactions')
        .insert(newTx)
        .select()
        .single();
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
    state = {
      ...state,
      transactions: state.transactions.filter((t) => t.id !== id),
    };
    notify();
  }, []);

  const updateTransaction = useCallback(async (id, patch) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('transactions').update(patch).eq('id', id);
      if (error) throw error;
    }
    state = {
      ...state,
      transactions: state.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    };
    notify();
  }, []);

  const upsertBudget = useCallback(async (budget) => {
    const existing = state.budgets.find(
      (b) => b.category === budget.category
    );
    let next;
    if (existing) {
      next = state.budgets.map((b) =>
        b.id === existing.id ? { ...b, amount_limit: Number(budget.amount_limit) } : b
      );
    } else {
      next = [
        ...state.budgets,
        {
          id: crypto.randomUUID(),
          ...budget,
          amount_limit: Number(budget.amount_limit),
        },
      ];
    }
    state = { ...state, budgets: next };
    notify();
  }, []);

  const deleteBudget = useCallback(async (id) => {
    state = { ...state, budgets: state.budgets.filter((b) => b.id !== id) };
    notify();
  }, []);

  // ---------- Investments ----------
  const addInvestment = useCallback(async (inv) => {
    const newInv = {
      id: crypto.randomUUID(),
      ...inv,
      invested_amount: Number(inv.invested_amount),
    };

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('investments')
        .insert(newInv)
        .select()
        .single();
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
    state = {
      ...state,
      investments: state.investments.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    };
    notify();
  }, []);

  const deleteInvestment = useCallback(async (id) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('investments').delete().eq('id', id);
      if (error) throw error;
    }
    state = {
      ...state,
      investments: state.investments.filter((i) => i.id !== id),
    };
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
