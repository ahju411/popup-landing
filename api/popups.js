const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

module.exports = async function handler(req, res) {
  // CORS 허용
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!databaseId) {
      return res.status(500).json({ error: 'Database ID not configured' });
    }

    // Notion DB 쿼리: IsActive가 true인 항목
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        and: [
          {
            property: 'IsActive',
            checkbox: {
              equals: true
            }
          }
        ]
      },
      sorts: [
        {
          property: 'Priority',
          direction: 'descending'
        }
      ]
    });

    // 날짜 범위 필터링 (서버 사이드)
    const now_date = new Date();
    const popups = response.results
      .filter(page => {
        const props = page.properties;

        // StartDate 체크
        const startDate = props.StartDate?.date?.start;
        if (startDate && new Date(startDate) > now_date) return false;

        // EndDate 체크
        const endDate = props.EndDate?.date?.start;
        if (endDate && new Date(endDate) < now_date) return false;

        return true;
      })
      .map(page => {
        const props = page.properties;

        // 이미지 URL 결정: Image(files) 우선, ImageURL(url) fallback
        let imageUrl = null;
        if (props.Image && props.Image.files && props.Image.files.length > 0) {
          const file = props.Image.files[0];
          if (file.type === 'file') {
            // Notion 업로드 이미지 → 프록시 경로 사용
            imageUrl = '/api/image-proxy?url=' + encodeURIComponent(file.file.url);
          } else if (file.type === 'external') {
            imageUrl = file.external.url;
          }
        } else if (props.ImageURL && props.ImageURL.url) {
          imageUrl = props.ImageURL.url;
        }

        return {
          id: page.id,
          title: props.Title?.title?.[0]?.plain_text || '',
          content: props.Content?.rich_text?.[0]?.plain_text || '',
          imageUrl: imageUrl,
          linkUrl: props.LinkURL?.url || null,
          linkText: props.LinkText?.rich_text?.[0]?.plain_text || '자세히 보기',
          priority: props.Priority?.number || 0
        };
      });

    return res.status(200).json({ popups });
  } catch (error) {
    console.error('Notion API Error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch popups' });
  }
};
