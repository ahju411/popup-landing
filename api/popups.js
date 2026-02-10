const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    var databaseId = process.env.NOTION_DATABASE_ID;

    if (!databaseId) {
      return res.status(500).json({ error: 'Database ID not configured' });
    }

    var response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        and: [
          {
            property: 'IsActive',
            checkbox: { equals: true }
          }
        ]
      },
      sorts: [
        { property: 'Priority', direction: 'descending' }
      ]
    });

    var now_date = new Date();
    var popups = response.results
      .filter(function(page) {
        var props = page.properties;
        var startDate = props.StartDate && props.StartDate.date && props.StartDate.date.start;
        if (startDate && new Date(startDate) > now_date) return false;
        var endDate = props.EndDate && props.EndDate.date && props.EndDate.date.start;
        if (endDate && new Date(endDate) < now_date) return false;
        return true;
      })
      .map(function(page) {
        var props = page.properties;

        // 이미지: Image(files) 있으면 프록시, 없으면 ImageURL 직접 사용
        var imageUrl = null;
        var hasImageFile = props.Image && props.Image.files && props.Image.files.length > 0;

        if (hasImageFile) {
          var file = props.Image.files[0];
          if (file.type === 'external') {
            imageUrl = file.external.url;
          } else {
            // Notion 업로드 이미지 → pageId 기반 프록시
            imageUrl = '/api/image-proxy?pageId=' + page.id;
          }
        } else if (props.ImageURL && props.ImageURL.url) {
          imageUrl = props.ImageURL.url;
        }

        return {
          id: page.id,
          title: props.Title && props.Title.title && props.Title.title[0] ? props.Title.title[0].plain_text : '',
          content: props.Content && props.Content.rich_text && props.Content.rich_text[0] ? props.Content.rich_text[0].plain_text : '',
          imageUrl: imageUrl,
          linkUrl: props.LinkURL ? props.LinkURL.url : null,
          linkText: props.LinkText && props.LinkText.rich_text && props.LinkText.rich_text[0] ? props.LinkText.rich_text[0].plain_text : '자세히 보기',
          priority: props.Priority ? props.Priority.number : 0
        };
      });

    return res.status(200).json({ popups: popups });
  } catch (error) {
    console.error('Notion API Error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch popups' });
  }
};
