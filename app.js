// 전역 상태
const AppState = {
    wordSets: [],
    currentSet: null,
    currentSetIndex: null,
    currentIndex: 0,
    currentIndex: 0,
    isInitialLoaded: false, // 데이터 로드 여부를 확인하는 플래그
    loopMode: false // 1회차 완료 후 반복 모드 진입 여부
};

// 초기화 로직
function initApp() {
    if (AppState.isInitialLoaded) return;
    loadData();
    showScreen('menuScreen');
    renderSetsList();
    console.log('App Initialized');
}

// 스크립트가 늦게 로드될 경우를 위한 처리
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initApp();
} else {
    document.addEventListener('DOMContentLoaded', initApp);
}

// 데이터 로드/저장
function loadData() {
    try {
        const saved = localStorage.getItem('vocabularyAppData');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                AppState.wordSets = parsed;
            }
        }
        AppState.isInitialLoaded = true;
    } catch (err) {
        console.error('데이터 로드 오류:', err);
        AppState.wordSets = [];
        AppState.isInitialLoaded = true;
    }
}

function saveData() {
    // 로드되지 않은 상태에서 빈 배열로 덮어쓰는 것 방지
    if (!AppState.isInitialLoaded) {
        console.warn('데이터가 로드되지 않은 상태에서는 저장할 수 없습니다.');
        return;
    }
    localStorage.setItem('vocabularyAppData', JSON.stringify(AppState.wordSets));
}

// 화면 전환
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// 세트 목록 렌더링
function renderSetsList() {
    const container = document.getElementById('setsList');

    if (AppState.wordSets.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;padding:40px;">아직 세트가 없습니다</p>';
        return;
    }

    container.innerHTML = AppState.wordSets.map((set, index) => {
        const known = set.words.filter(w => w.known).length;
        const total = set.words.length;
        const progress = total > 0 ? (known / total * 100) : 0;

        return `
            <div class="set-card" onclick="startStudy(${index})">
                <div class="set-card-header">
                    <div class="set-card-title">${set.name}</div>
                    <div class="set-card-count">${known}/${total}</div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="set-card-actions">
                    <button class="btn-action" onclick="exportSet(event, ${index})">📤 내보내기</button>
                    <button class="btn-action" onclick="triggerSetImport(event, ${index})">📥 가져오기</button>
                    <button class="btn-action btn-danger" onclick="deleteSet(event, ${index})">🗑️ 삭제</button>
                </div>
            </div>
        `;
    }).join('');
}

// 메인 화면 버튼
document.getElementById('addSetBtn').addEventListener('click', () => {
    showScreen('ocrScreen');
});

// OCR 화면
document.getElementById('ocrBackBtn').addEventListener('click', () => {
    console.log('OCR Back Clicked');
    resetOCR();
    showScreen('menuScreen');
});

document.getElementById('galleryBtn').addEventListener('click', () => {
    document.getElementById('galleryInput').click();
});

document.getElementById('cameraBtn').addEventListener('click', () => {
    document.getElementById('cameraInput').click();
});

// OCR 파일 선택 시 바로 시작하지 않고, 미리보기 & 추가 프롬프트 입력창 표시
let currentOcrFile = null;

document.getElementById('galleryInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    handleFileSelect(file);
});

document.getElementById('cameraInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    handleFileSelect(file);
});

async function handleFileSelect(file) {
    currentOcrFile = file;

    // UI 초기화
    document.getElementById('ocrResult').style.display = 'none';
    document.getElementById('ocrProgress').style.display = 'none';
    document.getElementById('customPromptInput').value = '';

    // 이미지 미리보기
    const previewContainer = document.getElementById('imagePreviewContainer');
    previewContainer.style.display = 'flex';
    previewContainer.innerHTML = ''; // 기존 내용 삭제

    const reader = new FileReader();
    reader.onload = (e) => {
        previewContainer.innerHTML = `<img src="${e.target.result}" alt="미리보기" style="max-width: 100%; border-radius: 8px;">`;
    };
    reader.readAsDataURL(file);

    // 프롬프트 입력창 표시
    document.getElementById('customPromptArea').style.display = 'block';
}

