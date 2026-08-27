const supabase = require('../_lib/supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { de, para } = req.body;

    if (!de || !para) {
        return res.status(400).json({ error: "Parâmetros 'de' e 'para' são obrigatórios." });
    }

    if (de === para) {
        return res.json({ success: true, message: 'RIP já está no valor final.' });
    }

    const { data: existing } = await supabase
        .from('diagnostico')
        .select('rip')
        .eq('rip', para)
        .single();

    if (existing) {
        return res.status(409).json({ error: `O RIP ${para} já existe na base de dados.` });
    }

    const tables = ['diagnostico', 'tabela_spu', 'solicitacoes_alteracao'];
    for (const table of tables) {
        const { error } = await supabase
            .from(table)
            .update({ rip: para })
            .eq('rip', de);
        if (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    return res.json({ success: true, message: `Registro renomeado de ${de} para ${para}` });
};
