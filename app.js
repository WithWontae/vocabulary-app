// 전역 상태 관리
const AppState = {
    wordSets: [],
    currentSet: null,
    currentCardIndex: 0,
    isFlipped: false,
    hideKnown: false,
    shuffled: false
};

// 로컬스토리지 키
const STORAGE_KEY = 'vocabularyAppData';

// 화면 전환
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// 데이터 저장
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState.wordSets));
}

// 데이터 불러오기
function loadData() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        AppState.wordSets = JSON.parse(data);
    }
    renderWordSets();
}

// 단어 세트 목록 렌더링
function renderWordSets() {
    const container = document.getElementById('wordSetsList');
    const studyAllBtn = document.getElementById('studyAllBtn');
    
    if (AppState.wordSets.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px 20px;">아직 추가된 단어 세트가 없습니다.<br>사진을 찍어 단어를 추가해보세요!</p>';
        studyAllBtn.style.display = 'none';
        return;
    }
    
    studyAllBtn.style.display = 'block';
    
    container.innerHTML = AppState.wordSets.map((set, index) => {
        const knownCount = set.words.filter(w => w.known).length;
        const totalCount = set.words.length;
        const percent = totalCount > 0 ? Math.round((knownCount / totalCount) * 100) : 0;
        
        return `
            <div class="word-set-card" data-index="${index}">
                <div class="word-set-header">
                    <div class="word-set-title">${set.name}</div>
                    <div class="word-set-count">${totalCount}개 단어</div>
                </div>
                <div class="word-set-progress">
                    <div class="mini-progress-bar">
                        <div class="mini-progress-fill" style="width: ${percent}%"></div>
                    </div>
                    <div class="progress-percent">${percent}%</div>
                </div>
                <button class="delete-btn" data-index="${index}" onclick="event.stopPropagation(); deleteWordSet(${index})">삭제</button>
            </div>
        `;
    }).join('');
    
    // 카드 클릭 이벤트
    document.querySelectorAll('.word-set-card').forEach(card => {
        card.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            startStudy(index);
        });
    });
}

// 단어 세트 삭제
function deleteWordSet(index) {
    if (confirm('이 단어 세트를 삭제하시겠습니까?')) {
        AppState.wordSets.splice(index, 1);
        saveData();
        renderWordSets();
    }
}

// OCR 화면으로 이동
document.getElementById('addSetBtn').addEventListener('click', () => {
    showScreen('ocrScreen');
    document.getElementById('ocrResult').style.display = 'none';
    document.getElementById('imagePreview').innerHTML = '';
});

// 뒤로 가기
document.getElementById('ocrBackBtn').addEventListener('click', () => {
    showScreen('menuScreen');
});

document.getElementById('studyBackBtn').addEventListener('click', () => {
    showScreen('menuScreen');
    renderWordSets();
});

// 이미지 업로드
document.getElementById('uploadBtn').addEventListener('click', () => {
    document.getElementById('imageInput').click();
});

document.getElementById('imageInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // 이미지 미리보기
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('imagePreview').appendChild(img);
    };
    reader.readAsDataURL(file);
    
    // OCR 처리
    await processOCR(file);
});

// OCR 처리
async function processOCR(file) {
    const progressDiv = document.getElementById('ocrProgress');
    const resultDiv = document.getElementById('ocrResult');
    
    progressDiv.style.display = 'block';
    resultDiv.style.display = 'none';
    
    try {
        // 파일을 Base64로 변환
        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // data:image/jpeg;base64, 부분 제거
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        // Claude API 호출
        const response = await fetch('/api/ocr', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: {
                    data: base64Data,
                    media_type: file.type
                }
            })
        });

        if (!response.ok) {
            throw new Error('OCR 처리 실패');
        }

        const result = await response.json();
        const words = result.words || [];
        
        progressDiv.style.display = 'none';
        resultDiv.style.display = 'block';
        
        // 추출된 단어 표시
        renderWordInputs(words.length > 0 ? words : [{ word: '', meaning: '' }]);
        
    } catch (error) {
        console.error('OCR 오류:', error);
        alert('텍스트 추출에 실패했습니다. 다시 시도해주세요.');
        progressDiv.style.display = 'none';
        
        // 실패 시 빈 입력 필드 표시
        resultDiv.style.display = 'block';
        renderWordInputs([{ word: '', meaning: '' }]);
    }
}

