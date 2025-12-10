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

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log('🎹 DAW Pro - AI Music Studio');
    console.log('='.repeat(50));
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`📁 YouTube 업로드 폴더: ${MUSIC_OUTPUT}`);
    console.log('='.repeat(50));
});
