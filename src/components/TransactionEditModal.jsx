import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export function TransactionEditModal({ tx, availableCats, onSave, onCancel }) {
  const [category, setCategory] = useState(tx.category || '');
  const [label, setLabel] = useState(tx.label || '');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-zinc-900 shadow-2xl ring-1 ring-white/10">
        <div className="border-b border-white/5 bg-zinc-900/50 px-5 py-4 sm:px-6 sm:py-5">
          <h2 className="text-lg font-medium text-zinc-100">Details de la transaction</h2>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">Libelle bancaire</label>
            <input
              type="text"
              className="min-h-11 w-full rounded-xl border border-white/5 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 shadow-inner outline-none transition-colors hover:border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">Categorie cible</label>
            <input
              list="edit-modal-cats"
              autoFocus
              className="min-h-11 w-full rounded-xl border border-white/5 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 shadow-inner outline-none transition-colors hover:border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50"
              placeholder="Saisir ou choisir depuis l'historique..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <datalist id="edit-modal-cats">
              {availableCats.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/5 bg-zinc-900/50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button variant="ghost" onClick={onCancel} className="w-full sm:w-auto">
            Annuler
          </Button>
          <Button onClick={() => onSave({ label, category: category.trim() })} className="w-full sm:w-auto">
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}
