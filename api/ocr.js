import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;

    if (!image || !image.data) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Anthropic API 클라이언트
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Claude API 호출
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: image.media_type,
                data: image.data,
              },
            },
            {
              type: 'text',
              text: `이 이미지에서 단어 표의 내용을 있는 그대로 추출하세요.

**표 구조:**
- 첫 번째 열: 번호 (22, 23 등) → 이것이 세트 번호
- 두 번째 열: 단어
- 세 번째 열: 뜻

**추출 규칙:**
1. 표의 각 행을 하나의 단어로 추출
2. 번호는 세트를 구분하는 기준
3. 단어와 뜻은 있는 그대로 추출 (텍스트 그대로)
4. 뜻이 여러 줄이면 모두 포함 (줄바꿈은 \\n)

**특수문자 처리:**
- ㉮, ㉯, ㉰ → (ㄱ), (ㄴ), (ㄷ)
- ㉠, ㉡, ㉢ → [ㄱ], [ㄴ], [ㄷ]
- ①, ②, ③ → (1), (2), (3)
- 기타 특수문자 → [한글]

**출력 형식:**
JSON 배열로 반환하세요.

예시 이미지:
┌────┬──────────┬────────────────────┐
│ 22 │ 可否     │ 옳고 그름          │
├────┼──────────┼────────────────────┤
│ 22 │ 가깝다   │ 거리나 시간이 짧다 │
├────┼──────────┼────────────────────┤
│ 22 │ 가늠하다 │ 어림잡아 헤아리다  │
├────┼──────────┼────────────────────┤
│ 23 │ 간곡하다 │ 정성스럽고 절실하다│
└────┴──────────┴────────────────────┘

올바른 출력:
[
  {"number": "22", "word": "可否", "meaning": "옳고 그름"},
  {"number": "22", "word": "가깝다", "meaning": "거리나 시간이 짧다"},
  {"number": "22", "word": "가늠하다", "meaning": "어림잡아 헤아리다"},
  {"number": "23", "word": "간곡하다", "meaning": "정성스럽고 절실하다"}
]

중요:
- 각 행 = 각 JSON 객체
- 번호는 세트 구분용
- 단어/뜻은 있는 그대로 추출

JSON만 출력하세요.`,
            },
          ],
        },
      ],
    });

    // 응답 파싱
    const responseText = message.content[0].text.trim();
    console.log('Claude 응답:', responseText);

    let words;
    try {
      // JSON 추출
      let jsonText = responseText;

      // 마크다운 코드 블록 제거
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
      if (!Array.isArray(words)) {
        throw new Error('배열이 아님');
      }

      // 필터링 및 정리
      words = words.filter(item =>
        item &&
        typeof item === 'object' &&
        item.word &&
        item.meaning
      ).map(item => ({
        number: item.number || '',
        word: item.word.trim(),
        meaning: item.meaning.trim()
      }));

    } catch (parseError) {
      console.error('파싱 오류:', parseError);
      words = [];
    }

    return res.status(200).json({ words });

  } catch (error) {
    console.error('OCR 오류:', error);
    return res.status(500).json({
      error: 'OCR 처리 실패',
      details: error.message
    });
  }
}
