export default async function handler(req, res) {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).send('Missing "url" query parameter');

    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).send('Only http/https allowed');
    }

    const raw = process.env.IMAGE_WHITELIST || 'www.ga.gov.au';
    const allowedDomains = raw.split(',').map(d => d.trim()).filter(Boolean);
    const hostname = parsed.hostname;

    const isAllowed = allowedDomains.some(d => hostname === d || hostname.endsWith('.' + d.replace(/^\./, '')));
    if (!isAllowed) return res.status(403).send(`Domain not allowed: ${hostname}`);

    const upstream = await fetch(url);
    if (!upstream.ok) return res.status(upstream.status).send(`Upstream error ${upstream.status}`);

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.status(200).send(buf);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal proxy error');
  }
}
