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
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
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
              text: `이 이미지에서 한국어 단어와 그 뜻을 추출해주세요.

**이미지 형식:**
- 각 줄에 2개씩 단어가 있습니다
- 왼쪽: 단어 (한자, 한글, 영어 등)
- 오른쪽: 뜻 (한국어 설명)

**추출 규칙:**
1. 이미지에 있는 모든 단어를 빠짐없이 추출
2. 단어와 뜻을 정확히 구분
3. 오타나 인식 오류 최소화
4. 단어가 명확하지 않으면 최선을 다해 추론

**출력 형식:**
반드시 아래 형식의 JSON 배열만 반환하세요. 다른 설명이나 주석은 절대 포함하지 마세요.

[
  {"word": "可否", "meaning": "옳고 그름, 좋고 나쁨"},
  {"word": "comfortable", "meaning": "편안한"}
]

JSON만 출력하세요.`,
            },
          ],
        },
      ],
    });

    // Claude 응답에서 텍스트 추출
    const responseText = message.content[0].text.trim();
    
    console.log('Claude 응답:', responseText);
    
    // JSON 파싱
    let words;
    try {
      // Markdown 코드 블록 제거
      let jsonText = responseText;
      
      // ```json ... ``` 형식 제거
      if (jsonText.includes('```')) {
        const match = jsonText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
        if (match) {
          jsonText = match[1];
        }
      }
      
      // [ ... ] 추출
      const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        jsonText = arrayMatch[0];
      }
      
      words = JSON.parse(jsonText);
      
      // 유효성 검사
      if (!Array.isArray(words) || words.length === 0) {
        throw new Error('빈 배열');
      }
      
      // 각 항목 검증
      words = words.filter(item => 
        item && 
        typeof item === 'object' && 
        item.word && 
        item.meaning &&
        item.word.trim() !== '' &&
        item.meaning.trim() !== ''
      );
      
      if (words.length === 0) {
        throw new Error('유효한 단어 없음');
      }
      
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      console.error('원본 응답:', responseText);
      
      // 파싱 실패 시 빈 배열 반환
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
