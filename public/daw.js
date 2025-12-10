/**
 * ============================================================
 * 🎵 DAW Pro - AI Music Studio
 * ============================================================
 * 
 * AI 음악 생성과 DAW 기능을 통합한 웹 기반 음악 제작 도구
 * 
 * 📋 코드 구조:
 * ──────────────────────────────────────────────────────────
 * 1. START WORKFLOW     - 시작 모달 워크플로우 처리
 * 2. SUNO API           - AI 음악 생성 API 연동 클래스
 * 3. FULL SONG MODAL    - 풀 곡 생성 모달 UI/로직
 * 4. YOUTUBE UPLOAD     - YouTube 업로드 모달/로직
 * 5. DAW PRO CLASS      - 메인 DAW 엔진 클래스
 *    - constructor      : 초기화
 *    - init             : Tone.js 및 이벤트 설정
 *    - addTrack         : 트랙 추가
 *    - createDrumSound  : 드럼 사운드 생성
 *    - createSynthSound : 신디사이저 사운드 생성
 *    - play/stop/rewind : 재생 컨트롤
 *    - saveProject      : 프로젝트 저장
 *    - exportAudio      : WAV 파일 내보내기
 *    - generateAIVocal  : AI 보컬 생성
 * ──────────────────────────────────────────────────────────
 * 
 * 🔧 의존성:
 * - Tone.js (오디오 엔진)
 * - server.js (API 백엔드)
 * 
 * 📅 마지막 업데이트: 2024-12
 * ============================================================
 */

// ==================== START WORKFLOW ====================
function startWorkflow(mode) {
    document.getElementById('start-modal').style.display = 'none';

    switch (mode) {
        case 'beat':
            // 비트 만들기 - DAW 기본 모드
            console.log('비트 만들기 모드 시작');
            document.querySelector('[data-tab="mixer"]').click();
            break;
        case 'vocal':
            // 보컬만 - AI 보컬 탭 열기
            console.log('보컬 만들기 모드 시작');
            document.querySelector('[data-tab="vocal"]').click();
            break;
        case 'full':
            // 풀 곡 - Suno AI로 완성곡 생성
            console.log('풀 곡 만들기 모드 시작');
            openFullSongGenerator();
            break;
        case 'free':
        default:
            // 자유 모드 - DAW 바로 사용
            console.log('자유 모드 시작');
            break;
    }
}
window.startWorkflow = startWorkflow;

// ==================== SUNO API 연동 ====================
class SunoAPI {
    constructor() {
        this.baseUrl = '/api';
    }

    async generateMusic(prompt, style, lyrics = '', instrumental = false) {
        try {
            const response = await fetch(`${this.baseUrl}/generate-music`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, style, lyrics, instrumental })
            });
            return await response.json();
        } catch (error) {
            console.error('Suno API 오류:', error);
            return { success: false, error: error.message };
        }
    }

    async checkStatus(taskId) {
        try {
            const response = await fetch(`${this.baseUrl}/status/${taskId}`);
            return await response.json();
        } catch (error) {
            console.error('상태 확인 오류:', error);
            return { success: false, error: error.message };
        }
    }

    async saveForYoutube(audioUrl, title) {
        try {
            const response = await fetch(`${this.baseUrl}/save-for-youtube`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioUrl, title })
            });
            return await response.json();
        } catch (error) {
            console.error('YouTube 저장 오류:', error);
            return { success: false, error: error.message };
        }
    }

    // YouTube 업로드 기능
    async getYoutubeStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/youtube/status`);
            return await response.json();
        } catch (error) {
            return { ready: false, error: error.message };
        }
    }

    async getPendingUploads() {
        try {
            const response = await fetch(`${this.baseUrl}/youtube/pending`);
            return await response.json();
        } catch (error) {
            return [];
        }
    }

    async uploadToYoutube(audioPath, title) {
        try {
            const response = await fetch(`${this.baseUrl}/youtube/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioPath, title })
            });
            return await response.json();
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

const sunoAPI = new SunoAPI();
window.sunoAPI = sunoAPI;

