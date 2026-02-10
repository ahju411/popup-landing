const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  var pageId = req.query.pageId;
  if (!pageId) {
    return res.status(400).json({ error: 'Missing pageId parameter' });
  }

  try {
    // Notion에서 페이지 정보 가져오기 (항상 신선한 URL)
    var page = await notion.pages.retrieve({ page_id: pageId });
    var props = page.properties;

    // Image (files) 속성에서 URL 추출
    var imageUrl = null;
    if (props.Image && props.Image.files && props.Image.files.length > 0) {
      var file = props.Image.files[0];
      if (file.type === 'file') {
        imageUrl = file.file.url;
      } else if (file.type === 'external') {
        imageUrl = file.external.url;
      }
    }

    // Image 없으면 ImageURL fallback
    if (!imageUrl && props.ImageURL && props.ImageURL.url) {
      imageUrl = props.ImageURL.url;
    }

    if (!imageUrl) {
      return res.status(404).json({ error: 'No image found' });
    }

    // 이미지 fetch 및 프록시
    var response = await fetch(imageUrl);
    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to fetch image' });
    }

    var contentType = response.headers.get('content-type') || 'image/png';
    var buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Image proxy error:', error.message);
    return res.status(500).json({ error: 'Proxy failed' });
  }
};