document.getElementById('startOcrBtn').addEventListener('click', async () => {
    if (!currentOcrFile) {
        alert('이미지를 먼저 선택해주세요.');
        return;
    }
    const customPrompt = document.getElementById('customPromptInput').value;
    await processOCR(currentOcrFile, customPrompt);
});

// OCR 처리
async function processOCR(file, additionalPrompt = '') {
    resetOCR(); // 시작 전 초기화 (이 함수는 기존 UI숨김 등을 포함하므로 주의 필요)

    // resetOCR이 숨겨버린 것들을 다시 조정
    // 진행 중 상태 표시
    const progressDiv = document.getElementById('ocrProgress');
    const resultDiv = document.getElementById('ocrResult');
    const customPromptArea = document.getElementById('customPromptArea');
    const progressText = document.getElementById('progressText');

    customPromptArea.style.display = 'none'; // 입력창 숨김
    progressDiv.style.display = 'block';
    resultDiv.style.display = 'none';
    progressText.textContent = '단어를 추출하는 중...';

    try {
        // HEIC → JPEG 변환
        let processedFile = file;
        if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic')) {
            const img = await createImageBitmap(file);
            const canvas = document.createElement('canvas');
            const maxSize = 2000;
            let width = img.width;
            let height = img.height;

            if (width > maxSize || height > maxSize) {
                if (width > height) {
                    height = (height / width) * maxSize;
                    width = maxSize;
                } else {
                    width = (width / height) * maxSize;
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
            processedFile = new File([blob], 'image.jpg', { type: 'image/jpeg' });
        }

        // Base64 변환
        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(processedFile);
        });

        // 이미지 미리보기 표시 (추출 진행 중에도 보이도록)
        const previewContainer = document.getElementById('imagePreviewContainer');
        previewContainer.style.display = 'flex';
        previewContainer.innerHTML = `<img src="data:image/jpeg;base64,${base64Data}" alt="원본 이미지 미리보기">`;

        // API 호출
        const response = await fetch('/api/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: {
                    data: base64Data,
                    media_type: processedFile.type || 'image/jpeg'
                },
                additionalPrompt: additionalPrompt
            })
        });

        if (!response.ok) {
            throw new Error('OCR 실패');
        }

        const result = await response.json();
        const words = result.words || [];

        progressDiv.style.display = 'none';
        resultDiv.style.display = 'block';

        // 번호별로 그룹핑
        const grouped = groupByNumber(words);
        renderSets(grouped);

        if (words.length === 0) {
            alert('추출할 수 없는 사진입니다.');
        }

    } catch (error) {
        console.error('OCR 오류:', error);
        alert('텍스트 추출에 실패했습니다\n' + error.message);
        progressDiv.style.display = 'none';
    }
}

// 번호별 그룹핑
function groupByNumber(words) {
    const groups = {};

    words.forEach(word => {
        const num = word.number || 'etc';
        if (!groups[num]) {
            groups[num] = [];
        }
        groups[num].push(word);
    });

    return Object.keys(groups).sort((a, b) => {
        if (a === 'etc') return 1;
        if (b === 'etc') return -1;
        return parseInt(a) - parseInt(b);
    }).map(num => ({
        number: num,
        name: num === 'etc' ? '기타' : num, // 숫자가 세트명으로 기본 입력
        words: groups[num]
    }));
}

// 세트 렌더링 — 편집 가능한 단어 리스트
function renderSets(sets) {
    const container = document.getElementById('setsContainer');

    container.innerHTML = sets.map((set, setIdx) => `
        <div class="word-set-card" data-set-index="${setIdx}">
            <div class="word-set-header">
                <h4>${set.name} (${set.words.length}개)</h4>
            </div>
            <input type="text"
                   class="set-name-input"
                   value="${set.name}"
                   data-index="${setIdx}"
                   placeholder="세트 이름">
            <div class="word-edit-list" data-set="${setIdx}">
                ${set.words.map((w, wIdx) => renderWordEditItem(setIdx, wIdx, w)).join('')}
            </div>
            <div class="btn-group">
                <button class="btn btn-primary" onclick="saveSet(${setIdx})">
                    💾 저장하고 학습 시작
                </button>
            </div>
        </div>
    `).join('');

    // 초기 높이 조절 (뜻 textarea만 대상)
    container.querySelectorAll('.word-edit-meaning').forEach(autoResizeTextarea);
}