// 풀 곡 생성 모달
function openFullSongGenerator() {
    // 모달 생성
    const modal = document.createElement('div');
    modal.id = 'full-song-modal';
    modal.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.95); z-index: 20000;
                display: flex; justify-content: center; align-items: center;
            `;
    modal.innerHTML = `
                <div style="
                    background: linear-gradient(135deg, #12121a, #1a1a2e);
                    border-radius: 24px; padding: 40px; max-width: 700px; width: 90%;
                    border: 1px solid #2a2a3a;
                ">
                    <h2 style="
                        font-size: 1.8em; margin-bottom: 20px; text-align: center;
                        background: linear-gradient(90deg, #00ff88, #00d4ff);
                        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                    ">🎵 AI로 풀 곡 만들기</h2>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; color: #888; margin-bottom: 8px;">🎤 곡 제목</label>
                        <input type="text" id="song-title" placeholder="별을 담다" style="
                            width: 100%; padding: 12px; background: #1a1a25; border: 1px solid #333;
                            border-radius: 8px; color: #fff; font-size: 16px;
                        ">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; color: #888; margin-bottom: 8px;">🎨 스타일</label>
                        <select id="song-style" style="
                            width: 100%; padding: 12px; background: #1a1a25; border: 1px solid #333;
                            border-radius: 8px; color: #fff; font-size: 16px;
                        ">
                            <option value="Ballad">🎹 발라드</option>
                            <option value="K-pop">🇰🇷 K-Pop</option>
                            <option value="lo-fi hip hop">🎧 Lo-Fi</option>
                            <option value="EDM">⚡ EDM</option>
                            <option value="R&B">🎤 R&B</option>
                            <option value="Hip Hop">🎤 Hip Hop</option>
                            <option value="Rock">🎸 Rock</option>
                            <option value="Jazz">🎷 Jazz</option>
                            <option value="Acoustic">🎻 Acoustic</option>
                            <option value="Cinematic">🎬 Cinematic</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; color: #888; margin-bottom: 8px;">📝 가사 (선택사항)</label>
                        <textarea id="song-lyrics" placeholder="[Verse 1]
밤하늘에 반짝이는 별들처럼
너의 눈빛이 날 비추네

[Chorus]
별을 담다, 네 마음에
영원히 간직할게" style="
                            width: 100%; padding: 12px; background: #1a1a25; border: 1px solid #333;
                            border-radius: 8px; color: #fff; font-size: 14px; height: 150px; resize: none;
                        "></textarea>
                    </div>
                    
                    <div style="margin-bottom: 25px;">
                        <label style="display: flex; align-items: center; gap: 10px; color: #888; cursor: pointer;">
                            <input type="checkbox" id="instrumental-mode">
                            🎹 인스트루멘탈 (보컬 없음)
                        </label>
                    </div>
                    
                    <div id="generation-status" style="
                        display: none; margin-bottom: 20px; padding: 15px;
                        background: #1a1a25; border-radius: 8px; text-align: center;
                    ">
                        <div class="spinner" style="margin: 0 auto 10px;"></div>
                        <div id="status-text" style="color: #00d4ff;">생성 중...</div>
                    </div>
                    
                    <div id="generation-result" style="display: none; margin-bottom: 20px;"></div>
                    
                    <div style="display: flex; gap: 15px;">
                        <button id="generate-btn" style="
                            flex: 1; padding: 15px; background: linear-gradient(135deg, #00ff88, #00d4ff);
                            border: none; border-radius: 12px; color: #000; font-size: 16px;
                            font-weight: bold; cursor: pointer;
                        " onclick="generateFullSong()">
                            🚀 음악 생성
                        </button>
                        <button style="
                            padding: 15px 25px; background: none; border: 1px solid #444;
                            border-radius: 12px; color: #888; cursor: pointer;
                        " onclick="document.getElementById('full-song-modal').remove()">
                            닫기
                        </button>
                    </div>
                </div>
            `;
    document.body.appendChild(modal);
}
window.openFullSongGenerator = openFullSongGenerator;

// 풀 곡 생성 실행
async function generateFullSong() {
    const title = document.getElementById('song-title').value.trim() || '새로운 노래';
    const style = document.getElementById('song-style').value;
    const lyrics = document.getElementById('song-lyrics').value.trim();
    const instrumental = document.getElementById('instrumental-mode').checked;

    const statusDiv = document.getElementById('generation-status');
    const statusText = document.getElementById('status-text');
    const resultDiv = document.getElementById('generation-result');
    const generateBtn = document.getElementById('generate-btn');

    statusDiv.style.display = 'block';
    resultDiv.style.display = 'none';
    generateBtn.disabled = true;
    statusText.textContent = '🚀 요청 전송 중...';

    // 1. 생성 요청
    const prompt = `${title}, ${lyrics ? '가사 포함' : ''}`;
    const response = await sunoAPI.generateMusic(prompt, style, lyrics, instrumental);

    if (!response.success) {
        statusText.innerHTML = `❌ 오류: ${response.error}<br><small style="color:#888;">GoAPI 점검 중일 수 있습니다. 잠시 후 다시 시도해주세요.</small>`;
        generateBtn.disabled = false;
        return;
    }

    const taskId = response.taskId;
    statusText.textContent = '⏳ 생성 중... (1~3분 소요)';

    // 2. 상태 폴링
    let attempts = 0;
    const maxAttempts = 90; // 최대 7.5분

    const checkLoop = async () => {
        attempts++;
        const status = await sunoAPI.checkStatus(taskId);

        if (status.status === 'completed' && status.audioUrl) {
            // 성공!
            statusDiv.style.display = 'none';
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                        <div style="text-align: center; margin-bottom: 15px;">
                            <span style="font-size: 50px;">🎉</span>
                            <div style="color: #00ff88; font-size: 18px; margin-top: 10px;">생성 완료!</div>
                        </div>
                        <audio controls style="width: 100%; margin-bottom: 15px;" src="${status.audioUrl}"></audio>
                        <div style="display: flex; gap: 10px;">
                            <a href="${status.audioUrl}" download="${title}.mp3" style="
                                flex: 1; padding: 12px; background: #1a1a25; border: 1px solid #333;
                                border-radius: 8px; color: #fff; text-decoration: none; text-align: center;
                            ">📥 다운로드</a>
                            <button onclick="saveToYoutubeFolder('${status.audioUrl}', '${title}')" style="
                                flex: 1; padding: 12px; background: #ff0000; border: none;
                                border-radius: 8px; color: #fff; cursor: pointer;
                            ">📺 YouTube 폴더 저장</button>
                        </div>
                    `;
            generateBtn.disabled = false;
        } else if (status.status === 'failed') {
            statusText.textContent = '❌ 생성 실패: ' + (status.error || '알 수 없는 오류');
            generateBtn.disabled = false;
        } else if (attempts >= maxAttempts) {
            statusText.textContent = '⏱️ 시간 초과 - 나중에 다시 시도해주세요';
            generateBtn.disabled = false;
        } else {
            statusText.textContent = `⏳ 생성 중... (${status.status || 'processing'}) [${attempts}/${maxAttempts}]`;
            setTimeout(checkLoop, 5000);
        }
    };

    setTimeout(checkLoop, 5000);
}
window.generateFullSong = generateFullSong;

// YouTube 폴더에 저장
async function saveToYoutubeFolder(audioUrl, title) {
    const result = await sunoAPI.saveForYoutube(audioUrl, title);
    if (result.success) {
        alert('✅ YouTube 업로드 폴더에 저장되었습니다!\\n' + result.filepath);
    } else {
        alert('❌ 저장 실패: ' + result.error);
    }
}
window.saveToYoutubeFolder = saveToYoutubeFolder;

