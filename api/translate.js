export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { word } = req.body;
    if (!word) {
        return res.status(400).json({ error: 'Thiếu từ cần tra!' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Chưa cấu hình GROQ_API_KEY trên Vercel!' });
    }

    const PIXABAY_KEY = '56753602-ea75e73c98316218e67432c1e';[cite: 4]

    const prompt = `Analyze the English word "${word}". Return a JSON object with this exact structure:
{
  "word": "${word}",
  "type": "noun/verb/adjective",
  "vietnamese": "nghĩa tiếng Việt chuẩn xác nhất",
  "mnemonic": "mẹo nhớ từ vui bằng tiếng Việt dựa trên phát âm hoặc ý nghĩa đặc trưng",
  "examples": [
    "Ví dụ 1 bằng tiếng Anh kèm nghĩa tiếng Việt",
    "Ví dụ 2 bằng tiếng Anh kèm nghĩa tiếng Việt"
  ],
  "image_url": ""
}
Do not write any text or markdown code blocks outside JSON.`;

    try {
        // 1. Gọi Groq API
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey.trim()}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2,
                response_format: { type: "json_object" }
            })
        });

        const data = await groqRes.json();

        if (!groqRes.ok || data.error) {
            const errorMsg = data.error?.message || (typeof data.error === 'string' ? data.error : 'Lỗi từ Groq API');
            return res.status(groqRes.status || 500).json({ error: `Lỗi xử lý AI: ${errorMsg}` });
        }

        let candidateText = data.choices?.[0]?.message?.content;
        if (!candidateText) {
            return res.status(500).json({ error: 'Groq AI không trả về dữ liệu phản hồi.' });
        }

        let cleanJSON = candidateText.trim();
        if (cleanJSON.startsWith('```json')) {
            cleanJSON = cleanJSON.replace(/^```json/, '').replace(/```$/, '').trim();
        } else if (cleanJSON.startsWith('```')) {
            cleanJSON = cleanJSON.replace(/^```/, '').replace(/```$/, '').trim();
        }

        const parsedResult = JSON.parse(cleanJSON);

        // 2. Lấy hình ảnh từ Pixabay API
        try {
            const query = encodeURIComponent(word.trim().toLowerCase());
            const pixabayUrl = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${query}&image_type=photo&per_page=3`;
            
            const pixabayResponse = await fetch(pixabayUrl);
            const pixabayData = await pixabayResponse.json();
            
            if (pixabayData.hits && pixabayData.hits.length > 0) {
                parsedResult.image_url = pixabayData.hits[0].webformatURL;
            } else {
                parsedResult.image_url = "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=600";[cite: 4]
            }
        } catch (imgErr) {
            parsedResult.image_url = "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=600";[cite: 4]
        }

        return res.status(200).json(parsedResult);

    } catch (err) {
        console.error("Translation API Error:", err);
        return res.status(500).json({ error: `Lỗi xử lý AI: ${err.message}` });
    }
}
