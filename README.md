# 📚 언어영역 단어 암기장

고등학생을 위한 언어영역 단어 암기 웹앱입니다. iPhone에서 사진으로 단어를 추가하고, 클래스카드 스타일로 학습할 수 있습니다.

## ✨ 주요 기능

- 📷 **사진으로 단어 추가**: 단어장 사진을 찍으면 자동으로 OCR 처리
- 📝 **수동 편집**: OCR 결과를 확인하고 수정 가능
- 🎴 **카드 학습**: 클래스카드 스타일의 카드 뒤집기 학습
- ✅ **암기 체크**: 암기한 단어 표시 및 진행률 관리
- 📊 **세트별 관리**: 여러 단어 세트를 만들고 개별 학습
- 🔀 **랜덤 모드**: 단어 순서 섞기
- 💾 **자동 저장**: 학습 진도가 자동으로 저장됨
- 📱 **PWA 지원**: iPhone 홈화면에 추가하여 앱처럼 사용

## 🚀 GitHub Pages로 배포하기

### 1. GitHub 저장소 만들기

1. [GitHub](https://github.com)에 로그인
2. 우측 상단 `+` 버튼 → `New repository` 클릭
3. Repository name: `vocabulary-app` (원하는 이름)
4. Public 선택
5. `Create repository` 클릭

### 2. 코드 업로드

#### 방법 A: GitHub 웹에서 직접 업로드

1. 저장소 페이지에서 `uploading an existing file` 클릭
2. 이 폴더의 모든 파일을 드래그앤드롭
3. `Commit changes` 클릭

#### 방법 B: Git 사용 (터미널)

```bash
cd vocabulary-app
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/vocabulary-app.git
git push -u origin main
```

### 3. GitHub Pages 활성화

1. 저장소의 `Settings` 탭 클릭
2. 왼쪽 메뉴에서 `Pages` 클릭
3. Source: `Deploy from a branch` 선택
4. Branch: `main` 선택, 폴더: `/ (root)` 선택
5. `Save` 클릭
6. 몇 분 후 `https://YOUR_USERNAME.github.io/vocabulary-app/` 에서 접속 가능

## 📱 iPhone 홈화면에 추가하기

1. Safari에서 웹앱 접속
2. 하단 공유 버튼 (상자에 화살표) 탭
3. "홈 화면에 추가" 선택
4. 이름 확인 후 "추가" 탭
5. 홈화면에서 앱처럼 사용 가능!

## 📖 사용 방법

### 단어 세트 추가

1. 메인 화면에서 "📷 사진으로 단어 추가" 버튼 클릭
2. 단어장 사진 촬영 또는 선택
3. OCR이 자동으로 단어 추출 (10-30초 소요)
4. 추출된 단어 확인 및 수정
5. 세트 이름 입력 (예: "2025년 1월")
6. "💾 저장하기" 클릭

### 학습하기

1. 메인 화면에서 학습할 세트 선택
2. 카드를 클릭하거나 좌우 스와이프로 넘기기
3. 카드 탭으로 뒤집기 (단어 ↔ 뜻)
4. "암기했어요" 또는 "모르겠어요" 버튼으로 체크
5. 🔀 버튼으로 순서 섞기 가능
6. "암기한 단어 숨기기" 체크박스로 필터링

## 🛠️ 기술 스택

- **Frontend**: 순수 HTML/CSS/JavaScript (프레임워크 없음)
- **OCR**: Tesseract.js (한글 + 한자 지원)
- **Storage**: LocalStorage (브라우저 내장)
- **Hosting**: GitHub Pages (완전 무료)
- **PWA**: Web App Manifest

## 📝 파일 구조

```
vocabulary-app/
├── index.html          # 메인 HTML
├── style.css           # 스타일시트
├── app.js              # 앱 로직
├── manifest.json       # PWA 설정
├── icon-192.png        # 앱 아이콘 (생성 필요)
├── icon-512.png        # 앱 아이콘 (생성 필요)
└── README.md           # 이 파일
```

## 🎨 아이콘 만들기 (선택사항)

아이콘이 없어도 앱은 정상 작동하지만, 더 나은 경험을 위해 추가할 수 있습니다:

1. [Canva](https://www.canva.com) 등에서 192x192, 512x512 PNG 이미지 생성
2. 파일명: `icon-192.png`, `icon-512.png`
3. 저장소에 업로드

## 💡 팁

- **OCR 정확도 높이기**: 사진을 선명하게 찍고, 조명이 밝은 곳에서 촬영
- **단어 추가**: OCR 결과를 확인하고 수정 후 "+ 단어 추가" 버튼으로 추가 가능
- **데이터 백업**: 브라우저 데이터를 지우면 단어가 삭제될 수 있음 (추후 백업 기능 추가 예정)
- **오프라인 사용**: 한 번 접속하면 오프라인에서도 학습 가능

## 🐛 문제 해결

### OCR이 단어를 제대로 인식하지 못해요
- 사진을 더 선명하게 찍어보세요
- 추출 후 수동으로 수정할 수 있습니다
- "+" 버튼으로 단어를 직접 추가할 수도 있습니다

### 앱이 느려요
- 브라우저 캐시를 지워보세요
- 단어 세트가 너무 많으면 삭제를 고려해보세요

### 데이터가 사라졌어요
- 브라우저 데이터가 지워지면 단어도 삭제됩니다
- Safari의 "사이트 데이터 지우기"를 하지 마세요

## 📄 라이선스

MIT License - 자유롭게 사용하세요!

## 🙏 피드백

개선 아이디어나 버그 발견 시 GitHub Issues로 알려주세요!
