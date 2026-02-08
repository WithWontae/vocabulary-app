import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Claude API 초기화
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // 이미지에서 단어 추출
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: image.media_type || 'image/jpeg',
                data: image.data,
              },
            },
            {
              type: 'text',
              text: `이 이미지에서 한국어 단어와 뜻을 추출해주세요.

형식은 다음과 같습니다:
- 왼쪽: 단어 (한자 또는 한글)
- 오른쪽: 뜻

JSON 배열로 반환해주세요:
[
  {"word": "可否", "meaning": "옳고 그름, 좋고 나쁨"},
  {"word": "comfortable", "meaning": "편안한"}
]

JSON만 반환하고 다른 설명은 하지 마세요.`,
            },
          ],
        },
      ],
    });

    // Claude 응답에서 텍스트 추출
    const responseText = message.content[0].text;
    
    // JSON 파싱
    let words;
    try {
      // JSON 코드 블록 제거
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        words = JSON.parse(jsonMatch[0]);
      } else {
        words = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      words = [];
    }

    return res.status(200).json({ words });

  } catch (error) {
    console.error('OCR 오류:', error);
    return res.status(500).json({ 
      error: 'OCR 처리 중 오류가 발생했습니다.',
      details: error.message 
    });
  }
}