// 단어 입력 필드 렌더링
function renderWordInputs(words) {
    const container = document.getElementById('wordsList');
    
    container.innerHTML = words.map((word, index) => `
        <div class="word-item" data-index="${index}">
            <input type="text" placeholder="단어" value="${word.word}" class="word-input">
            <input type="text" placeholder="뜻" value="${word.meaning}" class="meaning-input">
            <button class="remove-word-btn" onclick="removeWordInput(${index})">×</button>
        </div>
    `).join('');
}

// 단어 추가
document.getElementById('addMoreWordBtn').addEventListener('click', () => {
    const container = document.getElementById('wordsList');
    const index = container.children.length;
    
    const div = document.createElement('div');
    div.className = 'word-item';
    div.dataset.index = index;
    div.innerHTML = `
        <input type="text" placeholder="단어" class="word-input">
        <input type="text" placeholder="뜻" class="meaning-input">
        <button class="remove-word-btn" onclick="removeWordInput(${index})">×</button>
    `;
    container.appendChild(div);
});

// 단어 입력 제거
function removeWordInput(index) {
    const items = document.querySelectorAll('.word-item');
    if (items.length > 1) {
        items[index].remove();
    }
}

// 단어 세트 저장
document.getElementById('saveSetBtn').addEventListener('click', () => {
    const setName = document.getElementById('setNameInput').value.trim();
    
    if (!setName) {
        alert('세트 이름을 입력해주세요.');
        return;
    }
    
    const wordItems = document.querySelectorAll('.word-item');
    const words = [];
    
    wordItems.forEach(item => {
        const word = item.querySelector('.word-input').value.trim();
        const meaning = item.querySelector('.meaning-input').value.trim();
        
        if (word && meaning) {
            words.push({ 
                word, 
                meaning, 
                known: false 
            });
        }
    });
    
    if (words.length === 0) {
        alert('최소 1개 이상의 단어를 입력해주세요.');
        return;
    }
    
    // 새 세트 추가
    AppState.wordSets.push({
        name: setName,
        words: words,
        createdAt: new Date().toISOString()
    });
    
    saveData();
    
    // 초기화 및 메뉴로 이동
    document.getElementById('setNameInput').value = '';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('ocrResult').style.display = 'none';
    
    showScreen('menuScreen');
    renderWordSets();
    
    alert(`"${setName}" 세트가 추가되었습니다! (${words.length}개 단어)`);
});

// 전체 학습 시작
document.getElementById('studyAllBtn').addEventListener('click', () => {
    // 모든 단어 합치기
    const allWords = [];
    AppState.wordSets.forEach(set => {
        set.words.forEach(word => {
            allWords.push({
                ...word,
                setName: set.name
            });
        });
    });
    
    if (allWords.length === 0) {
        alert('학습할 단어가 없습니다.');
        return;
    }
    
    AppState.currentSet = {
        name: '전체 단어',
        words: allWords
    };
    
    startStudySession();
});

// 개별 세트 학습 시작
function startStudy(index) {
    AppState.currentSet = AppState.wordSets[index];
    startStudySession();
}

// 학습 세션 시작
function startStudySession() {
    AppState.currentCardIndex = 0;
    AppState.isFlipped = false;
    AppState.shuffled = false;
    AppState.hideKnown = false;
    
    showScreen('studyScreen');
    updateStudyScreen();
}

