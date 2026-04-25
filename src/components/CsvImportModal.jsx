'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';

export function CsvImportModal({ accounts, onImport, onCancel }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      parseCSV(text);
    };
    reader.readAsText(f, 'windows-1252'); // French bank CSVs often use windows-1252 to encode accents
  };

  const parseCSV = (text) => {
    try {
      const parsed = [];
      let currentCols = [];
      let inQuotes = false;
      let val = '';
      
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        if (char === '"' && text[i+1] === '"') {
          val += '"';
          i++;
        } else if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ';' && !inQuotes) {
          currentCols.push(val);
          val = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
          if (char === '\r' && text[i+1] === '\n') {
            i++; 
          }
          currentCols.push(val);
          processRow(currentCols, parsed);
          currentCols = [];
          val = '';
        } else {
          val += char;
        }
      }
      
      if (val || currentCols.length > 0) {
        currentCols.push(val);
        processRow(currentCols, parsed);
      }

      setPreview(parsed);
      setError(null);
    } catch (err) {
      setError('Erreur lors de la lecture du fichier CSV. Format invalide.');
      setPreview([]);
    }
  };

  const processRow = (cols, parsed) => {
    if (cols.length < 4) return;
    if (cols[0].toLowerCase().includes('date')) return; // Header skip

    const dateParts = cols[0].split('/');
    if (dateParts.length !== 3) return;
    const isoDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T12:00:00Z`;

    // Remove newlines and excess whitespace from labels
    let label = cols[1].replace(/\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
    // Specific cleanup for Crédit Agricole "PAIEMENT PAR CARTE XXXXX" prefixes
    label = label.replace(/^PAIEMENT PAR CARTE\s*(X\d+\s*)?/i, '').trim();
    const debitStr = cols[2]?.replace(',', '.').replace(/\s/g, '').trim() || '';
    const creditStr = cols[3]?.replace(',', '.').replace(/\s/g, '').trim() || '';

    let amount = 0;
    if (debitStr && !isNaN(parseFloat(debitStr))) {
      amount -= Math.abs(parseFloat(debitStr));
    }
    if (creditStr && !isNaN(parseFloat(creditStr))) {
      amount += Math.abs(parseFloat(creditStr));
    }

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

  const handleSubmit = async () => {
    if (!accountId) return setError('Veuillez sélectionner un compte.');
    if (preview.length === 0) return setError('Aucune transaction valide trouvée.');
    
    try {
      const txToImport = preview.map(p => ({ ...p, account_id: accountId }));
      await onImport(txToImport);
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        setError("Erreur réseau (Supabase) : Impossible de contacter la bdd (URL invalide ou proxy).");
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
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-400">Fichier CSV (Crédit Agricole)</label>
        <input 
          type="file" 
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-xl file:border-0 file:bg-indigo-500/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-400 hover:file:bg-indigo-500/30 cursor-pointer"
        />
        <p className="mt-1 text-xs text-zinc-500">Colonnes : Date ; Libellé ; Débit euros ; Crédit euros</p>
      </div>

      {error && <div className="text-sm font-medium text-red-400">{error}</div>}

      {preview.length > 0 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm">
          <p className="font-medium text-emerald-400 mb-2">{preview.length} transactions détectées</p>
          <div className="max-h-40 overflow-y-auto space-y-1 pr-2">
            {preview.slice(0, 5).map((p, i) => (
              <div key={i} className="flex justify-between border-b border-white/5 py-1.5 last:border-0 text-xs text-zinc-300">
                <span className="truncate pr-2">{p.label}</span>
                <span className={`shrink-0 font-medium ${p.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {p.amount >= 0 ? '+' : ''}{p.amount.toFixed(2)} €
                </span>
              </div>
            ))}
            {preview.length > 5 && (
              <div className="text-xs text-zinc-500 pt-2 text-center">... et {preview.length - 5} autres</div>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button onClick={onCancel} variant="ghost" className="flex-1">Annuler</Button>
        <Button onClick={handleSubmit} disabled={preview.length === 0} className="flex-1 font-semibold">
          Importer {preview.length > 0 ? preview.length : ''} ligne(s)
        </Button>
      </div>
    </div>
  );
}