function renderWordEditItem(setIdx, wIdx, w) {
    const escapedWord = (w.word || '').replace(/"/g, '&quot;');
    const meaningDisplay = (w.meaning || '').replace(/\\n/g, '\n').replace(/"/g, '&quot;');
    return `
        <div class="word-edit-item" data-set="${setIdx}" data-word="${wIdx}">
            <div class="word-edit-fields">
                <input type="text" class="word-edit-word" value="${escapedWord}" placeholder="단어">
                <textarea class="word-edit-meaning" rows="1" placeholder="뜻" oninput="autoResizeTextarea(this)">${meaningDisplay}</textarea>
            </div>
            <button class="btn-delete-word" onclick="deleteWordItem(this)" title="삭제">✕</button>
        </div>
    `;
}

function autoResizeTextarea(element) {
    element.style.height = 'auto';
    element.style.height = element.scrollHeight + 'px';
}

function deleteWordItem(btn) {
    const item = btn.closest('.word-edit-item');
    const list = item.closest('.word-edit-list');
    item.remove();
    // 헤더 카운트 업데이트
    const card = list.closest('.word-set-card');
    const count = list.querySelectorAll('.word-edit-item').length;
    card.querySelector('.word-set-header h4').textContent =
        card.querySelector('.set-name-input').value.trim() + ` (${count}개)`;
}

// 모든 세트 일괄 저장
function saveAllSets(autoStudy = false) {
    const cards = document.querySelectorAll('.word-set-card');
    let totalSaved = 0;
    const startIndex = AppState.wordSets.length;

    cards.forEach(card => {
        const nameInput = card.querySelector('.set-name-input');
        const name = nameInput.value.trim();
        if (!name) return;

        const items = card.querySelectorAll('.word-edit-item');
        const words = [];
        items.forEach(item => {
            const word = item.querySelector('.word-edit-word').value.trim();
            const meaning = item.querySelector('.word-edit-meaning').value.trim();
            if (word) {
                words.push({ word, meaning, known: false });
            }
        });

        if (words.length > 0) {
            AppState.wordSets.push({
                name: name,
                words: words,
                createdAt: Date.now()
            });
            totalSaved++;
        }
    });

    if (totalSaved > 0) {
        saveData();
        if (autoStudy) {
            startStudy(startIndex);
        } else {
            alert(`${totalSaved}개 세트가 저장되었습니다.`);
            resetOCR();
            showScreen('menuScreen');
            renderSetsList();
        }
    } else {
        alert('저장할 단어가 없습니다.');
    }
}

// 모든 세트 저장 후 첫 번째 세트 학습 시작
function saveAllSetsAndStudy() {
    saveAllSets(true);
}

// 개별 세트 저장 → 학습 시작
function saveSet(setIdx) {
    const card = document.querySelector(`.word-set-card[data-set-index="${setIdx}"]`);
    const nameInput = card.querySelector('.set-name-input');
    const name = nameInput.value.trim();

    if (!name) {
        alert('세트 이름을 입력하세요');
        return;
    }

    const items = card.querySelectorAll('.word-edit-item');
    const words = [];
    items.forEach(item => {
        const word = item.querySelector('.word-edit-word').value.trim();
        const meaning = item.querySelector('.word-edit-meaning').value.trim();
        if (word) {
            words.push({ word, meaning, known: false });
        }
    });

    if (words.length === 0) {
        alert('저장할 단어가 없습니다');
        return;
    }

    const newSetIndex = AppState.wordSets.length;
    AppState.wordSets.push({
        name: name,
        words: words,
        createdAt: Date.now()
    });

    saveData();
    alert('세트가 저장되었습니다.');

    resetOCR();
    showScreen('menuScreen');
    renderSetsList();

    // 개별 저장의 경우 바로 학습 화면으로
    startStudy(newSetIndex);
}

// 학습 시작
function startStudy(setIndex) {
    const set = AppState.wordSets[setIndex];

    // 완료된 세트인지 확인 & 리셋 로직
    if (set.words.length > 0 && set.words.every(w => w.known)) {
        if (confirm("처음부터 다시 학습하시겠습니까?")) {
            set.words.forEach(w => w.known = false);
            // 저장 (데이터 영구 반영)
            saveData();
        }
    }

    AppState.currentSet = set;
    AppState.currentSetIndex = setIndex;
    AppState.currentIndex = 0;
    AppState.loopMode = false; // 학습 시작 시 항상 1회차 모드(순서대로)

    document.getElementById('completionOverlay').style.display = 'none';
    showScreen('studyScreen');
    updateCard();
    renderMenu();
}

// 카드 업데이트
function updateCard() {
    const set = AppState.currentSet;
    const word = set.words[AppState.currentIndex];

    document.getElementById('studyProgressText').textContent = `${AppState.currentIndex + 1}/${set.words.length}`;
    document.getElementById('knownCount').textContent = set.words.filter(w => w.known).length;
    document.getElementById('totalCount').textContent = set.words.length;
    document.getElementById('setName').textContent = set.name;

    document.getElementById('cardWord').textContent = word.meaning;
    document.getElementById('cardMeaning').textContent = word.word;

    // 커버 & 상태 버튼 초기화
    const cover = document.getElementById('meaningCover');
    const statusBtn = document.getElementById('statusBtn');

    if (word.known) {
        cover.style.transform = 'translateY(100%)';
        statusBtn.className = 'btn-status known';
        statusBtn.textContent = '아는 단어';
    } else {
        cover.style.transform = 'translateY(0)';
        statusBtn.className = 'btn-status learning';
        statusBtn.textContent = '학습중';
    }
}

// 드래그로 뜻 커버 열기/닫기
(function initCoverDrag() {
    const cover = document.getElementById('meaningCover');
    const meaningArea = document.getElementById('cardMeaning');
    let startY = 0;
    let currentY = 0;
    let coverHeight = 0;
    let isDragging = false;
    let isOpen = false; // 커버가 열려있는지

    function onStart(e) {
        isDragging = true;
        cover.classList.add('dragging');
        startY = e.touches ? e.touches[0].clientY : e.clientY;
        coverHeight = cover.parentElement.offsetHeight;
        isOpen = AppState.currentSet.words[AppState.currentIndex].known;
        currentY = isOpen ? coverHeight : 0;
    }

    function onMeaningStart(e) {
        // 뜻 영역(커버 열린 상태)에서 드래그 시작 → 커버 닫기용
        if (!AppState.currentSet.words[AppState.currentIndex].known) return;
        isDragging = true;
        cover.classList.add('dragging');
        startY = e.touches ? e.touches[0].clientY : e.clientY;
        coverHeight = cover.parentElement.offsetHeight;
        isOpen = true;
        currentY = coverHeight;
    }

    function onMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const deltaY = clientY - startY;
        let newY = currentY + deltaY;
        newY = Math.max(0, Math.min(newY, coverHeight));
        cover.style.transform = `translateY(${newY}px)`;
    }

    function onEnd() {
        if (!isDragging) return;
        isDragging = false;
        cover.classList.remove('dragging');

        const transform = window.getComputedStyle(cover).transform;
        let finalY = 0;
        if (transform && transform !== 'none') {
            finalY = new DOMMatrix(transform).m42;
        }

        coverHeight = cover.parentElement.offsetHeight;
        const word = AppState.currentSet.words[AppState.currentIndex];
        const statusBtn = document.getElementById('statusBtn');

        if (finalY > coverHeight * 0.3) {
            // 열림 → 아는 단어
            cover.style.transform = 'translateY(100%)';
            word.known = true;
            statusBtn.className = 'btn-status known';
            statusBtn.textContent = '아는 단어';
        } else {
            // 닫힘 → 학습중 (known 해제)
            cover.style.transform = 'translateY(0)';
            word.known = false;
            statusBtn.className = 'btn-status learning';
            statusBtn.textContent = '학습중';
        }

        saveData();
        document.getElementById('knownCount').textContent = AppState.currentSet.words.filter(w => w.known).length;
        checkCompletion();
    }

    // 커버 위에서 드래그 (열기)
    cover.addEventListener('touchstart', onStart, { passive: false });
    cover.addEventListener('touchmove', onMove, { passive: false });
    cover.addEventListener('touchend', onEnd);
    cover.addEventListener('mousedown', onStart);

    // 뜻 텍스트 영역에서 드래그 (닫기 → known 해제)
    meaningArea.addEventListener('touchstart', onMeaningStart, { passive: false });
    meaningArea.addEventListener('touchmove', onMove, { passive: false });
    meaningArea.addEventListener('touchend', onEnd);
    meaningArea.addEventListener('mousedown', onMeaningStart);

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
})();

// 좌우 스와이프로 카드 넘기기
(function initCardSwipe() {
    const card = document.getElementById('flashCard');
    let startX = 0;
    let startY = 0;
    let deltaX = 0;
    let isSwiping = false;
    let directionLocked = false; // 방향 잠금 (수직/수평 판별 후)

    card.addEventListener('touchstart', function (e) {
        // 커버/뜻 영역은 수직 드래그 전용 → 스와이프 무시
        if (e.target.closest('.card-meaning-area')) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        deltaX = 0;
        isSwiping = false;
        directionLocked = false;
    }, { passive: true });

    card.addEventListener('touchmove', function (e) {
        if (e.target.closest('.card-meaning-area')) return;
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = currentX - startX;
        const diffY = currentY - startY;

        // 첫 10px 이동으로 방향 판별
        if (!directionLocked && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
            directionLocked = true;
            isSwiping = Math.abs(diffX) > Math.abs(diffY); // 수평이면 스와이프
        }

        if (!isSwiping) return;
        e.preventDefault();
        deltaX = diffX;
        card.style.transition = 'none';
        card.style.transform = `translateX(${deltaX}px)`;
        card.style.opacity = Math.max(0.5, 1 - Math.abs(deltaX) / 500);
    }, { passive: false });

    card.addEventListener('touchend', function () {
        if (!isSwiping) return;
        const threshold = card.offsetWidth * 0.25;
        const words = AppState.currentSet.words;

        if (deltaX < -threshold) {
            // 왼쪽 스와이프 → 다음
            card.style.transition = 'transform 0.2s, opacity 0.2s';
            card.style.transform = 'translateX(-100%)';
            card.style.opacity = '0';
            setTimeout(() => {
                goToNextCard(); // 통합된 다음 카드 로직 호출
                card.style.transition = 'none';
                card.style.transform = 'translateX(100%)';
                requestAnimationFrame(() => {
                    card.style.transition = 'transform 0.2s, opacity 0.2s';
                    card.style.transform = 'translateX(0)';
                    card.style.opacity = '1';
                });
            }, 200);
        } else if (deltaX > threshold && AppState.currentIndex > 0) {
            // 오른쪽 스와이프 → 이전
            card.style.transition = 'transform 0.2s, opacity 0.2s';
            card.style.transform = 'translateX(100%)';
            card.style.opacity = '0';
            setTimeout(() => {
                AppState.currentIndex--;
                updateCard();
                card.style.transition = 'none';
                card.style.transform = 'translateX(-100%)';
                requestAnimationFrame(() => {
                    card.style.transition = 'transform 0.2s, opacity 0.2s';
                    card.style.transform = 'translateX(0)';
                    card.style.opacity = '1';
                });
            }, 200);
        } else {
            // 스냅백
            card.style.transition = 'transform 0.2s, opacity 0.2s';
            card.style.transform = 'translateX(0)';
            card.style.opacity = '1';
        }

        isSwiping = false;
        directionLocked = false;
    });
})();

// 세트 학습 완료 체크
function checkCompletion() {
    const set = AppState.currentSet;
    if (set.words.every(w => w.known)) {
        const overlay = document.getElementById('completionOverlay');
        document.getElementById('completionMessage').textContent =
            `강민 ~~ ${set.name} 세트 단어 학습 완료! 축하!`;
        overlay.style.display = 'flex';
    }
}

// 완료 화면 버튼
document.getElementById('nextSetBtn').addEventListener('click', () => {
    // 다음 미완료 세트 찾기
    const sets = AppState.wordSets;
    let nextIndex = null;
    for (let i = 1; i <= sets.length; i++) {
        const idx = (AppState.currentSetIndex + i) % sets.length;
        if (!sets[idx].words.every(w => w.known)) {
            nextIndex = idx;
            break;
        }
    }

    if (nextIndex !== null) {
        startStudy(nextIndex);
    } else {
        // 모든 세트 완료
        document.getElementById('completionOverlay').style.display = 'none';
        showScreen('menuScreen');
        renderSetsList();
    }
});

document.getElementById('backToMenuBtn').addEventListener('click', () => {
    document.getElementById('completionOverlay').style.display = 'none';
    showScreen('menuScreen');
    renderSetsList();
});

// 이전/다음
document.getElementById('prevBtn').addEventListener('click', () => {
    if (AppState.currentIndex > 0) {
        AppState.currentIndex--;
        updateCard();
    }
});

document.getElementById('nextBtn').addEventListener('click', () => {
    goToNextCard();
});

// 다음 카드 로직 (Seamless Loop & Skip Known)
function goToNextCard() {
    const set = AppState.currentSet;
    const total = set.words.length;

    // 만약 모든 단어를 다 알게 된 경우 -> 완료 화면 (이동 불가)
    if (set.words.every(w => w.known)) {
        checkCompletion();
        return;
    }

    // 1회차 (loopMode == false)
    // 순서대로 끝까지 감. 건너뛰지 않음.
    if (!AppState.loopMode) {
        if (AppState.currentIndex < total - 1) {
            AppState.currentIndex++;
            updateCard();
        } else {
            // 마지막 카드 도달 -> 이제부터 loopMode 진입
            AppState.loopMode = true;
            goToNextUnknown(); // 첫 번째 루프 단어 찾기
        }
    } else {
        // 반복 모드 (loopMode == true)
        // 아는 단어는 건너뛰고 모르는 단어만 찾음
        goToNextUnknown();
    }
}

// 다음 모르는 단어 찾기 (현재 위치 다음부터 검색, 한 바퀴 돎)
function goToNextUnknown() {
    const set = AppState.currentSet;
    const total = set.words.length;
    let idx = (AppState.currentIndex + 1) % total;
    let found = false;

    // 최대 한 바퀴 검색
    for (let i = 0; i < total; i++) {
        if (!set.words[idx].known) {
            AppState.currentIndex = idx;
            found = true;
            break;
        }
        idx = (idx + 1) % total;
    }

    if (found) {
        updateCard();
    } else {
        // 모르는 단어가 하나도 없음 (방금 마지막 하나를 알게 됨)
        checkCompletion();
    }
}

// 뒤로가기
document.getElementById('studyBackBtn').addEventListener('click', () => {
    console.log('Study Back Clicked');
    showScreen('menuScreen');
    renderSetsList();
});

// 메뉴
document.getElementById('menuBtn').addEventListener('click', () => {
    document.getElementById('sideMenu').classList.add('active');
    document.getElementById('menuOverlay').classList.add('active');
});

document.getElementById('closeMenuBtn').addEventListener('click', closeMenu);
document.getElementById('menuOverlay').addEventListener('click', closeMenu);

function closeMenu() {
    document.getElementById('sideMenu').classList.remove('active');
    document.getElementById('menuOverlay').classList.remove('active');
}

function renderMenu() {
    const container = document.getElementById('menuContent');

    container.innerHTML = AppState.wordSets.map((set, index) => {
        const known = set.words.filter(w => w.known).length;
        const active = set === AppState.currentSet ? 'active' : '';

        return `
            <div class="menu-item ${active}" onclick="switchSet(${index})">
                <div style="font-weight:600;margin-bottom:5px">${set.name}</div>
                <div style="font-size:12px;color:#999">${known}/${set.words.length} 암기</div>
            </div>
        `;
    }).join('');
}

function switchSet(index) {
    closeMenu();
    startStudy(index);
}

// 내보내기
document.getElementById('exportBtn').addEventListener('click', () => {
    if (AppState.wordSets.length === 0) {
        alert('내보낼 세트가 없습니다');
        return;
    }

    const json = JSON.stringify(AppState.wordSets, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocabulary-sets-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

let importTargetSetIndex = null;

// 세트 삭제
function deleteSet(event, index) {
    event.stopPropagation();
    if (confirm(`"${AppState.wordSets[index].name}" 세트를 삭제하시겠습니까?`)) {
        AppState.wordSets.splice(index, 1);
        saveData();
        renderSetsList();
    }
}

// 개별 세트 내보내기
function exportSet(event, index) {
    event.stopPropagation();
    const set = AppState.wordSets[index];
    const json = JSON.stringify([set], null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocabulary-set-${set.name}-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// 개별 세트 가져오기 트리거
function triggerSetImport(event, index) {
    event.stopPropagation();
    importTargetSetIndex = index;
    document.getElementById('importInput').click();
}

// 가져오기
document.getElementById('importBtn').addEventListener('click', () => {
    importTargetSetIndex = null;
    document.getElementById('importInput').click();
});

document.getElementById('importInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const text = reader.result.trim();
            let data;

            try {
                data = JSON.parse(text);
            } catch {
                data = JSON.parse(text.replace(/^\uFEFF/, ''));
            }

            if (!Array.isArray(data)) {
                if (data && data.name && Array.isArray(data.words)) {
                    data = [data];
                } else {
                    throw new Error('올바른 세트 형식이 아닙니다');
                }
            }

            const validSets = data.filter(set =>
                set && set.name && Array.isArray(set.words) && set.words.length > 0
            );

            if (validSets.length === 0) {
                alert('유효한 세트가 없습니다');
                return;
            }

            if (importTargetSetIndex !== null) {
                // 특정 세트 교체
                const newWords = validSets[0].words.map(w => ({
                    word: w.word || '',
                    meaning: w.meaning || '',
                    known: w.known || false
                }));
                AppState.wordSets[importTargetSetIndex].words = newWords;
                AppState.wordSets[importTargetSetIndex].name = validSets[0].name;
                saveData();
                renderSetsList();
                alert(`"${validSets[0].name}" 세트 내용이 업데이트되었습니다`);
            } else {
                // 전체 추가
                validSets.forEach(set => {
                    AppState.wordSets.push({
                        name: set.name,
                        words: set.words.map(w => ({
                            word: w.word || '',
                            meaning: w.meaning || '',
                            known: w.known || false
                        })),
                        createdAt: set.createdAt || Date.now()
                    });
                });
                saveData();
                renderSetsList();
                alert(`${validSets.length}개 세트를 가져왔습니다`);
            }
        } catch (err) {
            alert('파일을 읽을 수 없습니다: ' + err.message);
        }
    };
    reader.onerror = () => {
        alert('파일 읽기에 실패했습니다');
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
});

// OCR 화면 초기화
function resetOCR() {
    document.getElementById('galleryInput').value = '';
    document.getElementById('cameraInput').value = '';
    document.getElementById('imagePreviewContainer').style.display = 'none';
    document.getElementById('imagePreviewContainer').innerHTML = '';
    document.getElementById('ocrProgress').style.display = 'none';
    document.getElementById('ocrResult').style.display = 'none';
    document.getElementById('setsContainer').innerHTML = '';
}