// 학습 화면 업데이트
function updateStudyScreen() {
    const set = AppState.currentSet;
    let words = set.words;
    
    // 암기한 단어 필터링
    if (AppState.hideKnown) {
        words = words.filter(w => !w.known);
    }
    
    if (words.length === 0) {
        alert('모든 단어를 암기했습니다! 🎉');
        showScreen('menuScreen');
        return;
    }
    
    // 인덱스 범위 체크
    if (AppState.currentCardIndex >= words.length) {
        AppState.currentCardIndex = 0;
    }
    
    const currentWord = words[AppState.currentCardIndex];
    
    // 헤더 업데이트
    document.getElementById('progressText').textContent = `${AppState.currentCardIndex + 1}/${words.length}`;
    
    // 암기 카운터 업데이트
    const knownCount = set.words.filter(w => w.known).length;
    document.getElementById('knownCount').textContent = knownCount;
    document.getElementById('totalCount').textContent = set.words.length;
    
    // 카드 내용
    document.getElementById('cardFront').textContent = currentWord.word;
    document.getElementById('cardBack').textContent = currentWord.meaning;
    
    // 푸터 정보
    document.getElementById('currentSetName').textContent = set.name;
    
    // 카드 뒤집기 초기화
    const card = document.getElementById('flashCard');
    card.classList.remove('flipped');
    AppState.isFlipped = false;
}

// 카드 뒤집기
function flipCard() {
    const card = document.getElementById('flashCard');
    card.classList.toggle('flipped');
    AppState.isFlipped = !AppState.isFlipped;
}

document.getElementById('flashCard').addEventListener('click', flipCard);

// 헤더 이전/다음 버튼
document.getElementById('headerPrevBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('prevBtn')?.click() || prevCard();
});

document.getElementById('headerNextBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('nextBtn')?.click() || nextCard();
});

// 아는카드 버튼
document.getElementById('knowCardBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const currentWord = getCurrentWord();
    if (currentWord) {
        currentWord.known = true;
        saveData();
    }
    goToNextCard();
});

// 이전 카드 함수
function prevCard() {
    let words = AppState.currentSet.words;
    if (AppState.hideKnown) {
        words = words.filter(w => !w.known);
    }
    
    AppState.currentCardIndex--;
    if (AppState.currentCardIndex < 0) {
        AppState.currentCardIndex = words.length - 1;
    }
    updateStudyScreen();
}

// 다음 카드 함수
function nextCard() {
    let words = AppState.currentSet.words;
    if (AppState.hideKnown) {
        words = words.filter(w => !w.known);
    }
    
    AppState.currentCardIndex++;
    if (AppState.currentCardIndex >= words.length) {
        AppState.currentCardIndex = 0;
    }
    updateStudyScreen();
}

// 현재 단어 가져오기
function getCurrentWord() {
    let words = AppState.currentSet.words;
    if (AppState.hideKnown) {
        words = words.filter(w => !w.known);
    }
    return words[AppState.currentCardIndex];
}

// 다음 카드로 이동
function goToNextCard() {
    let words = AppState.currentSet.words;
    if (AppState.hideKnown) {
        words = words.filter(w => !w.known);
    }
    
    AppState.currentCardIndex++;
    if (AppState.currentCardIndex >= words.length) {
        AppState.currentCardIndex = 0;
    }
    updateStudyScreen();
}

// 키보드 단축키
document.addEventListener('keydown', (e) => {
    if (document.getElementById('studyScreen').classList.contains('active')) {
        if (e.key === 'ArrowLeft') {
            prevCard();
        } else if (e.key === 'ArrowRight') {
            nextCard();
        } else if (e.key === ' ') {
            e.preventDefault();
            flipCard();
        }
    }
});

// 스와이프 제스처 (모바일)
let touchStartX = 0;
let touchEndX = 0;

document.getElementById('flashCard').addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
});

document.getElementById('flashCard').addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // 왼쪽 스와이프 - 다음
            nextCard();
        } else {
            // 오른쪽 스와이프 - 이전
            prevCard();
        }
    }
}

// 앱 초기화
window.addEventListener('DOMContentLoaded', () => {
    loadData();
});