// YouTube 업로드 모달
async function openYoutubeUploader() {
    // 모달 생성
    const modal = document.createElement('div');
    modal.id = 'youtube-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.95); z-index: 20000;
        display: flex; justify-content: center; align-items: center;
    `;

    // 상태 확인
    const status = await sunoAPI.getYoutubeStatus();
    const pending = await sunoAPI.getPendingUploads();

    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #12121a, #1a1a2e);
            border-radius: 24px; padding: 40px; max-width: 700px; width: 90%;
            border: 1px solid #ff0000;
        ">
            <h2 style="
                font-size: 1.8em; margin-bottom: 20px; text-align: center;
                color: #ff0000;
            ">📺 YouTube 업로드</h2>
            
            <div style="margin-bottom: 20px; padding: 15px; background: #1a1a25; border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <span style="color: ${status.uploaderExists ? '#00ff88' : '#ff4444'};">
                        ${status.uploaderExists ? '✅' : '❌'} 업로더 스크립트
                    </span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: ${status.clientSecretExists ? '#00ff88' : '#ff4444'};">
                        ${status.clientSecretExists ? '✅' : '❌'} Google API 인증
                    </span>
                </div>
                ${!status.clientSecretExists ? `
                    <div style="margin-top: 10px; padding: 10px; background: #2a1a1a; border-radius: 4px; font-size: 12px; color: #ff8888;">
                        ⚠️ Google Cloud Console에서 client_secret.json을 다운로드하여<br>
                        ai-music-studio 폴더에 저장해주세요.
                    </div>
                ` : ''}
            </div>
            
            <h3 style="color: #888; font-size: 14px; margin-bottom: 15px;">📁 업로드 대기 중인 파일</h3>
            
            <div id="pending-files" style="max-height: 200px; overflow-y: auto; margin-bottom: 20px;">
                ${pending.length === 0 ? `
                    <div style="text-align: center; color: #666; padding: 20px;">
                        업로드 대기 중인 파일이 없습니다.<br>
                        <small>AI 생성 후 "YouTube 폴더 저장" 버튼을 눌러주세요.</small>
                    </div>
                ` : pending.map(file => `
                    <div style="
                        display: flex; align-items: center; justify-content: space-between;
                        padding: 10px; background: #1a1a25; border-radius: 8px; margin-bottom: 8px;
                    ">
                        <span style="color: #fff;">🎵 ${file.name}</span>
                        <button onclick="uploadFile('${file.path.replace(/\\/g, '\\\\')}', '${file.name}')" style="
                            padding: 8px 16px; background: #ff0000; border: none;
                            border-radius: 4px; color: #fff; cursor: pointer;
                        ">📤 업로드</button>
                    </div>
                `).join('')}
            </div>
            
            <div style="display: flex; gap: 15px;">
                <button style="
                    flex: 1; padding: 15px; background: none; border: 1px solid #444;
                    border-radius: 12px; color: #888; cursor: pointer;
                " onclick="document.getElementById('youtube-modal').remove()">
                    닫기
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}
window.openYoutubeUploader = openYoutubeUploader;

// 파일 업로드 실행
async function uploadFile(filepath, filename) {
    const title = filename.replace(/\.(mp3|wav)$/i, '').replace(/_/g, ' ');

    if (!confirm(`"${title}" 파일을 YouTube에 업로드하시겠습니까?`)) {
        return;
    }

    document.getElementById('youtube-modal').innerHTML = `
        <div style="
            background: linear-gradient(135deg, #12121a, #1a1a2e);
            border-radius: 24px; padding: 40px; max-width: 400px;
            border: 1px solid #ff0000; text-align: center;
        ">
            <div class="spinner" style="margin: 0 auto 20px;"></div>
            <div style="color: #fff;">📤 YouTube 업로드 중...</div>
            <div style="color: #888; font-size: 12px; margin-top: 10px;">
                (변환 + 업로드로 1~3분 소요)
            </div>
        </div>
    `;

    const result = await sunoAPI.uploadToYoutube(filepath, title);

    if (result.success) {
        document.getElementById('youtube-modal').innerHTML = `
            <div style="
                background: linear-gradient(135deg, #12121a, #1a1a2e);
                border-radius: 24px; padding: 40px; max-width: 500px;
                border: 1px solid #00ff88; text-align: center;
            ">
                <span style="font-size: 50px;">🎉</span>
                <h3 style="color: #00ff88; margin: 20px 0;">업로드 완료!</h3>
                ${result.url ? `
                    <a href="${result.url}" target="_blank" style="
                        display: block; padding: 15px; background: #ff0000;
                        border-radius: 8px; color: #fff; text-decoration: none;
                        margin-bottom: 20px;
                    ">🔗 YouTube에서 보기</a>
                ` : ''}
                <button onclick="document.getElementById('youtube-modal').remove()" style="
                    padding: 12px 30px; background: none; border: 1px solid #444;
                    border-radius: 8px; color: #888; cursor: pointer;
                ">닫기</button>
            </div>
        `;
    } else {
        alert('❌ 업로드 실패: ' + result.error);
        document.getElementById('youtube-modal').remove();
    }
}
window.uploadFile = uploadFile;

// ==================== MAIN DAW ENGINE ====================
class DAWPro {
    constructor() {
        this.isPlaying = false;
        this.isRecording = false;
        this.isLooping = false;
        this.bpm = 120;
        this.currentBeat = 0;
        this.totalBars = 16;
        this.beatsPerBar = 4;
        this.tracks = [];
        this.selectedTrack = null;
        this.recorder = null;
        this.recordedChunks = [];
        this.audioContext = null;
        this.analyser = null;

        // Effects
        this.reverb = null;
        this.delay = null;
        this.distortion = null;
        this.compressor = null;

        this.init();
    }

    async init() {
        // Initialize Tone.js
        await Tone.start();
        Tone.Transport.bpm.value = this.bpm;

        // Setup effects
        this.setupEffects();

        // Generate timeline
        this.generateTimeline();

        // Generate piano roll
        this.generatePianoRoll();

        // Setup event listeners
        this.setupEventListeners();

        // Add default track
        this.addTrack('Master', 'master');

        console.log('DAW Pro initialized');
    }

    setupEffects() {
        // Reverb
        this.reverb = new Tone.Reverb({
            decay: 2.5,
            wet: 0.3
        }).toDestination();

        // Delay
        this.delay = new Tone.FeedbackDelay({
            delayTime: "8n",
            feedback: 0.3,
            wet: 0.25
        }).toDestination();

        // Distortion
        this.distortion = new Tone.Distortion({
            distortion: 0.4,
            wet: 0
        }).toDestination();

        // Compressor
        this.compressor = new Tone.Compressor({
            threshold: -24,
            ratio: 4,
            attack: 0.003,
            release: 0.25
        }).toDestination();
    }

    generateTimeline() {
        const ruler = document.getElementById('timeline-ruler');
        ruler.innerHTML = '';
        for (let i = 1; i <= this.totalBars; i++) {
            const marker = document.createElement('div');
            marker.className = 'bar-marker';
            marker.textContent = i;
            ruler.appendChild(marker);
        }
    }

    generatePianoRoll() {
        const keys = document.getElementById('piano-keys');
        const grid = document.getElementById('piano-grid');
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        keys.innerHTML = '';
        grid.innerHTML = '';

        // Generate 4 octaves (C2 to B5)
        for (let octave = 5; octave >= 2; octave--) {
            for (let i = notes.length - 1; i >= 0; i--) {
                const note = notes[i];
                const isBlack = note.includes('#');

                // Key
                const key = document.createElement('div');
                key.className = `piano-key ${isBlack ? 'black' : 'white'}`;
                key.textContent = `${note}${octave}`;
                key.dataset.note = `${note}${octave}`;
                keys.appendChild(key);

                // Grid row
                const row = document.createElement('div');
                row.className = `grid-row ${isBlack ? 'black' : ''}`;
                row.dataset.note = `${note}${octave}`;

                // 64 cells (16 bars * 4 beats)
                for (let beat = 0; beat < 64; beat++) {
                    const cell = document.createElement('div');
                    cell.className = 'grid-cell';
                    cell.dataset.beat = beat;
                    cell.dataset.note = `${note}${octave}`;
                    row.appendChild(cell);
                }

                grid.appendChild(row);
            }
        }
    }

    addTrack(name, type = 'instrument', sound = null) {
        const trackId = `track-${Date.now()}`;
        const track = {
            id: trackId,
            name: name,
            type: type,
            sound: sound,
            volume: 0.8,
            pan: 0,
            muted: false,
            solo: false,
            patterns: [],
            steps: new Array(64).fill(false),
            notes: {},  // 피아노 롤 노트 저장 {beat: [note1, note2, ...]}
            synth: null,
            player: null
        };

        // Create instrument based on type
        if (type === 'drum') {
            track.synth = this.createDrumSound(sound);
        } else if (type === 'synth' || type === 'bass') {
            track.synth = this.createSynthSound(sound);
        } else if (type === 'fx') {
            track.synth = this.createFXSound(sound);
        }

        this.tracks.push(track);
        this.renderTrack(track);
        this.updateMixer();

        return track;
    }

    createDrumSound(sound) {
        const drums = {
            kick: new Tone.MembraneSynth({
                pitchDecay: 0.05,
                octaves: 6,
                oscillator: { type: 'sine' },
                envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
            }),
            snare: new Tone.NoiseSynth({
                noise: { type: 'white' },
                envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 }
            }),
            hihat: new Tone.MetalSynth({
                frequency: 200,
                envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
                harmonicity: 5.1,
                modulationIndex: 32,
                resonance: 4000,
                octaves: 1.5
            }),
            clap: new Tone.NoiseSynth({
                noise: { type: 'pink' },
                envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 }
            }),
            tom: new Tone.MembraneSynth({
                pitchDecay: 0.1,
                octaves: 4,
                envelope: { attack: 0.001, decay: 0.3, sustain: 0.01, release: 0.5 }
            }),
            cymbal: new Tone.MetalSynth({
                frequency: 300,
                envelope: { attack: 0.001, decay: 1, release: 0.5 },
                harmonicity: 5.1,
                modulationIndex: 40,
                octaves: 1.5
            }),
            rim: new Tone.MembraneSynth({
                pitchDecay: 0.008,
                octaves: 2,
                envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.1 }
            }),
            perc: new Tone.PluckSynth({
                attackNoise: 4,
                dampening: 4000,
                resonance: 0.9
            })
        };

        const synth = drums[sound] || drums.kick;
        synth.connect(this.reverb);
        return synth;
    }

    createSynthSound(sound) {
        const synths = {
            piano: new Tone.Sampler({
                urls: { C4: "C4.mp3" },
                baseUrl: "https://tonejs.github.io/audio/salamander/",
                onload: () => console.log("Piano loaded")
            }),
            synth: new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'sawtooth' },
                envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.8 }
            }),
            pad: new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'sine' },
                envelope: { attack: 0.5, decay: 0.5, sustain: 0.8, release: 2 }
            }),
            organ: new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'square' },
                envelope: { attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.1 }
            }),
            pluck: new Tone.PluckSynth({
                attackNoise: 2,
                dampening: 4000,
                resonance: 0.95
            }),
            sub: new Tone.MonoSynth({
                oscillator: { type: 'sine' },
                envelope: { attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.5 },
                filterEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.5 }
            }),
            '808': new Tone.MonoSynth({
                oscillator: { type: 'sine' },
                envelope: { attack: 0.001, decay: 0.5, sustain: 0.4, release: 1 }
            }),
            synthbass: new Tone.MonoSynth({
                oscillator: { type: 'sawtooth' },
                envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.3 },
                filter: { Q: 2, type: 'lowpass', rolloff: -24 },
                filterEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.3 }
            }),
            ebass: new Tone.MonoSynth({
                oscillator: { type: 'triangle' },
                envelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.4 }
            })
        };

        const synth = synths[sound] || synths.synth;
        synth.connect(this.reverb);
        return synth;
    }

    createFXSound(sound) {
        const fx = {
            riser: new Tone.Synth({
                oscillator: { type: 'sawtooth' },
                envelope: { attack: 4, decay: 0, sustain: 1, release: 0.5 }
            }),
            downlifter: new Tone.Synth({
                oscillator: { type: 'sawtooth' },
                envelope: { attack: 0.01, decay: 4, sustain: 0, release: 0.5 }
            }),
            noise: new Tone.NoiseSynth({
                noise: { type: 'white' },
                envelope: { attack: 0.5, decay: 0.5, sustain: 0.5, release: 1 }
            }),
            impact: new Tone.MembraneSynth({
                pitchDecay: 0.2,
                octaves: 8,
                envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.5 }
            })
        };

        const synth = fx[sound] || fx.noise;
        synth.connect(this.reverb);
        return synth;
    }

    renderTrack(track) {
        const container = document.getElementById('tracks-container');

        const trackEl = document.createElement('div');
        trackEl.className = 'track';
        trackEl.id = track.id;
        trackEl.dataset.trackId = track.id;

        const colors = {
            drum: '#ff6b6b',
            synth: '#4ecdc4',
            bass: '#9b59b6',
            keys: '#f39c12',
            fx: '#3498db',
            vocal: '#e91e63',
            master: '#888'
        };

        trackEl.innerHTML = `
                    <div class="track-info">
                        <div class="track-header">
                            <div style="width: 12px; height: 12px; background: ${colors[track.type] || '#888'}; border-radius: 3px;"></div>
                            <input class="track-name" value="${track.name}" style="background: transparent; border: none; color: var(--text); font-size: 13px; width: 100px;">
                            <div class="track-controls">
                                <button class="track-btn mute-btn" title="Mute">M</button>
                                <button class="track-btn solo-btn" title="Solo">S</button>
                                <button class="track-btn delete-btn" title="Delete">×</button>
                            </div>
                        </div>
                        <div class="track-volume">
                            <span style="font-size: 10px; width: 20px;">🔊</span>
                            <input type="range" class="volume-slider" min="0" max="100" value="${track.volume * 100}">
                            <span style="font-size: 10px; width: 25px;" class="vol-display">${Math.round(track.volume * 100)}%</span>
                        </div>
                        <div class="track-volume">
                            <span style="font-size: 10px; width: 20px;">◀▶</span>
                            <input type="range" class="pan-slider" min="-100" max="100" value="${track.pan * 100}">
                            <span style="font-size: 10px; width: 25px;" class="pan-display">C</span>
                        </div>
                    </div>
                    <div class="track-content" data-track-id="${track.id}">
                        ${track.type !== 'master' && track.type !== 'vocal' ? `
                        <div class="step-grid">
                            ${Array(64).fill(0).map((_, i) => `
                                <div class="step" data-step="${i}" data-track-id="${track.id}"></div>
                            `).join('')}
                        </div>
                        ` : ''}
                    </div>
                `;

        container.appendChild(trackEl);

        // Event listeners for track
        this.setupTrackEventListeners(track, trackEl);
    }

    setupTrackEventListeners(track, trackEl) {
        // Volume
        const volSlider = trackEl.querySelector('.volume-slider');
        const volDisplay = trackEl.querySelector('.vol-display');
        volSlider.addEventListener('input', (e) => {
            track.volume = e.target.value / 100;
            volDisplay.textContent = `${e.target.value}%`;
            if (track.synth) {
                track.synth.volume.value = Tone.gainToDb(track.volume);
            }
        });

        // Pan
        const panSlider = trackEl.querySelector('.pan-slider');
        const panDisplay = trackEl.querySelector('.pan-display');
        panSlider.addEventListener('input', (e) => {
            track.pan = e.target.value / 100;
            const val = parseInt(e.target.value);
            panDisplay.textContent = val === 0 ? 'C' : (val > 0 ? `R${val}` : `L${Math.abs(val)}`);
        });

        // Mute
        const muteBtn = trackEl.querySelector('.mute-btn');
        muteBtn.addEventListener('click', () => {
            track.muted = !track.muted;
            muteBtn.classList.toggle('muted', track.muted);
            if (track.synth) {
                track.synth.volume.value = track.muted ? -Infinity : Tone.gainToDb(track.volume);
            }
        });

        // Solo
        const soloBtn = trackEl.querySelector('.solo-btn');
        soloBtn.addEventListener('click', () => {
            track.solo = !track.solo;
            soloBtn.classList.toggle('solo', track.solo);
        });

        // Delete
        const deleteBtn = trackEl.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            if (track.type === 'master') return;
            this.tracks = this.tracks.filter(t => t.id !== track.id);
            trackEl.remove();
            this.updateMixer();
        });

        // Steps
        const steps = trackEl.querySelectorAll('.step');
        steps.forEach(step => {
            step.addEventListener('click', () => {
                const stepIndex = parseInt(step.dataset.step);
                track.steps[stepIndex] = !track.steps[stepIndex];
                step.classList.toggle('active', track.steps[stepIndex]);

                // Preview sound
                if (track.steps[stepIndex] && track.synth) {
                    this.playNote(track);
                }
            });
        });

        // Track content drop zone
        const content = trackEl.querySelector('.track-content');
        content.addEventListener('dragover', (e) => e.preventDefault());
        content.addEventListener('drop', (e) => {
            e.preventDefault();
            // Handle drop of instruments
        });

        // Double click to open piano roll
        trackEl.addEventListener('dblclick', () => {
            if (track.type === 'synth' || track.type === 'bass' || track.type === 'keys') {
                this.openPianoRoll(track);
            }
        });
    }

    playNote(track, note = 'C3', duration = '8n') {
        if (!track.synth || track.muted) return;

        try {
            if (track.type === 'drum') {
                if (track.synth.triggerAttackRelease) {
                    if (track.sound === 'snare' || track.sound === 'clap' || track.sound === 'noise') {
                        track.synth.triggerAttackRelease(duration);
                    } else {
                        track.synth.triggerAttackRelease(note, duration);
                    }
                }
            } else {
                track.synth.triggerAttackRelease(note, duration);
            }
        } catch (e) {
            console.log('Note play error:', e);
        }
    }

    updateMixer() {
        const mixerContainer = document.getElementById('mixer-channels');
        mixerContainer.innerHTML = '';

        this.tracks.forEach((track, index) => {
            const channel = document.createElement('div');
            channel.className = 'mixer-channel';
            channel.innerHTML = `
                        <div class="channel-name">${track.name.substring(0, 6)}</div>
                        <div class="mixer-fader">
                            <div class="fader-track"></div>
                            <div class="fader-handle" style="top: ${100 - track.volume * 100}px;"></div>
                        </div>
                        <div class="mixer-meter">
                            <div class="meter-fill" style="height: ${track.muted ? 0 : Math.random() * 80}%;"></div>
                        </div>
                    `;
            mixerContainer.appendChild(channel);
        });
    }

    openPianoRoll(track) {
        this.selectedTrack = track;
        document.getElementById('piano-roll').classList.add('visible');
    }

    closePianoRoll() {
        document.getElementById('piano-roll').classList.remove('visible');
    }

    play() {
        if (this.isPlaying) {
            this.stop();
            return;
        }

        this.isPlaying = true;
        document.getElementById('play-btn').classList.add('active');
        document.getElementById('play-btn').textContent = '⏸';

        Tone.Transport.scheduleRepeat((time) => {
            // Play active steps (드럼 등 스텝 시퀀서)
            this.tracks.forEach(track => {
                if (track.steps[this.currentBeat] && !track.muted) {
                    this.playNote(track);
                }

                // Play piano roll notes (신디/베이스 등)
                if (track.notes && track.notes[this.currentBeat] && !track.muted) {
                    track.notes[this.currentBeat].forEach(note => {
                        this.playNote(track, note, '8n');
                    });
                }
            });

            // Update UI
            Tone.Draw.schedule(() => {
                this.updatePlayhead();
                this.highlightCurrentStep();
            }, time);

            // Advance beat
            this.currentBeat = (this.currentBeat + 1) % 64;

            // Loop
            if (this.currentBeat === 0 && !this.isLooping) {
                // Continue or stop based on loop setting
            }
        }, "16n");

        Tone.Transport.start();
    }

    stop() {
        this.isPlaying = false;
        Tone.Transport.stop();
        Tone.Transport.cancel();
        document.getElementById('play-btn').classList.remove('active');
        document.getElementById('play-btn').textContent = '▶';
    }

    rewind() {
        this.currentBeat = 0;
        this.updatePlayhead();
    }

    updatePlayhead() {
        const playhead = document.getElementById('playhead');
        const position = 200 + (this.currentBeat * 21.5); // Approximate step width
        playhead.style.left = `${position}px`;

        // Update time display
        const seconds = (this.currentBeat / (this.bpm / 60)) * 4;
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        document.getElementById('time-display').textContent =
            `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(ms).padStart(2, '0')}`;
    }

    highlightCurrentStep() {
        // Remove previous highlights
        document.querySelectorAll('.step.playing').forEach(s => s.classList.remove('playing'));

        // Add current highlight
        document.querySelectorAll(`.step[data-step="${this.currentBeat}"]`).forEach(s => {
            s.classList.add('playing');
        });
    }

    setBPM(bpm) {
        this.bpm = Math.max(40, Math.min(300, bpm));
        Tone.Transport.bpm.value = this.bpm;
    }

    toggleLoop() {
        this.isLooping = !this.isLooping;
        document.getElementById('loop-btn').classList.toggle('active', this.isLooping);
    }

    // Recording functions
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioContext = new AudioContext();
            this.analyser = this.audioContext.createAnalyser();
            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.analyser);

            this.recorder = new MediaRecorder(stream);
            this.recordedChunks = [];

            this.recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.recordedChunks.push(e.data);
                }
            };

            this.recorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                document.getElementById('recorded-audio').src = url;
                document.getElementById('recording-result').style.display = 'block';
            };

            this.recorder.start();
            this.isRecording = true;
            document.getElementById('mic-record-btn').classList.add('active');

            // Start visualization
            this.visualizeWaveform();

            // Start timer
            this.recordingStartTime = Date.now();
            this.updateRecordingTime();

        } catch (err) {
            console.error('Recording error:', err);
            this.showToast('마이크 접근 권한이 필요합니다');
        }
    }

    stopRecording() {
        if (this.recorder && this.isRecording) {
            this.recorder.stop();
            this.isRecording = false;
            document.getElementById('mic-record-btn').classList.remove('active');
        }
    }

    visualizeWaveform() {
        if (!this.isRecording) return;

        const canvas = document.getElementById('waveform-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            if (!this.isRecording) return;
            requestAnimationFrame(draw);

            this.analyser.getByteTimeDomainData(dataArray);

            ctx.fillStyle = '#0a0a0f';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ff4444';
            ctx.beginPath();

            const sliceWidth = canvas.width / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * canvas.height) / 2;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
                x += sliceWidth;
            }

            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
        };

        draw();
    }

    updateRecordingTime() {
        if (!this.isRecording) return;

        const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        document.getElementById('recording-time').textContent =
            `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        setTimeout(() => this.updateRecordingTime(), 1000);
    }

    // Project functions
    saveProject() {
        const projectData = {
            name: 'My Project',
            bpm: this.bpm,
            tracks: this.tracks.map(t => ({
                id: t.id,
                name: t.name,
                type: t.type,
                sound: t.sound,
                volume: t.volume,
                pan: t.pan,
                muted: t.muted,
                steps: t.steps,
                notes: t.notes || {}  // 피아노 롤 노트 저장
            }))
        };

        const json = JSON.stringify(projectData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'daw-project.json';
        a.click();

        this.showToast('프로젝트 저장됨');
    }

    loadProject() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    this.applyProjectData(data);
                    this.showToast('프로젝트 불러옴');
                } catch (err) {
                    this.showToast('파일 로드 실패');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    applyProjectData(data) {
        this.bpm = data.bpm || 120;
        document.getElementById('tempo-input').value = this.bpm;
        Tone.Transport.bpm.value = this.bpm;

        // Clear existing tracks
        document.getElementById('tracks-container').innerHTML = '';
        this.tracks = [];

        // Recreate tracks
        data.tracks.forEach(t => {
            const track = this.addTrack(t.name, t.type, t.sound);
            track.volume = t.volume;
            track.pan = t.pan;
            track.muted = t.muted;
            track.steps = t.steps || new Array(64).fill(false);
            track.notes = t.notes || {};  // 피아노 롤 노트 복원

            // Update UI
            const trackEl = document.getElementById(track.id);
            if (trackEl) {
                track.steps.forEach((active, i) => {
                    const step = trackEl.querySelector(`.step[data-step="${i}"]`);
                    if (step && active) {
                        step.classList.add('active');
                    }
                });
            }
        });

        this.updateMixer();
    }

    async exportAudio() {
        // 트랙이 있는지 확인
        const activeTracks = this.tracks.filter(t => t.type !== 'master' && t.steps.some(s => s));
        if (activeTracks.length === 0) {
            this.showToast('내보낼 트랙이 없습니다. 먼저 비트를 만들어주세요!');
            return;
        }

        this.showLoading('🎵 오디오 렌더링 중... (잠시만 기다려주세요)');

        try {
            // 렌더링 시간 계산 (초)
            const totalBeats = 64;
            const secondsPerBeat = 60 / this.bpm / 4; // 16n = 1/4 beat
            const duration = totalBeats * secondsPerBeat;

            // Offline Context 생성
            const offlineCtx = new OfflineAudioContext(2, 44100 * duration, 44100);

            // 각 트랙의 노트 스케줄링
            const notePromises = [];

            for (const track of activeTracks) {
                for (let beat = 0; beat < 64; beat++) {
                    if (track.steps[beat]) {
                        const time = beat * secondsPerBeat;

                        // 간단한 오실레이터로 사운드 생성
                        const osc = offlineCtx.createOscillator();
                        const gain = offlineCtx.createGain();

                        // 트랙 타입에 따른 사운드 설정
                        if (track.type === 'drum') {
                            if (track.sound === 'kick') {
                                osc.type = 'sine';
                                osc.frequency.setValueAtTime(150, time);
                                osc.frequency.exponentialRampToValueAtTime(30, time + 0.1);
                                gain.gain.setValueAtTime(0.8, time);
                                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
                            } else if (track.sound === 'snare' || track.sound === 'hihat') {
                                // 노이즈 대신 고주파
                                osc.type = 'square';
                                osc.frequency.setValueAtTime(track.sound === 'hihat' ? 8000 : 200, time);
                                gain.gain.setValueAtTime(0.3, time);
                                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
                            } else {
                                osc.type = 'sine';
                                osc.frequency.setValueAtTime(100, time);
                                gain.gain.setValueAtTime(0.5, time);
                                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
                            }
                        } else if (track.type === 'bass') {
                            osc.type = 'sawtooth';
                            osc.frequency.setValueAtTime(55, time); // A1
                            gain.gain.setValueAtTime(0.4, time);
                            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
                        } else {
                            // synth, keys
                            osc.type = 'sawtooth';
                            osc.frequency.setValueAtTime(261.63, time); // C4
                            gain.gain.setValueAtTime(0.3 * track.volume, time);
                            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
                        }

                        osc.connect(gain);
                        gain.connect(offlineCtx.destination);
                        osc.start(time);
                        osc.stop(time + 0.5);
                    }
                }
            }

            // 렌더링 실행
            const renderedBuffer = await offlineCtx.startRendering();

            // WAV 파일로 변환
            const wav = this.audioBufferToWav(renderedBuffer);
            const blob = new Blob([wav], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);

            // 다운로드
            const a = document.createElement('a');
            a.href = url;
            a.download = `daw-export-${Date.now()}.wav`;
            a.click();

            this.hideLoading();
            this.showToast('✅ WAV 파일 내보내기 완료!');

        } catch (err) {
            console.error('Export error:', err);
            this.hideLoading();
            this.showToast('❌ 내보내기 실패: ' + err.message);
        }
    }

    // AudioBuffer를 WAV로 변환
    audioBufferToWav(buffer) {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;

        const bytesPerSample = bitDepth / 8;
        const blockAlign = numChannels * bytesPerSample;

        const data = [];
        for (let channel = 0; channel < numChannels; channel++) {
            data.push(buffer.getChannelData(channel));
        }

        const samples = buffer.length;
        const dataSize = samples * blockAlign;
        const bufferSize = 44 + dataSize;

        const arrayBuffer = new ArrayBuffer(bufferSize);
        const view = new DataView(arrayBuffer);

        // WAV 헤더 작성
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        this.writeString(view, 8, 'WAVE');
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        this.writeString(view, 36, 'data');
        view.setUint32(40, dataSize, true);

        // 오디오 데이터 작성 (인터리브)
        let offset = 44;
        for (let i = 0; i < samples; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                let sample = data[channel][i];
                sample = Math.max(-1, Math.min(1, sample));
                sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(offset, sample, true);
                offset += 2;
            }
        }

        return arrayBuffer;
    }

    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    // Utility functions
    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    showLoading(text) {
        document.getElementById('loading-text').textContent = text;
        document.getElementById('loading-overlay').classList.add('active');
    }

    hideLoading() {
        document.getElementById('loading-overlay').classList.remove('active');
    }

    setupEventListeners() {
        // Transport
        document.getElementById('play-btn').addEventListener('click', () => this.play());
        document.getElementById('rewind-btn').addEventListener('click', () => this.rewind());
        document.getElementById('loop-btn').addEventListener('click', () => this.toggleLoop());
        document.getElementById('record-btn').addEventListener('click', () => {
            if (this.isRecording) {
                this.stopRecording();
            } else {
                document.querySelector('[data-tab="record"]').click();
                this.startRecording();
            }
        });

        // BPM
        document.getElementById('tempo-input').addEventListener('change', (e) => {
            this.setBPM(parseInt(e.target.value));
        });

        // Project buttons
        document.getElementById('save-btn').addEventListener('click', () => this.saveProject());
        document.getElementById('load-btn').addEventListener('click', () => this.loadProject());
        document.getElementById('export-btn').addEventListener('click', () => this.exportAudio());

        // Tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
            });
        });

        // Add track button
        document.getElementById('add-track-btn').addEventListener('click', () => {
            const name = `Track ${this.tracks.length}`;
            this.addTrack(name, 'synth', 'synth');
        });

        // Drag and drop instruments
        document.querySelectorAll('.instrument-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('type', item.dataset.type);
                e.dataTransfer.setData('sound', item.dataset.sound);
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });

            // Click to add track
            item.addEventListener('click', () => {
                const name = item.querySelector('span').textContent;
                this.addTrack(name, item.dataset.type, item.dataset.sound);
            });
        });

        // Recording controls
        document.getElementById('mic-record-btn').addEventListener('click', () => {
            if (this.isRecording) {
                this.stopRecording();
            } else {
                this.startRecording();
            }
        });

        document.getElementById('mic-stop-btn').addEventListener('click', () => {
            this.stopRecording();
        });

        document.getElementById('mic-play-btn').addEventListener('click', () => {
            const audio = document.getElementById('recorded-audio');
            if (audio.src) {
                audio.play();
            }
        });

        // File upload
        const uploadSection = document.getElementById('upload-section');
        const fileInput = document.getElementById('file-input');

        uploadSection.addEventListener('click', () => fileInput.click());
        uploadSection.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadSection.classList.add('dragover');
        });
        uploadSection.addEventListener('dragleave', () => {
            uploadSection.classList.remove('dragover');
        });
        uploadSection.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadSection.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleAudioUpload(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleAudioUpload(e.target.files[0]);
            }
        });

        // Piano roll
        document.getElementById('close-piano-roll').addEventListener('click', () => {
            this.closePianoRoll();
        });

        // Piano roll cells
        document.getElementById('piano-grid').addEventListener('click', (e) => {
            if (e.target.classList.contains('grid-cell')) {
                const note = e.target.dataset.note;
                const beat = parseInt(e.target.dataset.beat);

                // Toggle note visual
                const isActive = e.target.classList.toggle('note-active');

                // Save note to track
                if (this.selectedTrack) {
                    if (!this.selectedTrack.notes) {
                        this.selectedTrack.notes = {};
                    }

                    if (isActive) {
                        // 노트 추가
                        if (!this.selectedTrack.notes[beat]) {
                            this.selectedTrack.notes[beat] = [];
                        }
                        if (!this.selectedTrack.notes[beat].includes(note)) {
                            this.selectedTrack.notes[beat].push(note);
                        }
                    } else {
                        // 노트 제거
                        if (this.selectedTrack.notes[beat]) {
                            this.selectedTrack.notes[beat] = this.selectedTrack.notes[beat].filter(n => n !== note);
                            if (this.selectedTrack.notes[beat].length === 0) {
                                delete this.selectedTrack.notes[beat];
                            }
                        }
                    }

                    console.log('Notes saved:', this.selectedTrack.notes);
                }

                // Play preview
                if (this.selectedTrack && this.selectedTrack.synth) {
                    try {
                        this.selectedTrack.synth.triggerAttackRelease(note, '8n');
                    } catch (err) { }
                }
            }
        });

        // Piano keys preview
        document.getElementById('piano-keys').addEventListener('click', (e) => {
            if (e.target.classList.contains('piano-key')) {
                const note = e.target.dataset.note;
                if (this.selectedTrack && this.selectedTrack.synth) {
                    try {
                        this.selectedTrack.synth.triggerAttackRelease(note, '8n');
                    } catch (err) { }
                }
            }
        });

        // Effect toggles
        document.querySelectorAll('.effect-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                toggle.classList.toggle('active');
                const effect = toggle.dataset.effect;
                this.toggleEffect(effect, toggle.classList.contains('active'));
            });
        });

        // Knobs (simplified - just click to change)
        document.querySelectorAll('.knob').forEach(knob => {
            knob.addEventListener('click', () => {
                const currentValue = parseInt(knob.dataset.value);
                const newValue = (currentValue + 20) % 100;
                knob.dataset.value = newValue;
                const valueDisplay = knob.parentElement.querySelector('.knob-value');
                if (valueDisplay) {
                    valueDisplay.textContent = `${newValue}%`;
                }
                knob.style.background = `conic-gradient(from 135deg, var(--accent) ${newValue * 2.7}deg, var(--border) 0deg)`;
            });
        });

        // Wave buttons for oscillators
        document.querySelectorAll('.osc-wave-select').forEach(selector => {
            selector.querySelectorAll('.wave-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    selector.querySelectorAll('.wave-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });
        });

        // AI Vocal generation
        document.getElementById('generate-vocal-btn').addEventListener('click', () => {
            this.generateAIVocal();
        });

        // Add recording to track
        document.getElementById('add-recording-track').addEventListener('click', () => {
            const audio = document.getElementById('recorded-audio');
            if (audio.src) {
                const track = this.addTrack('Recording', 'vocal', 'recording');
                track.audioUrl = audio.src;
                this.showToast('녹음이 트랙에 추가되었습니다');
            }
        });

        // Download recording
        document.getElementById('download-recording').addEventListener('click', () => {
            const audio = document.getElementById('recorded-audio');
            if (audio.src) {
                const a = document.createElement('a');
                a.href = audio.src;
                a.download = 'recording.webm';
                a.click();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    this.play();
                    break;
                case 'Enter':
                    e.preventDefault();
                    this.rewind();
                    break;
                case 'KeyR':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        document.getElementById('record-btn').click();
                    }
                    break;
                case 'KeyS':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.saveProject();
                    }
                    break;
            }
        });
    }

    toggleEffect(effect, enabled) {
        switch (effect) {
            case 'reverb':
                this.reverb.wet.value = enabled ? 0.3 : 0;
                break;
            case 'delay':
                this.delay.wet.value = enabled ? 0.25 : 0;
                break;
            case 'distortion':
                this.distortion.wet.value = enabled ? 0.5 : 0;
                break;
            case 'compressor':
                // Compressor always on but can be bypassed
                break;
        }
    }

    handleAudioUpload(file) {
        if (!file.type.startsWith('audio/')) {
            this.showToast('오디오 파일만 업로드 가능합니다');
            return;
        }

        const url = URL.createObjectURL(file);
        const track = this.addTrack(file.name.substring(0, 20), 'vocal', 'upload');
        track.audioUrl = url;

        // Create player for uploaded audio
        track.player = new Tone.Player(url).toDestination();

        this.showToast('오디오 파일이 추가되었습니다');
    }

    async generateAIVocal() {
        const lyrics = document.getElementById('lyrics-input').value.trim();
        if (!lyrics) {
            this.showToast('가사를 입력해주세요');
            return;
        }

        const style = document.getElementById('vocal-style').value;
        const voiceType = document.getElementById('voice-type').value;

        this.showLoading('🎤 AI 보컬 생성 중... (1~3분 소요)');

        // Suno API로 보컬 생성
        const prompt = `${style} vocal, ${voiceType}`;
        const response = await sunoAPI.generateMusic(prompt, style, lyrics, false);

        if (!response.success) {
            this.hideLoading();
            this.showToast('❌ 오류: ' + response.error);
            return;
        }

        const taskId = response.taskId;
        let attempts = 0;
        const maxAttempts = 90;

        const checkLoop = async () => {
            attempts++;
            const status = await sunoAPI.checkStatus(taskId);

            if (status.status === 'completed' && status.audioUrl) {
                this.hideLoading();
                this.showToast('✅ AI 보컬 생성 완료!');

                // 결과 표시
                const resultDiv = document.getElementById('vocal-result');
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `
                            <div style="font-size: 12px; color: var(--text-dim); margin-bottom: 10px;">생성된 보컬</div>
                            <audio id="vocal-audio" controls style="width: 100%;" src="${status.audioUrl}"></audio>
                            <div style="display: flex; gap: 10px; margin-top: 10px;">
                                <button onclick="daw.addVocalToTrack('${status.audioUrl}')" style="
                                    flex: 1; padding: 8px 16px; background: var(--accent); border: none; 
                                    border-radius: 4px; color: var(--bg-dark); cursor: pointer;
                                ">트랙에 추가</button>
                                <a href="${status.audioUrl}" download="ai_vocal.mp3" style="
                                    flex: 1; padding: 8px 16px; background: var(--bg-panel); border: 1px solid var(--border);
                                    border-radius: 4px; color: var(--text); text-decoration: none; text-align: center;
                                ">다운로드</a>
                            </div>
                        `;
            } else if (status.status === 'failed') {
                this.hideLoading();
                this.showToast('❌ 생성 실패: ' + (status.error || '알 수 없는 오류'));
            } else if (attempts >= maxAttempts) {
                this.hideLoading();
                this.showToast('⏱️ 시간 초과');
            } else {
                setTimeout(checkLoop, 5000);
            }
        };

        setTimeout(checkLoop, 5000);
    }

    addVocalToTrack(audioUrl) {
        const track = this.addTrack('AI Vocal', 'vocal', 'aivocal');
        track.audioUrl = audioUrl;
        track.player = new Tone.Player(audioUrl).toDestination();
        this.showToast('보컬이 트랙에 추가되었습니다');
    }
}

// Initialize DAW
const daw = new DAWPro();
window.daw = daw;  // 전역 접근 가능하게
console.log('DAW Pro loaded - window.daw available');

// 첫 클릭 시 오디오 컨텍스트 시작 (브라우저 정책 우회)
document.body.addEventListener('click', async function initAudio() {
    await Tone.start();
    console.log('Audio context started');
    document.body.removeEventListener('click', initAudio);
}, { once: true });

// Animate mixer meters
setInterval(() => {
    document.querySelectorAll('.meter-fill').forEach(meter => {
        if (daw.isPlaying) {
            meter.style.height = `${20 + Math.random() * 60}%`;
        } else {
            meter.style.height = '5%';
        }
    });
}, 100);
