import { useEffect, useState } from 'react';

export default function Home() {
  const [whitelist, setWhitelist] = useState([]);
  const [url, setUrl] = useState('https://www.ga.gov.au/__data/assets/file/0019/120466/geoscience_inline_Black.svg');
  const [submittedUrl, setSubmittedUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/whitelist')
      .then(res => res.json())
      .then(data => setWhitelist(data.allowedDomains || []))
      .catch(() => setWhitelist([]));
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSubmittedUrl('');

    try {
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl, { method: 'HEAD' }); // quick check
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Proxy error ${res.status}`);
      }
      setSubmittedUrl(url);
    } catch (err) {
      setError(err.message || 'Failed to load image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Runtime Image Whitelist Demo (Proxy Route)</h1>
      <p>Allowed domains: <strong>{whitelist.join(', ') || '(none)'}</strong></p>

      <form onSubmit={onSubmit}>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ width: '100%', maxWidth: 600, padding: 8 }}
          required
        />
        <button type="submit" style={{ marginTop: 12 }} disabled={loading}>
          {loading ? 'Checking...' : 'Load image'}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: 16, color: 'red', fontWeight: 'bold' }}>
          ❌ {error}
        </div>
      )}

      {submittedUrl && !error && (
        <div style={{ marginTop: 24 }}>
          <h2>Preview</h2>
          <img
            src={`/api/image-proxy?url=${encodeURIComponent(submittedUrl)}`}
            alt="Preview"
            width={320}
            style={{ border: '1px solid #ccc', padding: 8 }}
          />
        </div>
      )}
    </div>
  );
}