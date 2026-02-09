import Anthropic from '@anthropic-ai/sdk';

const OCR_PROMPT = `이미지에서 한국어 단어 학습표를 OCR 추출하여 JSON 배열로 반환하라.

# 표 구조 인식
- 첫 번째 열: 세트 번호 (빨간색 또는 굵은 숫자, 예: 22, 23)
- 두 번째 열: 단어 (한자, 한글, 또는 한자+한글 조합)
- 세 번째 열: 뜻·예시·유의어·반의어 등 부가 정보

# 세트 번호 규칙 (매우 중요!)
- 번호가 표시된 행부터 다음 번호가 나올 때까지 모든 행은 같은 번호
- 번호 칸이 비어있으면 직전 번호를 그대로 사용
- 번호가 없는 경우 절대 빈 문자열("")로 두지 말 것

# meaning 필드 포맷 (카드 UI 표시용, \\n으로 줄바꿈)
이미지에 보이는 모든 정보를 아래 순서로 정리:
1행: 핵심 뜻 (간결하게)
2행~: 부가 정보를 태그와 함께 표기

태그 규칙:
- 유의어 → [유] 단어1, 단어2
- 반의어 → [반] 단어1, 단어2
- 예문 → [예] 예문 내용 -출처
- 참고 → [참] 참고 내용
- 원형(○) 또는 사각 테두리 안의 글자 → 태그로 변환: ○유 → [유], ○예 → [예], ○반 → [반], ○참 → [참]

# 출력 형식
JSON 배열. 각 객체: {"number": "세트번호", "word": "단어", "meaning": "포맷된 뜻"}

예시 입력:
┌────┬──────────┬─────────────────────────────────┐
│ 22 │ 可否     │ 옳고 그름                       │
│    │          │ ○유  가부간                       │
├────┼──────────┼─────────────────────────────────┤
│    │ 가늠하다 │ 어림잡아 헤아리다               │
│    │          │ ○예  거리를 가늠하다              │
├────┼──────────┼─────────────────────────────────┤
│ 23 │ 간곡하다 │ 마음이 정성스럽고 절실하다      │
│    │          │ ○유  간절하다 ○반  냉담하다        │
│    │          │ ○예  간곡한 부탁 - 김유정, '봄봄' │
└────┴──────────┴─────────────────────────────────┘

예시 출력:
[
  {"number":"22","word":"可否","meaning":"옳고 그름\\n[유] 가부간"},
  {"number":"22","word":"가늠하다","meaning":"어림잡아 헤아리다\\n[예] 거리를 가늠하다"},
  {"number":"23","word":"간곡하다","meaning":"마음이 정성스럽고 절실하다\\n[유] 간절하다\\n[반] 냉담하다\\n[예] 간곡한 부탁 -김유정, '봄봄'"}
]

# 주의사항
- 이미지의 텍스트를 있는 그대로 추출 (임의 수정·의역 금지)
- 한자가 있으면 한자 그대로 유지
- 뜻 영역의 모든 줄(유의어, 반의어, 예문 등)을 빠짐없이 포함
- meaning 안의 줄바꿈은 반드시 리터럴 \\n 문자열로 표기
- JSON만 출력. 설명이나 마크다운 코드블록 없이 순수 JSON 배열만 반환`;

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
              text: OCR_PROMPT,
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
