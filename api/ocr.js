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
- 각 줄에 번호가 있을 수 있습니다 (예: 22, 23)
- 왼쪽: 단어 (한자, 한글, 영어 등)
- 오른쪽: 뜻 (한국어 설명, 여러 줄일 수 있음)

**특수문자 처리 규칙:**
- 원문자 (㉮, ㉯ 등): (ㄱ), (ㄴ) 형식으로 변환
- 네모문자 (㉠, ㉡ 등): [ㄱ], [ㄴ] 형식으로 변환
- 원숫자 (①, ② 등): (1), (2) 형식으로 변환
- 기타 특수 한글문자 (㈀, ㈁, ㉮ 등): [ㄱ], [ㄴ] 형식으로 변환
- 특수문자로 표기할 수 없는 경우 모두 [한글] 형식으로 변환

**추출 규칙:**
1. 이미지에 있는 모든 단어를 빠짐없이 추출
2. 번호가 있으면 번호도 함께 추출
3. 뜻이 여러 줄이면 모두 포함 (줄바꿈은 \\n으로)
4. 단어와 뜻을 정확히 구분
5. 특수문자는 위 규칙에 따라 변환

**출력 형식:**
반드시 아래 형식의 JSON 배열만 반환하세요.

[
  {"number": "22", "word": "可否", "meaning": "옳고 그름\\n[ㄱ] 좋고 나쁨\\n[ㄴ] 가능 여부"},
  {"number": "23", "word": "comfortable", "meaning": "편안한"}
]

- number: 번호가 없으면 빈 문자열 ""
- meaning: 뜻 전체를 하나의 문자열로, 줄바꿈은 \\n 사용

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
      
      // 각 항목 검증 및 정리
      words = words.filter(item => 
        item && 
        typeof item === 'object' && 
        item.word && 
        item.meaning &&
        item.word.trim() !== '' &&
        item.meaning.trim() !== ''
      ).map(item => ({
        number: item.number || '',
        word: item.word.trim(),
        meaning: item.meaning.trim()
      }));
      
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
