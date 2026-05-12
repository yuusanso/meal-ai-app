const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
// Increase JSON payload size limit for base64 images
app.use(express.json({ limit: '10mb' }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to analyze the image using Gemini API
app.post('/api/analyze', async (req, res) => {
    try {
        const { imageBase64, mimeType } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: '画像データがありません。' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
            return res.status(500).json({ error: 'サーバーにAPIキーが設定されていません。開発者にお問い合わせください。' });
        }

        const requestBody = {
            contents: [{
                parts: [
                    { text: `この写真に写っている料理の名前と、一般的な1人前あたりのカロリー(kcal)、タンパク質(g)、炭水化物(g)を推測してください。
以下の厳密なJSON形式のみを出力してください（Markdownのバッククォートなどは含めないでください）。
{
  "name": "料理名",
  "cal": 500,
  "pro": 20,
  "carb": 50
}` },
                    {
                        inline_data: {
                            mime_type: mimeType || 'image/jpeg',
                            data: imageBase64
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.2,
                response_mime_type: "application/json"
            }
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API通信エラーが発生しました');
        }

        const data = await response.json();
        const textResult = data.candidates[0].content.parts[0].text;
        
        let parsedResult;
        try {
            parsedResult = JSON.parse(textResult);
        } catch (e) {
            const cleaned = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
            parsedResult = JSON.parse(cleaned);
        }

        res.json(parsedResult);

    } catch (error) {
        console.error("Analysis Error:", error);
        res.status(500).json({ error: error.message || '内部サーバーエラーが発生しました。' });
    }
});

// Fallback to index.html for any other route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
