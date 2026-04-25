'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';

export function CsvImportModal({ accounts, onImport, onCancel }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      parseCSV(event.target.result);
    };
    reader.readAsText(file, 'windows-1252');
  };

  const processRow = (cols, parsed) => {
    if (cols.length < 4) return;
    if (cols[0].toLowerCase().includes('date')) return;

    const dateParts = cols[0].split('/');
    if (dateParts.length !== 3) return;

    const isoDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T12:00:00Z`;
    let label = cols[1].replace(/\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
    label = label.replace(/^PAIEMENT PAR CARTE\s*(X\d+\s*)?/i, '').trim();

    const debitStr = cols[2]?.replace(',', '.').replace(/\s/g, '').trim() || '';
    const creditStr = cols[3]?.replace(',', '.').replace(/\s/g, '').trim() || '';

    let amount = 0;
    if (debitStr && !Number.isNaN(parseFloat(debitStr))) amount -= Math.abs(parseFloat(debitStr));
    if (creditStr && !Number.isNaN(parseFloat(creditStr))) amount += Math.abs(parseFloat(creditStr));

    if (amount !== 0) {
      parsed.push({
        date: isoDate,
        label,
        amount,
        category: '',
        source: 'csv',
      });
    }
  };

  const parseCSV = (text) => {
    try {
      const parsed = [];
      let currentCols = [];
      let inQuotes = false;
      let value = '';

      for (let index = 0; index < text.length; index += 1) {
        const char = text[index];

        if (char === '"' && text[index + 1] === '"') {
          value += '"';
          index += 1;
        } else if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ';' && !inQuotes) {
          currentCols.push(value);
          value = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
          if (char === '\r' && text[index + 1] === '\n') index += 1;
          currentCols.push(value);
          processRow(currentCols, parsed);
          currentCols = [];
          value = '';
        } else {
          value += char;
        }
      }

      if (value || currentCols.length > 0) {
        currentCols.push(value);
        processRow(currentCols, parsed);
      }

      setPreview(parsed);
      setError(null);
    } catch {
      setError('Erreur lors de la lecture du fichier CSV. Format invalide.');
      setPreview([]);
    }
  };

  const handleSubmit = async () => {
    if (!accountId) return setError('Veuillez selectionner un compte.');
    if (preview.length === 0) return setError('Aucune transaction valide trouvee.');

    try {
      await onImport(preview.map((item) => ({ ...item, account_id: accountId })));
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        setError("Erreur reseau Supabase : impossible de contacter la base.");
      } else {
        setError(err.message || "Erreur lors de l'importation.");
      }
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-400">Compte cible</label>
        <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-400">Fichier CSV</label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-xl file:border-0 file:bg-indigo-500/20 file:px-4 file:py-3 file:text-sm file:font-semibold file:text-indigo-400 hover:file:bg-indigo-500/30"
        />
        <p className="mt-1 text-xs text-zinc-500">Colonnes attendues : Date ; Libelle ; Debit euros ; Credit euros</p>
      </div>

      {error && <div className="text-sm font-medium text-red-400">{error}</div>}

      {preview.length > 0 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm">
          <p className="mb-2 font-medium text-emerald-400">{preview.length} transactions detectees</p>
          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {preview.slice(0, 5).map((item, index) => (
              <div key={index} className="rounded-lg border border-white/5 bg-zinc-950/30 px-3 py-2 text-xs text-zinc-300">
                <div className="truncate">{item.label}</div>
                <div className={`mt-1 font-medium ${item.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {item.amount >= 0 ? '+' : ''}
                  {item.amount.toFixed(2)} EUR
                </div>
              </div>
            ))}
            {preview.length > 5 && (
              <div className="pt-1 text-center text-xs text-zinc-500">... et {preview.length - 5} autres</div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
        <Button onClick={onCancel} variant="ghost" className="w-full sm:flex-1">
          Annuler
        </Button>
        <Button onClick={handleSubmit} disabled={preview.length === 0} className="w-full sm:flex-1">
          Importer {preview.length > 0 ? preview.length : ''} ligne(s)
        </Button>
      </div>
    </div>
  );
}
