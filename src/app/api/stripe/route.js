import Stripe from 'stripe';

export async function GET(request) {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || key === 'sk_test_VOTRE_CLE_ICI') {
      return Response.json({ 
        error: 'Veuillez configurer votre STRIPE_SECRET_KEY dans le fichier .env.local à la racine du projet.' 
      }, { status: 400 });
    }

    const stripe = new Stripe(key, { apiVersion: '2023-10-16' });

    // Récupération des 100 derniers paiements réussis
    const charges = await stripe.charges.list({ limit: 100 });
    const payouts = await stripe.payouts.list({ limit: 100 });

    const chargeTxs = charges.data
      .filter((c) => c.paid && !c.refunded && c.amount > 0)
      .map((c) => {
        const desc = c.description || c.billing_details?.name || c.billing_details?.email || 'Abonnement / Vente';
        return {
          date: new Date(c.created * 1000).toISOString(),
          label: `[Stripe] ${desc}`,
          amount: c.amount / 100,
          category: 'Entrepreneuriat',
          source: 'stripe',
          external_id: `stripe_${c.id}`,
          currency: (c.currency || 'eur').toUpperCase()
        };
      });

    const payoutTxs = payouts.data
      .filter((p) => p.status === 'paid' && p.amount > 0)
      .map((p) => {
        return {
          date: new Date(p.created * 1000).toISOString(),
          label: `[Stripe] Versement vers ta banque`,
          amount: -(p.amount / 100), // C'est une sortie d'argent du compte Stripe
          category: 'Transfert Interne',
          source: 'stripe',
          external_id: `stripe_po_${p.id}`,
          currency: (p.currency || 'eur').toUpperCase()
        };
      });

    return Response.json({ transactions: [...chargeTxs, ...payoutTxs] });
  } catch (err) {
    if (err.type === 'StripeAuthenticationError') {
      return Response.json({ error: 'La clé Stripe (STRIPE_SECRET_KEY) est invalide.' }, { status: 401 });
    }
    return Response.json({ error: err.message }, { status: 500 });
  }
}
