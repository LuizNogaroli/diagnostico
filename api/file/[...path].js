const supabase = require('../_lib/supabase');

module.exports = async (req, res) => {
    const { path } = req.query;
    const filePath = Array.isArray(path) ? path.join('/') : path;

    if (!filePath) {
        return res.status(400).json({ error: 'Path é obrigatório.' });
    }

    const { data, error } = await supabase.storage
        .from('uploads')
        .download(filePath);

    if (error) {
        return res.status(404).json({ error: 'Arquivo não encontrado.' });
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const contentType = data.type || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(buffer);
};
