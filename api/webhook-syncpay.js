const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://eisnibawuzcgdpkrrzrr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpc25pYmF3dXpjZ2Rwa3JyenJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyOTU0MDIsImV4cCI6MjEwNzg3MTQwMn0.w0GWzZ124HE-gM4zkP8AarfNVbK9HIfzG-hBlsVXpp0";
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const notification = req.body || {};
      console.log("Webhook recebido da SyncPay:", JSON.stringify(notification));
      
      // Procura o ID e o status em todas as variações possíveis que os gateways costumam usar
      const status = notification.status || notification.data?.status || notification.paymentStatus;
      const transactionId = notification.id || notification.identifier || notification.transactionId || notification.data?.id || notification.data?.identifier || notification.data?.transactionId;

      const isPaid = ['PAID', 'APPROVED', 'COMPLETED', 'CONFIRMED', 'PAGO', 'APROVADO'].includes((status || '').toUpperCase());

      if (transactionId) {
        const { error: dbError } = await supabaseClient
          .from('pagamentos')
          .upsert({
            transaction_id: String(transactionId),
            status: status || 'PENDING',
            paid: isPaid,
            updated_at: new Date().toISOString()
          }, { onConflict: 'transaction_id' });

        if (dbError) {
          console.error("Erro ao salvar no Supabase via Webhook:", dbError);
        } else {
          console.log(`Sucesso! Transação ${transactionId} atualizada para '${status}' (Pago: ${isPaid}) no Supabase.`);
        }
      } else {
        console.warn("Aviso: ID da transação não encontrado no corpo do webhook:", notification);
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      console.error("Erro crítico no Webhook SyncPay:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
};
