// 전역 상태 관리
const AppState = {
    wordSets: [],
    currentSet: null,
    currentCardIndex: 0,
    isFlipped: false,
    hideKnown: false,
    shuffled: false
};

// 특수 괄호 문자를 일반 괄호로 변환
function convertSpecialBrackets(text) {
    if (!text) return text;
    
    // 원문자 (㉮, ㉯, ㉰, ㉱, ㉲, ㉳, ㉴, ㉵, ㉶, ㉷ 등) - (한글)
    const circledMap = {
        '㉮': '(ㄱ)', '㉯': '(ㄴ)', '㉰': '(ㄷ)', '㉱': '(ㄹ)', '㉲': '(ㅁ)',
        '㉳': '(ㅂ)', '㉴': '(ㅅ)', '㉵': '(ㅇ)', '㉶': '(ㅈ)', '㉷': '(ㅊ)',
        '㉸': '(ㅋ)', '㉹': '(ㅌ)', '㉺': '(ㅍ)', '㉻': '(ㅎ)'
    };
    
    // 괄호 한글 (㈀, ㈁, ㈂ 등) - (한글)
    const parenthesisMap = {
        '㈀': '(ㄱ)', '㈁': '(ㄴ)', '㈂': '(ㄷ)', '㈃': '(ㄹ)', '㈄': '(ㅁ)',
        '㈅': '(ㅂ)', '㈆': '(ㅅ)', '㈇': '(ㅇ)', '㈈': '(ㅈ)', '㈉': '(ㅊ)',
        '㈊': '(ㅋ)', '㈋': '(ㅌ)', '㈌': '(ㅍ)', '㈍': '(ㅎ)'
    };
    
    // 원숫자 (①, ②, ③ 등) - (숫자)
    const circledNumbersMap = {
        '①': '(1)', '②': '(2)', '③': '(3)', '④': '(4)', '⑤': '(5)',
        '⑥': '(6)', '⑦': '(7)', '⑧': '(8)', '⑨': '(9)', '⑩': '(10)',
        '⑪': '(11)', '⑫': '(12)', '⑬': '(13)', '⑭': '(14)', '⑮': '(15)'
    };
    
    // 네모 한글 (㉠, ㉡, ㉢ 등) - [한글]
    const squaredMap = {
        '㉠': '[ㄱ]', '㉡': '[ㄴ]', '㉢': '[ㄷ]', '㉣': '[ㄹ]', '㉤': '[ㅁ]',
        '㉥': '[ㅂ]', '㉦': '[ㅅ]', '㉧': '[ㅇ]', '㉨': '[ㅈ]', '㉩': '[ㅊ]',
        '㉪': '[ㅋ]', '㉫': '[ㅌ]', '㉬': '[ㅍ]', '㉭': '[ㅎ]'
    };
    
    // 네모 숫자 (⑴, ⑵, ⑶ 등) - [숫자]
    const squaredNumbersMap = {
        '⑴': '[1]', '⑵': '[2]', '⑶': '[3]', '⑷': '[4]', '⑸': '[5]',
        '⑹': '[6]', '⑺': '[7]', '⑻': '[8]', '⑼': '[9]', '⑽': '[10]',
        '⑾': '[11]', '⑿': '[12]', '⒀': '[13]', '⒁': '[14]', '⒂': '[15]'
    };
    
    // 검은 네모 숫자 (❶, ❷, ❸ 등) - [숫자]
    const blackSquaredMap = {
        '❶': '[1]', '❷': '[2]', '❸': '[3]', '❹': '[4]', '❺': '[5]',
        '❻': '[6]', '❼': '[7]', '❽': '[8]', '❾': '[9]', '❿': '[10]'
    };
    
    // 작은 원 한글 (ㄱ), ㄴ), ㄷ) 등) - 'ㄱ), 'ㄴ), 'ㄷ)
    const smallCircledMap = {
        'ⓐ': "'ㄱ)", 'ⓑ': "'ㄴ)", 'ⓒ': "'ㄷ)", 'ⓓ': "'ㄹ)", 'ⓔ': "'ㅁ)",
        'ⓕ': "'ㅂ)", 'ⓖ': "'ㅅ)", 'ⓗ': "'ㅇ)", 'ⓘ': "'ㅈ)", 'ⓙ': "'ㅊ)",
        'ⓚ': "'ㅋ)", 'ⓛ': "'ㅌ)", 'ⓜ': "'ㅍ)", 'ⓝ': "'ㅎ)"
    };
    
    // 겹원 한글 (ㄱ)), ㄴ)), ㄷ)) 등) - "ㄱ), "ㄴ), "ㄷ)
    const doubleCircledMap = {
        '⓵': '"ㄱ)', '⓶': '"ㄴ)', '⓷': '"ㄷ)', '⓸': '"ㄹ)', '⓹': '"ㅁ)',
        '⓺': '"ㅂ)', '⓻': '"ㅅ)', '⓼': '"ㅇ)', '⓽': '"ㅈ)', '⓾': '"ㅊ)'
    };
    
    // 모든 맵핑 적용
    let result = text;
    
    Object.keys(circledMap).forEach(key => {
        result = result.replace(new RegExp(key, 'g'), circledMap[key]);
    });
    
    Object.keys(parenthesisMap).forEach(key => {
        result = result.replace(new RegExp(key, 'g'), parenthesisMap[key]);
    });
    
    Object.keys(circledNumbersMap).forEach(key => {
        result = result.replace(new RegExp(key, 'g'), circledNumbersMap[key]);
    });
    
    Object.keys(squaredMap).forEach(key => {
        result = result.replace(new RegExp(key, 'g'), squaredMap[key]);
    });
    
    Object.keys(squaredNumbersMap).forEach(key => {
        result = result.replace(new RegExp(key, 'g'), squaredNumbersMap[key]);
    });
    
    Object.keys(blackSquaredMap).forEach(key => {
        result = result.replace(new RegExp(key, 'g'), blackSquaredMap[key]);
    });
    
    Object.keys(smallCircledMap).forEach(key => {
        result = result.replace(new RegExp(key, 'g'), smallCircledMap[key]);
    });
    
    Object.keys(doubleCircledMap).forEach(key => {
        result = result.replace(new RegExp(key, 'g'), doubleCircledMap[key]);
    });
    
    // 나머지 모든 한글 특수문자 자동 변환 (유니코드 범위)
    // 한글 자모 범위: ㄱ-ㅎ (U+3131 ~ U+314E), 가-힣 (U+AC00 ~ U+D7A3)
    // 괄호형 한글 범위: U+3200 ~ U+321E, U+3260 ~ U+327F 등
    result = result.replace(/[\u3200-\u321E\u3260-\u327F\u24D0-\u24E9]/g, (match) => {
        const code = match.charCodeAt(0);
        
        // 괄호형 한글 (㈎-㈜ 등)
        if (code >= 0x320E && code <= 0x321E) {
            const hangul = String.fromCharCode(0x3131 + (code - 0x320E)); // ㄱ-ㅎ 매핑
            return `'${hangul})`;
        }
        
        // 기타 특수문자는 그대로 '문자)' 형식으로
        // 특수문자 내부의 한글 추출 시도
        const normalized = match.normalize('NFKD');
        if (normalized.length > 0 && normalized !== match) {
            return `'${normalized})`;
        }
        
        return `'${match})`;
    });
    
    return result;
}

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
    progressDiv.innerHTML = `
        <div class="spinner"></div>
        <p>단어를 추출하는 중...</p>
        <p style="font-size: 12px; color: #999;">파일: ${file.name} (${(file.size / 1024).toFixed(1)}KB)</p>
    `;
    resultDiv.style.display = 'none';
    
    try {
        console.log('원본 파일:', file.name, file.type, file.size);
        
        // HEIC 파일을 JPEG로 변환 (브라우저 호환성)
        let processedFile = file;
        
        // HEIC 파일인 경우 Canvas로 변환
        if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic')) {
            console.log('HEIC 파일 감지, 변환 시작');
            progressDiv.innerHTML += '<p style="font-size: 12px;">HEIC 파일 변환 중...</p>';
            
            try {
                // Canvas를 이용해 이미지 리사이즈 및 JPEG 변환
                const img = await createImageBitmap(file);
                console.log('이미지 로드 완료:', img.width, 'x', img.height);
                
                const canvas = document.createElement('canvas');
                
                // 최대 크기 제한 (API 전송 크기 제한)
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
                
                // Canvas를 Blob으로 변환
                const blob = await new Promise(resolve => {
                    canvas.toBlob(resolve, 'image/jpeg', 0.95);
                });
                
                processedFile = new File([blob], 'image.jpg', { type: 'image/jpeg' });
                console.log('HEIC 변환 완료:', processedFile.size);
            } catch (conversionError) {
                console.error('HEIC 변환 오류:', conversionError);
                throw new Error('HEIC_CONVERSION_FAILED: ' + conversionError.message);
            }
        } else {
            console.log('일반 이미지 파일:', file.type);
        }
        
        // 파일 크기 체크 (5MB 제한)
        if (processedFile.size > 5 * 1024 * 1024) {
            throw new Error('FILE_TOO_LARGE: 파일이 너무 큽니다 (최대 5MB)');
        }
        
        progressDiv.innerHTML = `
            <div class="spinner"></div>
            <p>AI가 단어를 분석하는 중...</p>
            <p style="font-size: 12px; color: #999;">처리 중인 파일: ${processedFile.name}</p>
        `;
        
        // 파일을 Base64로 변환
        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                console.log('Base64 변환 완료, 길이:', base64.length);
                resolve(base64);
            };
            reader.onerror = () => {
                reject(new Error('FILE_READ_FAILED'));
            };
            reader.readAsDataURL(processedFile);
        });

        console.log('API 호출 시작');
        
        // Claude API 호출
        const response = await fetch('/api/ocr', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: {
                    data: base64Data,
                    media_type: processedFile.type || 'image/jpeg'
                }
            })
        });

        console.log('API 응답:', response.status, response.statusText);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('API 에러 응답:', errorData);
            throw new Error(`API_ERROR_${response.status}: ${errorData.error || response.statusText}`);
        }

        const result = await response.json();
        console.log('추출된 단어 개수:', result.words?.length || 0);
        
        let words = result.words || [];
        
        // 특수 괄호 문자를 일반 괄호로 변환
        words = words.map(word => ({
            ...word,
            meaning: convertSpecialBrackets(word.meaning)
        }));
        
        // 번호에서 세트 이름 자동 추출
        let suggestedSetName = '';
        if (words.length > 0) {
            const numbers = words.map(w => w.number).filter(n => n);
            if (numbers.length > 0) {
                // 첫 번째와 마지막 번호로 범위 생성
                const firstNum = numbers[0];
                const lastNum = numbers[numbers.length - 1];
                if (firstNum === lastNum) {
                    suggestedSetName = `${firstNum}번`;
                } else {
                    suggestedSetName = `${firstNum}-${lastNum}번`;
                }
            }
        }
        
        progressDiv.style.display = 'none';
        resultDiv.style.display = 'block';
        
        // 세트 이름 자동 입력
        if (suggestedSetName) {
            document.getElementById('setNameInput').value = suggestedSetName;
        }
        
        // 추출된 단어 표시
        renderWordInputs(words.length > 0 ? words : [{ number: '', word: '', meaning: '' }]);
        
        if (words.length === 0) {
            alert('단어를 찾지 못했습니다.\n수동으로 입력해주세요.');
        }
        
    } catch (error) {
        console.error('OCR 전체 오류:', error);
        
        // 에러 메시지 생성
        let errorMessage = '텍스트 추출에 실패했습니다.\n\n';
        
        if (error.message.includes('HEIC_CONVERSION')) {
            errorMessage += '원인: HEIC 파일 변환 실패\n해결: 사진 앱에서 JPEG로 변환 후 업로드';
        } else if (error.message.includes('FILE_TOO_LARGE')) {
            errorMessage += '원인: 파일이 너무 큼 (5MB 초과)\n해결: 더 작은 사진 사용';
        } else if (error.message.includes('FILE_READ')) {
            errorMessage += '원인: 파일 읽기 실패\n해결: 다른 사진 선택';
        } else if (error.message.includes('API_ERROR_500')) {
            errorMessage += '원인: 서버 오류\n해결: ANTHROPIC_API_KEY 확인 필요';
        } else if (error.message.includes('API_ERROR')) {
            errorMessage += '원인: API 호출 실패\n에러: ' + error.message;
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage += '원인: 네트워크 연결 오류\n해결: 인터넷 연결 확인';
        } else {
            errorMessage += '원인: ' + error.message;
        }
        
        errorMessage += '\n\n수동으로 단어를 입력할 수 있습니다.';
        
        alert(errorMessage);
        progressDiv.style.display = 'none';
        
        // 실패 시 빈 입력 필드 표시
        resultDiv.style.display = 'block';
        renderWordInputs([{ word: '', meaning: '' }]);
    }
}

