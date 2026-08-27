const supabase = require('../_lib/supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        const { data, error } = await supabase
            .from('tabela_spu')
            .select('*')
            .order('rip');

        if (error) {
            return res.status(500).json({ error: error.message });
        }
        return res.json({ success: true, data });
    }

    if (req.method === 'POST') {
        try {
            const formData = await req.formData();
            const body = {};
            for (const [key, value] of formData.entries()) {
                if (typeof value === 'string') {
                    body[key] = value;
                }
            }

            const fileFields = ['imagem', 'planta_pdf', 'planta_sei_pdf', 'vetorial'];
            for (const field of fileFields) {
                const files = formData.getAll(field);
                if (files.length > 0 && files[0] instanceof File) {
                    const uploadedPaths = [];
                    for (const file of files) {
                        const ext = file.name.split('.').pop() || 'bin';
                        const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
                        const buffer = Buffer.from(await file.arrayBuffer());
                        const { error: uploadError } = await supabase.storage
                            .from('uploads')
                            .upload(filename, buffer, { contentType: file.type });
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

            body.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);

            const { data: existing } = await supabase
                .from('tabela_spu')
                .select('rip')
                .eq('rip', rip)
                .single();

            if (existing) {
                const { error } = await supabase
                    .from('tabela_spu')
                    .update(body)
                    .eq('rip', rip);
                if (error) return res.status(500).json({ error: error.message });
            } else {
                const { error } = await supabase
                    .from('tabela_spu')
                    .insert(body);
                if (error) return res.status(500).json({ error: error.message });
            }

            return res.json({ success: true, message: 'tabela_spu atualizada', rip });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
