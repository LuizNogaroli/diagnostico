const supabase = require('../_lib/supabase');
const { parseMultipart } = require('../_lib/multipart');

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

    try {
        const contentType = req.headers['content-type'] || '';
        let body = {};
        let uploadedPaths = [];

        if (contentType.includes('multipart/form-data')) {
            const { fields, files } = await parseMultipart(req);
            body = fields;

            if (files.arquivos && files.arquivos.length > 0) {
                for (const file of files.arquivos) {
                    const ext = (file.filename || 'file').split('.').pop() || 'bin';
                    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
                    const { error: uploadError } = await supabase.storage
                        .from('uploads')
                        .upload(filename, file.buffer, { contentType: file.mimeType });
                    if (!uploadError) {
                        uploadedPaths.push(filename);
                    }
                }
            }
        } else {
            body = req.body;
        }

        const { rip, campo_nome, valor_atual, novo_valor, justificativa, fundamentacao } = body;

        if (!rip || !campo_nome) {
            return res.status(400).json({ error: 'RIP e campo_nome são obrigatórios.' });
        }

        const { data: existing } = await supabase
            .from('solicitacoes_alteracao')
            .select('id, arquivos')
            .eq('rip', rip)
            .eq('campo_nome', campo_nome)
            .single();

        let allFiles = uploadedPaths;
        if (existing && existing.arquivos) {
            try {
                allFiles = [...JSON.parse(existing.arquivos), ...uploadedPaths];
            } catch (e) {}
        }
        const arquivosJson = allFiles.length > 0 ? JSON.stringify(allFiles) : null;

        const payload = {
            valor_atual: valor_atual || '',
            novo_valor: novo_valor || '',
            justificativa: justificativa || '',
            fundamentacao: fundamentacao || '',
            arquivos: arquivosJson
        };

        if (existing) {
            const { error } = await supabase
                .from('solicitacoes_alteracao')
                .update({ ...payload, data_hora: new Date().toISOString() })
                .eq('id', existing.id);
            if (error) return res.status(500).json({ error: error.message });
            return res.json({ success: true, id: existing.id });
        } else {
            const { data, error } = await supabase
                .from('solicitacoes_alteracao')
                .insert({ rip, campo_nome, ...payload })
                .select('id')
                .single();
            if (error) return res.status(500).json({ error: error.message });
            return res.json({ success: true, id: data.id });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
