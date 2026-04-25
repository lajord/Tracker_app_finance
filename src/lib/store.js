'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { mockAccounts, mockInvestments } from './mock-data';
import { supabase, isSupabaseConfigured } from './supabase';

const LEGACY_FINANCE_STORAGE_KEY = 'tracker_finance_state_v3';
const LEGACY_SYNCED_KEY = 'tracker_supabase_synced';
const LEGACY_CANCELLED_SUBS_KEY = 'tracker_cancelled_subs';

function createInitialState() {
  return {
    transactions: [],
    accounts: [],
    budgets: [],
    investments: [],
    subscriptionPreferences: [],
    isLoading: isSupabaseConfigured,
    initializationError: null,
    isSupabaseConfigured,
  };
}

const SERVER_SNAPSHOT = createInitialState();
let state = createInitialState();
let isInitialized = false;
let initializationPromise = null;
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(next) {
  state = typeof next === 'function' ? next(state) : next;
  emit();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

function readLegacyJson(key) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearLegacyBrowserState() {
  if (typeof window === 'undefined') return;
  clearLegacyFinanceState();
  clearLegacyCancelledSubscriptionsState();
}

function clearLegacyFinanceState() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LEGACY_FINANCE_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_SYNCED_KEY);
}

function clearLegacyCancelledSubscriptionsState() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LEGACY_CANCELLED_SUBS_KEY);
}

function normalizeDateValue(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const asString = String(value);
  return asString.includes('T') ? asString.slice(0, 10) : asString;
}

function normalizeLegacyAccounts(savedAccounts = []) {
  const mergedAccounts = [...savedAccounts]
    .filter((account) => account.name !== 'Revolut' && account.id !== '11111111-1111-1111-1111-111111111111')
    .map((account) => {
      if (account.id === '00000000-0000-0000-0000-000000000000' || account.name === 'Compte Principal') {
        return { ...account, name: 'Credit Agricole compte' };
      }

      if (
        account.id === '22222222-2222-2222-2222-222222222222' ||
        account.name === 'Compte Investissement' ||
        account.name === 'Binance et Trade Republic'
      ) {
        return { ...account, id: '44444444-4444-4444-4444-444444444444', name: 'Trade Republic' };
      }

      return account;
    })
    .map((account) => ({
      ...account,
      currency: account.currency || 'EUR',
      initial_balance: Number(account.initial_balance || 0),
    }));

  mockAccounts.forEach((account) => {
    if (!mergedAccounts.find((existing) => existing.id === account.id)) {
      mergedAccounts.push(account);
    }
  });

  return mergedAccounts;
}

function normalizeLegacyInvestments(savedInvestments = []) {
  const mergedInvestments = [...savedInvestments].map((investment) => ({
    ...investment,
    invested_amount: Number(investment.invested_amount || 0),
    operations: Array.isArray(investment.operations) ? investment.operations : [],
  }));

  mockInvestments.forEach((investment) => {
    const existing = mergedInvestments.find((candidate) => candidate.id === investment.id);
    if (!existing) {
      mergedInvestments.push(investment);
    } else if (!existing.platform) {
      existing.platform = 'Trade Republic';
    }
  });

  return mergedInvestments;
}

function normalizeLegacyState(saved) {
  if (!saved) return null;

  return {
    transactions: Array.isArray(saved.transactions)
      ? saved.transactions.map((transaction) => ({
          ...transaction,
          amount: Number(transaction.amount || 0),
          date: normalizeDateValue(transaction.date),
          source: transaction.source || 'manual',
          currency: transaction.currency || 'EUR',
        }))
      : [],
    accounts: normalizeLegacyAccounts(saved.accounts || []),
    budgets: Array.isArray(saved.budgets)
      ? saved.budgets.map((budget) => ({
          ...budget,
          amount_limit: Number(budget.amount_limit || 0),
        }))
      : [],
    investments: normalizeLegacyInvestments(saved.investments || []),
  };
}

function normalizeAccountPayload(account) {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    currency: account.currency || 'EUR',
    initial_balance: Number(account.initial_balance || 0),
  };
}

