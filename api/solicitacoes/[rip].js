const supabase = require('../_lib/supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { rip } = req.query;

    if (!rip) {
        return res.status(400).json({ error: 'RIP é obrigatório.' });
    }

    const { data, error } = await supabase
        .from('solicitacoes_alteracao')
        .select('*')
        .eq('rip', rip)
        .order('data_hora', { ascending: false });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, data });
};
