const supabase = require('../_lib/supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { rip } = req.query;

    if (!rip) {
        return res.status(400).json({ error: 'RIP é obrigatório.' });
    }

    if (req.method === 'GET') {
        const { data, error } = await supabase
            .from('tabela_spu')
            .select('*')
            .eq('rip', rip)
            .single();

        if (error || !data) {
            return res.json({ success: false, message: 'RIP não encontrado na tabela_spu' });
        }
        return res.json({ success: true, data });
    }

    if (req.method === 'DELETE') {
        const { data, error } = await supabase
            .from('tabela_spu')
            .delete()
            .eq('rip', rip);

        if (error) {
            return res.status(500).json({ error: error.message });
        }
        return res.json({ success: true, message: 'Registro removido' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
