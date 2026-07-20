const express = require('express');
const cors = require('cors');
const path = require('path'); // 1. THÊM THƯ VIỆN ĐỂ XỬ LÝ ĐƯỜNG DẪN FILE
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 2. BẮT BUỘC: Cấu hình cho Server phục vụ các file tĩnh trong thư mục gốc (index.html, manifest.json, sw.js, icon.png...)
app.use(express.static(__dirname));

// 🛠️ KEY PIXABAY CỦA BẠN:
const PIXABAY_KEY = '56753602-ea75e73c98316218e67432c1e'; 

app.post('/api/translate', async (req, res) => {
    const { word } = req.body;

    if (!word) {
        return res.status(400).json({ error: 'Vui lòng nhập từ!' });
    }

    try {
        const prompt = `Analyze the English word "${word}". Return a JSON object with this exact structure:
        {
          "word": "${word}",
          "type": "noun/verb/adjective",
          "vietnamese": "nghĩa tiếng Việt chuẩn xác nhất (ví dụ 'honey badger' phải là 'lửng mật')",
          "mnemonic": "mẹo nhớ từ vui bằng tiếng Việt dựa trên phát âm hoặc ý nghĩa đặc trưng của từ",
          "examples": ["Ví dụ 1 bằng tiếng Việt", "Ví dụ 2 bằng tiếng Việt"],
          "image_url": ""
        }
        Do not write any text or markdown code blocks outside JSON.`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant', 
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1, 
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(JSON.stringify(data.error));

        let rawText = data.choices[0].message.content.trim();
        const cleanJson = JSON.parse(rawText);
        
        try {
            const query = encodeURIComponent(word.trim().toLowerCase());
            const pixabayUrl = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${query}&image_type=photo&per_page=3`;
            
            const pixabayResponse = await fetch(pixabayUrl);
            const pixabayData = await pixabayResponse.json();
            
            if (pixabayData.hits && pixabayData.hits.length > 0) {
                cleanJson.image_url = pixabayData.hits[0].webformatURL;
            } else {
                cleanJson.image_url = "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=600";
            }
        } catch (imgErr) {
            cleanJson.image_url = "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=600";
        }

        res.json(cleanJson);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: `Lỗi xử lý hệ thống: ${error.message}` });
    }
});

// 3. BẮT BUỘC: Khi người dùng truy cập vào link web, tự động gửi file giao diện index.html về trình duyệt
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server Game đang chạy tại cổng ${PORT}`));
