const supabase = require('../_lib/supabase');
const { parseMultipart } = require('../_lib/multipart');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        const { data, error } = await supabase
            .from('diagnostico')
            .select('*')
            .order('rip');

        if (error) {
            return res.status(500).json({ error: error.message });
        }
        return res.json({ success: true, data });
    }

    if (req.method === 'POST') {
        try {
            const { fields, files } = await parseMultipart(req);
            const body = fields;

            const fileFields = ['imagem', 'planta_pdf', 'planta_sei_pdf', 'vetorial'];
            for (const field of fileFields) {
                if (files[field] && files[field].length > 0) {
                    const uploadedPaths = [];
                    for (const file of files[field]) {
                        const ext = file.filename.split('.').pop() || 'bin';
                        const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
                        const { error: uploadError } = await supabase.storage
                            .from('uploads')
                            .upload(filename, file.buffer, { contentType: file.mimeType });
                        if (!uploadError) {
                            uploadedPaths.push(filename);
                        }
                    }
                    if (uploadedPaths.length > 0) {
                        let existingPaths = [];
                        if (body[field]) {
                            try { existingPaths = JSON.parse(body[field]); } catch (e) {}
                        }
                        body[field] = JSON.stringify([...existingPaths, ...uploadedPaths]);
                    }
                }
            }

            const rip = body.rip;
            if (!rip) {
                return res.status(400).json({ error: 'RIP é obrigatório.' });
            }

            const { data: existing } = await supabase
                .from('diagnostico')
                .select('rip')
                .eq('rip', rip)
                .single();

            if (existing) {
                const { error } = await supabase
                    .from('diagnostico')
                    .update(body)
                    .eq('rip', rip);
                if (error) return res.status(500).json({ error: error.message });
            } else {
                const { error } = await supabase
                    .from('diagnostico')
                    .insert(body);
                if (error) return res.status(500).json({ error: error.message });
            }

            return res.json({ success: true, message: 'Dados salvos com sucesso', rip });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
