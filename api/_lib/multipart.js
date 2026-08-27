const Busboy = require('busboy');

function parseMultipart(req) {
    return new Promise((resolve, reject) => {
        const contentType = req.headers['content-type'] || '';
        if (!contentType.includes('multipart/form-data')) {
            return resolve({ fields: req.body || {}, files: {} });
        }

        const busboy = Busboy({ headers: req.headers, limits: { fileSize: 50 * 1024 * 1024 } });
        const fields = {};
        const files = {};

        busboy.on('field', (name, value) => {
            fields[name] = value;
        });

        busboy.on('file', (name, file, info) => {
            const chunks = [];
            file.on('data', (chunk) => chunks.push(chunk));
            file.on('end', () => {
                if (!files[name]) files[name] = [];
                files[name].push({
                    filename: info.filename,
                    mimeType: info.mimeType,
                    buffer: Buffer.concat(chunks)
                });
            });
        });

        busboy.on('finish', () => resolve({ fields, files }));
        busboy.on('error', reject);

        req.pipe(busboy);
    });
}

module.exports = { parseMultipart };
