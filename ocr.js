import Anthropic from '@anthropic-ai/sdk';

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // CORS 헤더 설정
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Preflight 요청 처리
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { image } = await request.json();

    if (!image) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    return new Response(JSON.stringify({ words }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('OCR 오류:', error);
    return new Response(
      JSON.stringify({ 
        error: 'OCR 처리 중 오류가 발생했습니다.',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
