import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export function TransactionEditModal({ tx, availableCats, onSave, onCancel }) {
  const [category, setCategory] = useState(tx.category || '');
  const [label, setLabel] = useState(tx.label || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-xl bg-zinc-900 shadow-2xl ring-1 ring-white/10 overflow-hidden">
        <div className="px-6 py-5 border-b border-white/5 bg-zinc-900/50">
          <h2 className="text-lg font-medium text-zinc-100">Détails de la transaction</h2>
        </div>
        
        <div className="p-6 space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">Libellé bancaire</label>
            <input
              type="text"
              className="w-full rounded-md bg-zinc-950 border border-white/5 hover:border-white/10 px-3 py-2 text-sm text-zinc-200 shadow-inner outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">Catégorie cible</label>
            <input
              list="edit-modal-cats"
              autoFocus
              className="w-full rounded-md bg-zinc-950 border border-white/5 hover:border-white/10 px-3 py-2 text-sm text-zinc-200 shadow-inner outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50"
              placeholder="Saisir ou sélectionner depuis l'historique..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <datalist id="edit-modal-cats">
              {availableCats.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/5 flex flex-col-reverse sm:flex-row justify-end gap-3 bg-zinc-900/50">
          <Button variant="ghost" onClick={onCancel} className="sm:w-auto w-full">Annuler</Button>
          <Button onClick={() => onSave({ label, category: category.trim() })} className="sm:w-auto w-full">Enregistrer les modifications</Button>
        </div>
      </div>
    </div>
  );
}
