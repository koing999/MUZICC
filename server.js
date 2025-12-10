const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const app = express();

app.use(express.static('public'));
app.use(express.json({ limit: '50mb' }));

// Generated files directory
const MUSIC_OUTPUT = path.join(__dirname, '..', 'ai-music-studio', 'music_input');
if (!fs.existsSync(MUSIC_OUTPUT)) {
    fs.mkdirSync(MUSIC_OUTPUT, { recursive: true });
}

// Suno API Settings (GoAPI)
const GOAPI_KEY = 'e6a7b1efeeb7472fd5d69e4ad7a68b843ae95e69fe599d568dcc3393ee129b0d';
const GOAPI_URL = 'https://api.goapi.ai/api/v1/task';

// Generate music with Suno API
app.post('/api/generate-music', async (req, res) => {
    const { prompt, style, lyrics, instrumental } = req.body;

    try {
        const fetch = (await import('node-fetch')).default;

        const data = {
            model: 'music-s',
            task_type: 'generate_music',
            input: {
                gpt_description_prompt: `${style || 'pop'}, ${prompt}`,
                lyrics: lyrics || '',
                lyrics_type: instrumental ? 'instrumental' : (lyrics ? 'user' : 'generate')
            }
        };

        const response = await fetch(GOAPI_URL, {
            method: 'POST',
            headers: {
                'X-API-Key': GOAPI_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.status === 503) {
            return res.json({
                success: false,
                error: 'Suno API 점검 중입니다. 잠시 후 다시 시도해주세요.'
            });
        }

        const taskId = result.data?.task_id || result.task_id;

        if (!taskId) {
            return res.json({ success: false, error: 'Task ID not received', raw: result });
        }

        res.json({ success: true, taskId, message: '음악 생성 시작됨' });

    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Check generation status
app.get('/api/status/:taskId', async (req, res) => {
    const { taskId } = req.params;

    try {
        const fetch = (await import('node-fetch')).default;

        const response = await fetch(`${GOAPI_URL}/${taskId}`, {
            headers: { 'X-API-Key': GOAPI_KEY }
        });

        const result = await response.json();
        const status = result.data?.status || result.status;

        if (status === 'completed' || status === 'success') {
            // Extract audio URL
            const clips = result.data?.clips || [];
            const output = result.data?.output;

            let audioUrl = null;
            if (clips.length > 0) {
                audioUrl = clips[0].audio_url;
            } else if (output) {
                audioUrl = output.audio_url || output.url;
            }

            res.json({
                success: true,
                status: 'completed',
                audioUrl,
                title: clips[0]?.title || 'Generated Music'
            });
        } else if (status === 'failed') {
            res.json({ success: false, status: 'failed', error: result.data?.error });
        } else {
            res.json({ success: true, status: status || 'processing' });
        }

    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Download and save to YouTube upload folder
app.post('/api/save-for-youtube', async (req, res) => {
    const { audioUrl, title } = req.body;

    try {
        const fetch = (await import('node-fetch')).default;

        const response = await fetch(audioUrl);
        const buffer = await response.buffer();

        const filename = `${title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${Date.now()}.mp3`;
        const filepath = path.join(MUSIC_OUTPUT, filename);

        fs.writeFileSync(filepath, buffer);

        res.json({
            success: true,
            message: 'YouTube 업로드 폴더에 저장됨! 자동 업로드 시작됩니다.',
            filepath
        });

    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Export project as audio
app.post('/api/export', (req, res) => {
    const { projectData, format = 'wav' } = req.body;
    res.json({ success: true, message: 'Export started', format });
});

// Save project
app.post('/api/save-project', (req, res) => {
    const projectData = req.body;
    const filename = `project_${Date.now()}.json`;
    const filepath = path.join(__dirname, 'projects', filename);

    if (!fs.existsSync(path.join(__dirname, 'projects'))) {
        fs.mkdirSync(path.join(__dirname, 'projects'));
    }

    fs.writeFileSync(filepath, JSON.stringify(projectData, null, 2));
    res.json({ success: true, filepath });
});

// List saved projects
app.get('/api/projects', (req, res) => {
    const projectsDir = path.join(__dirname, 'projects');
    if (!fs.existsSync(projectsDir)) {
        return res.json([]);
    }
    const files = fs.readdirSync(projectsDir).filter(f => f.endsWith('.json'));
    res.json(files);
});

// YouTube 업로드 상태 확인
app.get('/api/youtube/status', (req, res) => {
    const uploaderPath = path.join(__dirname, '..', 'ai-music-studio', 'youtube_uploader.py');
    const clientSecretPath = path.join(__dirname, '..', 'ai-music-studio', 'client_secret.json');

    const status = {
        uploaderExists: fs.existsSync(uploaderPath),
        clientSecretExists: fs.existsSync(clientSecretPath),
        musicInputDir: MUSIC_OUTPUT,
        ready: fs.existsSync(uploaderPath) && fs.existsSync(clientSecretPath)
    };

    res.json(status);
});

// YouTube 업로드 실행
app.post('/api/youtube/upload', async (req, res) => {
    const { audioPath, title } = req.body;

    if (!audioPath) {
        return res.json({ success: false, error: '오디오 파일 경로가 필요합니다' });
    }

    const uploaderPath = path.join(__dirname, '..', 'ai-music-studio', 'youtube_uploader.py');

    if (!fs.existsSync(uploaderPath)) {
        return res.json({ success: false, error: 'YouTube 업로더가 없습니다' });
    }

    try {
        const { spawn } = require('child_process');
        const args = [uploaderPath, audioPath];
        if (title) args.push(title);

        const process = spawn('python', args, {
            cwd: path.join(__dirname, '..', 'ai-music-studio')
        });

        let output = '';
        let error = '';

        process.stdout.on('data', (data) => {
            output += data.toString();
            console.log('YouTube Upload:', data.toString());
        });

        process.stderr.on('data', (data) => {
            error += data.toString();
            console.error('YouTube Upload Error:', data.toString());
        });

        process.on('close', (code) => {
            if (code === 0 && output.includes('youtube.com')) {
                const match = output.match(/https:\/\/youtube\.com\/watch\?v=[\w-]+/);
                res.json({
                    success: true,
                    url: match ? match[0] : null,
                    message: '업로드 완료!'
                });
            } else {
                res.json({ success: false, error: error || '업로드 실패' });
            }
        });

    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// music_input 폴더의 파일 목록 (YouTube 업로드 대기 파일)
app.get('/api/youtube/pending', (req, res) => {
    if (!fs.existsSync(MUSIC_OUTPUT)) {
        return res.json([]);
    }

    const files = fs.readdirSync(MUSIC_OUTPUT)
        .filter(f => f.endsWith('.mp3') || f.endsWith('.wav'))
        .map(f => ({
            name: f,
            path: path.join(MUSIC_OUTPUT, f),
            size: fs.statSync(path.join(MUSIC_OUTPUT, f)).size
        }));

    res.json(files);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log('🎹 DAW Pro - AI Music Studio');
    console.log('='.repeat(50));
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`📁 YouTube 업로드 폴더: ${MUSIC_OUTPUT}`);
    console.log('='.repeat(50));
});