// 단어 입력 필드 렌더링
function renderWordInputs(words) {
    const container = document.getElementById('wordsList');
    
    // 번호별로 그룹핑
    const groupedWords = {};
    words.forEach((word, index) => {
        const num = word.number || 'etc';
        if (!groupedWords[num]) {
            groupedWords[num] = [];
        }
        groupedWords[num].push({ ...word, originalIndex: index });
    });
    
    let html = '';
    Object.keys(groupedWords).sort().forEach(num => {
        if (num !== 'etc') {
            html += `<div class="word-group-header">${num}번</div>`;
        }
        
        groupedWords[num].forEach(word => {
            html += `
                <div class="word-item" data-index="${word.originalIndex}">
                    <input type="text" 
                           placeholder="단어" 
                           value="${word.word || ''}" 
                           class="word-input">
                    <textarea placeholder="뜻" 
                              class="meaning-input"
                              rows="1">${word.meaning || ''}</textarea>
                    <button class="remove-word-btn" onclick="removeWordInput(${word.originalIndex})">×</button>
                </div>
            `;
        });
    });
    
    container.innerHTML = html;
    
    // textarea 높이 자동 조절
    document.querySelectorAll('.meaning-input').forEach(textarea => {
        autoResizeTextarea(textarea);
        textarea.addEventListener('input', function() {
            autoResizeTextarea(this);
        });
    });
}