function normalizeTransactionPayload(transaction) {
  return {
    id: transaction.id || crypto.randomUUID(),
    label: transaction.label,
    amount: Number(transaction.amount || 0),
    date: normalizeDateValue(transaction.date),
    category: transaction.category || null,
    account_id: transaction.account_id || null,
    source: transaction.source || 'manual',
    currency: transaction.currency || 'EUR',
    external_id: transaction.external_id || null,
  };
}

function normalizeBudgetPayload(budget) {
  return {
    id: budget.id || crypto.randomUUID(),
    category: budget.category,
    amount_limit: Number(budget.amount_limit || 0),
  };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
}

function buildDeterministicUuid(seed) {
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;
  let h3 = 0x811c9dc5;
  let h4 = 0x811c9dc5;

  for (let index = 0; index < seed.length; index += 1) {
    const code = seed.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ (code + index), 0x01000193);
    h3 = Math.imul(h3 ^ (code + index * 7), 0x01000193);
    h4 = Math.imul(h4 ^ (code + index * 13), 0x01000193);
  }

  const hex = [h1, h2, h3, h4]
    .map((value) => (value >>> 0).toString(16).padStart(8, '0'))
    .join('');

  const chars = hex.slice(0, 32).split('');
  chars[12] = '4';
  chars[16] = ['8', '9', 'a', 'b'][parseInt(chars[16], 16) % 4];

  const normalized = chars.join('');
  return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(16, 20)}-${normalized.slice(20, 32)}`;
}

function normalizeLegacyInvestmentId(investment) {
  if (isUuid(investment.id)) return investment.id;

  const legacySeed = [
    investment.id,
    investment.name,
    investment.platform,
    investment.category,
  ]
    .filter(Boolean)
    .join('::');

  return buildDeterministicUuid(legacySeed || 'legacy-investment');
}

function normalizeInvestmentPayload(investment) {
  return {
    id: isUuid(investment.id) ? investment.id : normalizeLegacyInvestmentId(investment),
    name: investment.name,
    platform: investment.platform || null,
    category: investment.category || 'ETF',
    invested_amount: Number(investment.invested_amount || 0),
    operations: Array.isArray(investment.operations) ? investment.operations : [],
  };
}

function isMissingTableError(error) {
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    /relation .* does not exist/i.test(error?.message || '') ||
    /could not find the table .* in the schema cache/i.test(error?.message || '')
  );
}

async function loadSubscriptionPreferences() {
  const { data, error } = await supabase
    .from('subscription_preferences')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    if (isMissingTableError(error)) {
      console.warn('[store] subscription_preferences table missing, defaulting to empty preferences');
      return [];
    }
    throw error;
  }

  return data || [];
}

async function loadFromSupabase() {
  const [txRes, accRes, budRes, invRes, subscriptionPreferences] = await Promise.all([
    supabase.from('transactions').select('*').order('date', { ascending: false }),
    supabase.from('accounts').select('*').order('name'),
    supabase.from('budgets').select('*').order('category'),
    supabase.from('investments').select('*').order('name'),
    loadSubscriptionPreferences(),
  ]);

  const coreErrors = [txRes.error, accRes.error, budRes.error, invRes.error].filter(Boolean);
  if (coreErrors.length > 0) {
    throw coreErrors[0];
  }

  return {
    transactions: txRes.data || [],
    accounts: accRes.data || [],
    budgets: budRes.data || [],
    investments: invRes.data || [],
    subscriptionPreferences,
  };
}

async function migrateLegacyBrowserState() {
  if (typeof window === 'undefined' || !isSupabaseConfigured) return;

  const legacyFinance = normalizeLegacyState(readLegacyJson(LEGACY_FINANCE_STORAGE_KEY));
  const legacyCancelled = readLegacyJson(LEGACY_CANCELLED_SUBS_KEY);
  const cancelledKeys = Array.isArray(legacyCancelled)
    ? [...new Set(legacyCancelled.filter((key) => typeof key === 'string' && key.trim()))]
    : [];

  if (!legacyFinance && cancelledKeys.length === 0) {
    window.localStorage.removeItem(LEGACY_SYNCED_KEY);
    return;
  }

  let financeErrors = 0;
  let cancelledPreferenceErrors = 0;
  let canClearCancelledPreferences = cancelledKeys.length === 0;

  if (legacyFinance) {
    for (const account of legacyFinance.accounts) {
      const { error } = await supabase
        .from('accounts')
        .upsert(normalizeAccountPayload(account), { onConflict: 'id' });
      if (error) {
        console.error('[migration] account error:', account.name, error.message);
        financeErrors += 1;
      }
    }

    for (const transaction of legacyFinance.transactions) {
      const payload = normalizeTransactionPayload(transaction);
      const { error } = await supabase
        .from('transactions')
        .upsert(payload, { onConflict: 'id' });
      if (error) {
        console.error('[migration] transaction error:', payload.label, error.message);
        financeErrors += 1;
      }
    }

    for (const budget of legacyFinance.budgets) {
      const payload = normalizeBudgetPayload(budget);
      const { error } = await supabase
        .from('budgets')
        .upsert(payload, { onConflict: 'id' });
      if (error) {
        console.error('[migration] budget error:', payload.category, error.message);
        financeErrors += 1;
      }
    }

    for (const investment of legacyFinance.investments) {
      const payload = normalizeInvestmentPayload(investment);
      const { error } = await supabase
        .from('investments')
        .upsert(payload, { onConflict: 'id' });
      if (error) {
        console.error('[migration] investment error:', payload.name, error.message);
        financeErrors += 1;
      }
    }
  }

  for (const key of cancelledKeys) {
    const { error } = await supabase.from('subscription_preferences').upsert(
      {
        group_key: key,
        is_cancelled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'group_key' }
    );

    if (error) {
      if (isMissingTableError(error)) {
        console.warn('[migration] subscription_preferences table missing, skipping cancelled subscriptions migration');
        canClearCancelledPreferences = false;
        break;
      }
      console.error('[migration] subscription preference error:', key, error.message);
      cancelledPreferenceErrors += 1;
    }
  }

  if (financeErrors === 0 && legacyFinance) {
    clearLegacyFinanceState();
  }

  if (cancelledPreferenceErrors === 0 && canClearCancelledPreferences) {
    clearLegacyCancelledSubscriptionsState();
  }

  if (financeErrors === 0 && cancelledPreferenceErrors === 0 && canClearCancelledPreferences) {
    console.log('[migration] legacy browser state migrated to Supabase');
  } else {
    const totalErrors = financeErrors + cancelledPreferenceErrors;
    console.warn(`[migration] completed with ${totalErrors} error(s); some legacy browser state was kept for retry`);
  }
}

async function initializeStore() {
  if (!isSupabaseConfigured || !supabase) {
    isInitialized = true;
    setState({
      ...createInitialState(),
      isLoading: false,
      initializationError: 'Supabase n’est pas configuré.',
    });
    return state;
  }

  setState((current) => ({
    ...current,
    isLoading: true,
    initializationError: null,
  }));

  try {
    await migrateLegacyBrowserState();
    const remoteState = await loadFromSupabase();

    setState({
      ...createInitialState(),
      ...remoteState,
      isLoading: false,
      initializationError: null,
    });

    isInitialized = true;
    return remoteState;
  } catch (error) {
    setState((current) => ({
      ...current,
      isLoading: false,
      initializationError: error?.message || 'Impossible de charger les données Supabase.',
    }));
    throw error;
  }
}

function ensureInitialized() {
  if (isInitialized) return Promise.resolve(state);
  if (!initializationPromise) {
    initializationPromise = initializeStore().finally(() => {
      initializationPromise = null;
    });
  }
  return initializationPromise;
}

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase n’est pas configuré.');
  }
}

export function useFinanceStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    ensureInitialized().catch((error) => {
      console.error('[store] initialization failed:', error);
    });
  }, []);

  const addAccount = useCallback(async (account) => {
    requireSupabase();
    await ensureInitialized();

    const payload = normalizeAccountPayload({
      id: crypto.randomUUID(),
      currency: 'EUR',
      initial_balance: 0,
      ...account,
    });

    const { data, error } = await supabase
      .from('accounts')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    setState((current) => ({
      ...current,
      accounts: [data, ...current.accounts],
    }));

    return data;
  }, []);

  const addTransaction = useCallback(async (transaction) => {
    requireSupabase();
    await ensureInitialized();

    const payload = normalizeTransactionPayload(transaction);
    const { data, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    setState((current) => ({
      ...current,
      transactions: [data, ...current.transactions],
    }));

    return data;
  }, []);

  const deleteTransaction = useCallback(async (id) => {
    requireSupabase();
    await ensureInitialized();

    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;

    setState((current) => ({
      ...current,
      transactions: current.transactions.filter((transaction) => transaction.id !== id),
    }));
  }, []);

  const updateTransaction = useCallback(async (id, patch) => {
    requireSupabase();
    await ensureInitialized();

    const normalizedPatch = {
      ...patch,
      amount: patch.amount === undefined ? undefined : Number(patch.amount),
      date: patch.date ? normalizeDateValue(patch.date) : undefined,
    };

    const { data, error } = await supabase
      .from('transactions')
      .update(normalizedPatch)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    setState((current) => ({
      ...current,
      transactions: current.transactions.map((transaction) => (transaction.id === id ? data : transaction)),
    }));
  }, []);

  const upsertBudget = useCallback(async (budget) => {
    requireSupabase();
    await ensureInitialized();

    const existing = state.budgets.find((entry) => entry.category === budget.category);

    if (existing) {
      const payload = {
        category: budget.category,
        amount_limit: Number(budget.amount_limit),
      };

      const { data, error } = await supabase
        .from('budgets')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;

      setState((current) => ({
        ...current,
        budgets: current.budgets.map((entry) => (entry.id === existing.id ? data : entry)),
      }));

      return data;
    }

    const payload = normalizeBudgetPayload(budget);
    const { data, error } = await supabase
      .from('budgets')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    setState((current) => ({
      ...current,
      budgets: [...current.budgets, data],
    }));

    return data;
  }, []);

  const deleteBudget = useCallback(async (id) => {
    requireSupabase();
    await ensureInitialized();

    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) throw error;

    setState((current) => ({
      ...current,
      budgets: current.budgets.filter((budget) => budget.id !== id),
    }));
  }, []);

  const addInvestment = useCallback(async (investment) => {
    requireSupabase();
    await ensureInitialized();

    const payload = normalizeInvestmentPayload({
      id: crypto.randomUUID(),
      ...investment,
    });

    const { data, error } = await supabase
      .from('investments')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    setState((current) => ({
      ...current,
      investments: [data, ...current.investments],
    }));

    return data;
  }, []);

  const updateInvestment = useCallback(async (id, patch) => {
    requireSupabase();
    await ensureInitialized();

    const normalizedPatch = {
      ...patch,
      invested_amount: patch.invested_amount === undefined ? undefined : Number(patch.invested_amount),
      operations: patch.operations === undefined ? undefined : (Array.isArray(patch.operations) ? patch.operations : []),
    };

    const { data, error } = await supabase
      .from('investments')
      .update(normalizedPatch)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    setState((current) => ({
      ...current,
      investments: current.investments.map((investment) => (investment.id === id ? data : investment)),
    }));
  }, []);

  const deleteInvestment = useCallback(async (id) => {
    requireSupabase();
    await ensureInitialized();

    const { error } = await supabase.from('investments').delete().eq('id', id);
    if (error) throw error;

    setState((current) => ({
      ...current,
      investments: current.investments.filter((investment) => investment.id !== id),
    }));
  }, []);

  const setSubscriptionCancelled = useCallback(async (groupKey, isCancelled) => {
    requireSupabase();
    await ensureInitialized();

    const payload = {
      group_key: groupKey,
      is_cancelled: Boolean(isCancelled),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('subscription_preferences')
      .upsert(payload, { onConflict: 'group_key' })
      .select()
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        throw new Error('La table subscription_preferences est absente. Applique la migration Supabase correspondante.');
      }
      throw error;
    }

    setState((current) => ({
      ...current,
      subscriptionPreferences: [
        data,
        ...current.subscriptionPreferences.filter((preference) => preference.group_key !== groupKey),
      ],
    }));

    return data;
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
    setSubscriptionCancelled,
  };
}
