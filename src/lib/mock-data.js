import { subDays, format } from 'date-fns';

export const mockAccounts = [
  { id: '00000000-0000-0000-0000-000000000000', name: 'Credit Agricole compte', type: 'checking', currency: 'EUR', initial_balance: 0 },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Livret A', type: 'savings', currency: 'EUR', initial_balance: 0 },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Trade Republic', type: 'investment', currency: 'EUR', initial_balance: 0 },
  { id: '55555555-5555-5555-5555-555555555555', name: 'Binance', type: 'investment', currency: 'EUR', initial_balance: 0 },
];

export const mockInvestments = [
  {
    id: 'inv-1',
    name: 'BNP Paribas Easy S&P 500 UCITS ETF EUR',
    category: 'ETF',
    platform: 'Trade Republic',
    invested_amount: 85.67,
    operations: [
      { date: '2025-09-15', amount: 56.54, price: 28.25, quantity: 2, fees: 0.28 },
      { date: '2025-10-15', amount: 29.13, price: 29.13, quantity: 1, fees: 0.15 }
    ]
  },
  {
    id: 'inv-2',
    name: 'ETF BNP Paribas Easy STOXX europe 600 UCITS ETF',
    category: 'ETF',
    platform: 'Trade Republic',
    invested_amount: 54.04,
    operations: [
      { date: '2025-09-15', amount: 54.04, price: 17.92, quantity: 3, fees: 0.27 }
    ]
  }
];
export const mockTransactions = [];
export const mockBudgets = [];