// textarea 자동 높이 조절
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';
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
        <textarea placeholder="뜻" class="meaning-input" rows="1"></textarea>
        <button class="remove-word-btn" onclick="removeWordInput(${index})">×</button>
    `;
    container.appendChild(div);
    
    // 새로 추가된 textarea에도 자동 높이 조절 적용
    const textarea = div.querySelector('.meaning-input');
    textarea.addEventListener('input', function() {
        autoResizeTextarea(this);
    });
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
    renderSideMenu();
}

// 사이드 메뉴 렌더링
function renderSideMenu() {
    const container = document.getElementById('sideMenuContent');
    
    if (AppState.wordSets.length === 0) {
        container.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">세트가 없습니다</p>';
        return;
    }
    
    container.innerHTML = AppState.wordSets.map((set, index) => {
        const knownCount = set.words.filter(w => w.known).length;
        const totalCount = set.words.length;
        const isActive = AppState.currentSet && AppState.currentSet.name === set.name;
        
        return `
            <div class="side-menu-item ${isActive ? 'active' : ''}" data-index="${index}">
                <div class="side-menu-item-title">${set.name}</div>
                <div class="side-menu-item-count">${knownCount}/${totalCount} 암기</div>
            </div>
        `;
    }).join('');
    
    // 클릭 이벤트
    document.querySelectorAll('.side-menu-item').forEach(item => {
        item.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            closeSideMenu();
            startStudy(index);
        });
    });
}

// 사이드 메뉴 열기
document.getElementById('menuBtn').addEventListener('click', () => {
    document.getElementById('sideMenu').classList.add('active');
    document.getElementById('menuOverlay').classList.add('active');
});

// 사이드 메뉴 닫기
function closeSideMenu() {
    document.getElementById('sideMenu').classList.remove('active');
    document.getElementById('menuOverlay').classList.remove('active');
}

document.getElementById('closeMenuBtn').addEventListener('click', closeSideMenu);
document.getElementById('menuOverlay').addEventListener('click', closeSideMenu);

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
    
    // 힌트 영역 숨김
    document.getElementById('cardHint').style.display = 'none';
    
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
