# 📚 국어 단어암기

고등학생을 위한 국어 단어 암기 웹앱입니다. iPhone에서 사진으로 단어를 추가하고, 클래스카드 스타일로 학습할 수 있습니다.

## ✨ 주요 기능

- 📷 **AI OCR**: Claude API로 사진에서 단어 자동 추출 (정확도 95%+)
- 📝 **수동 편집**: OCR 결과를 확인하고 수정 가능
- 🎴 **카드 학습**: 클래스카드 스타일의 카드 뒤집기 학습
- ✅ **암기 체크**: 암기한 단어 표시 및 진행률 관리
- 📊 **세트별 관리**: 여러 단어 세트를 만들고 개별 학습
- 💾 **자동 저장**: 학습 진도가 자동으로 저장됨
- 📱 **PWA 지원**: iPhone 홈화면에 추가하여 앱처럼 사용

## 🚀 배포하기

**자세한 배포 가이드는 [DEPLOY.md](DEPLOY.md)를 참고하세요!**

### 빠른 시작

1. **Anthropic API Key 발급**: https://console.anthropic.com
2. **Vercel 계정 생성**: https://vercel.com (GitHub 연동)
3. **GitHub에 코드 업로드**
4. **Vercel에서 Import** → 환경변수에 API Key 추가
5. **배포 완료!**

## 📱 iPhone 홈화면에 추가하기

1. Safari에서 배포된 URL 접속
2. 하단 공유 버튼 탭
3. "홈 화면에 추가" 선택
4. 홈화면에서 앱처럼 사용!

## 📖 사용 방법

### 단어 세트 추가

1. "📷 사진으로 단어 추가" 버튼 클릭
2. 단어장 사진 촬영 또는 선택
3. AI가 자동으로 단어 추출 (5-10초)
4. 추출된 단어 확인 및 수정
5. 세트 이름 입력
6. "💾 저장하기" 클릭

### 학습하기

1. 학습할 세트 선택
2. 카드 탭으로 뒤집기
3. 좌우 스와이프로 넘기기
4. "아는카드" 버튼으로 암기 완료 체크

## 🛠️ 기술 스택

- **Frontend**: HTML/CSS/JavaScript
- **OCR**: Claude 3.5 Sonnet (Anthropic API)
- **Backend**: Vercel Serverless Functions
- **Storage**: LocalStorage
- **Hosting**: Vercel

## 💰 비용

- **Vercel 호스팅**: 무료
- **Claude API**: 
  - 무료 크레딧 $5 (약 5,000장 OCR)
  - 이후 이미지당 약 $0.001

## 📝 파일 구조

```
vocabulary-app/
├── index.html          # 메인 HTML
├── style.css           # 스타일시트
├── app.js              # 프론트엔드 로직
├── manifest.json       # PWA 설정
├── icon.svg            # 앱 아이콘
├── package.json        # 의존성 관리
├── vercel.json         # Vercel 설정
├── api/
│   └── ocr.js         # Claude API 서버리스 함수
├── DEPLOY.md          # 배포 가이드
└── README.md          # 이 파일
```

## 🔒 보안

- API Key는 Vercel 환경변수에 안전하게 저장
- GitHub에 노출되지 않음
- 클라이언트에서 직접 API 호출 안 함

## 📄 라이선스

MIT License - 자유롭게 사용하세요!

