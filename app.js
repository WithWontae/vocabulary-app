// 전역 상태
const AppState = {
    wordSets: [],
    currentSet: null,
    currentSetIndex: null,
    currentIndex: 0
};

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    showScreen('menuScreen');
    renderSetsList();
});

// 데이터 로드/저장
function loadData() {
    const saved = localStorage.getItem('vocabularyAppData');
    if (saved) {
        AppState.wordSets = JSON.parse(saved);
    }
}

function saveData() {
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
    showScreen('menuScreen');
});

document.getElementById('uploadBtn').addEventListener('click', () => {
    document.getElementById('imageInput').click();
});

document.getElementById('imageInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    await processOCR(file);
});

// OCR 처리
async function processOCR(file) {
    const progressDiv = document.getElementById('ocrProgress');
    const resultDiv = document.getElementById('ocrResult');
    const progressText = document.getElementById('progressText');
    
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

        // API 호출
        const response = await fetch('/api/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: {
                    data: base64Data,
                    media_type: processedFile.type || 'image/jpeg'
                }
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
            alert('단어를 찾지 못했습니다');
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
        name: num === 'etc' ? '기타' : `${num}번`,
        words: groups[num]
    }));
}

// 세트 렌더링
function renderSets(sets) {
    const container = document.getElementById('setsContainer');
    
    container.innerHTML = sets.map((set, index) => `
        <div class="word-set-card">
            <div class="word-set-header">
                <h4>${set.name} (${set.words.length}개)</h4>
            </div>
            <input type="text" 
                   class="set-name-input" 
                   value="${set.name}" 
                   data-index="${index}"
                   placeholder="세트 이름">
            <div class="word-preview">
                ${set.words.slice(0, 5).map(w => `
                    <div class="word-preview-item">
                        <span class="word-preview-word">${w.word}</span>
                        <span class="word-preview-meaning">${w.meaning.split('\n')[0]}</span>
                    </div>
                `).join('')}
                ${set.words.length > 5 ? `<div style="text-align:center;color:#999;padding:10px;">...외 ${set.words.length - 5}개</div>` : ''}
            </div>
            <div class="btn-group">
                <button class="btn btn-primary" onclick="saveSet(${index}, ${JSON.stringify(set.words).replace(/"/g, '&quot;')})">
                    💾 저장
                </button>
            </div>
        </div>
    `).join('');
}

// 세트 저장
function saveSet(index, words) {
    const input = document.querySelector(`.set-name-input[data-index="${index}"]`);
    const name = input.value.trim();
    
    if (!name) {
        alert('세트 이름을 입력하세요');
        return;
    }
    
    AppState.wordSets.push({
        name: name,
        words: words.map(w => ({
            word: w.word,
            meaning: w.meaning,
            known: false
        })),
        createdAt: Date.now()
    });
    
    saveData();
    alert(`"${name}" 세트 저장 완료!`);
    
    input.closest('.word-set-card').style.opacity = '0.5';
    input.closest('.word-set-card').style.pointerEvents = 'none';
}

// 학습 시작
function startStudy(setIndex) {
    AppState.currentSet = AppState.wordSets[setIndex];
    AppState.currentSetIndex = setIndex;
    AppState.currentIndex = 0;

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

    document.getElementById('cardWord').textContent = word.word;
    document.getElementById('cardMeaning').textContent = word.meaning;

    // 커버 & 상태 버튼 초기화
    const cover = document.getElementById('meaningCover');
    const statusBtn = document.getElementById('statusBtn');
    const coverHeight = cover.parentElement.offsetHeight;

    if (word.known) {
        cover.style.transform = `translateY(${coverHeight}px)`;
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
    let startY = 0;
    let currentY = 0;
    let coverHeight = 0;
    let isDragging = false;

    function onStart(e) {
        isDragging = true;
        cover.classList.add('dragging');
        startY = e.touches ? e.touches[0].clientY : e.clientY;
        coverHeight = cover.parentElement.offsetHeight;
        // 현재 transform 값 읽기
        const transform = window.getComputedStyle(cover).transform;
        if (transform && transform !== 'none') {
            const matrix = new DOMMatrix(transform);
            currentY = matrix.m42;
        } else {
            currentY = 0;
        }
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
            cover.style.transform = `translateY(${coverHeight}px)`;
            word.known = true;
            statusBtn.className = 'btn-status known';
            statusBtn.textContent = '아는 단어';
        } else {
            // 닫힘 → 학습중
            cover.style.transform = 'translateY(0)';
            word.known = false;
            statusBtn.className = 'btn-status learning';
            statusBtn.textContent = '학습중';
        }

        saveData();
        document.getElementById('knownCount').textContent = AppState.currentSet.words.filter(w => w.known).length;

        // 모든 단어 학습 완료 체크
        checkCompletion();
    }

    cover.addEventListener('touchstart', onStart, { passive: true });
    cover.addEventListener('touchmove', onMove, { passive: false });
    cover.addEventListener('touchend', onEnd);
    cover.addEventListener('mousedown', onStart);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
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
    if (AppState.currentIndex < AppState.currentSet.words.length - 1) {
        AppState.currentIndex++;
        updateCard();
    }
});

// 뒤로가기
document.getElementById('studyBackBtn').addEventListener('click', () => {
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

// 가져오기
document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importInput').click();
});

document.getElementById('importInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            if (!Array.isArray(data)) throw new Error('배열이 아님');

            const validSets = data.filter(set =>
                set && set.name && Array.isArray(set.words) && set.words.length > 0
            );

            if (validSets.length === 0) {
                alert('유효한 세트가 없습니다');
                return;
            }

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
        } catch (err) {
            alert('파일을 읽을 수 없습니다: ' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
});
