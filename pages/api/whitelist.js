export default function handler(req, res) {
  const raw = process.env.IMAGE_WHITELIST || 'www.ga.gov.au';
  const allowedDomains = raw.split(',').map(d => d.trim()).filter(Boolean);
  res.status(200).json({ allowedDomains });
}