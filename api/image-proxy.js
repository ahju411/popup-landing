module.exports = async function handler(req, res) {
  const imageUrl = req.query.url;

  if (!imageUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const decoded = decodeURIComponent(imageUrl);

    // Notion S3 URL만 허용 (보안)
    const allowed = [
      'https://prod-files-secure.s3.us-west-2.amazonaws.com',
      'https://s3.us-west-2.amazonaws.com'
    ];
    const isAllowed = allowed.some(prefix => decoded.startsWith(prefix));

    if (!isAllowed) {
      return res.status(403).json({ error: 'URL not allowed' });
    }

    const response = await fetch(decoded);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch image' });
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Image proxy error:', error.message);
    return res.status(500).json({ error: 'Proxy failed' });
  }
};
