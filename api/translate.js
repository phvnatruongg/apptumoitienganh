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

    const prompt = `Phân tích từ tiếng Anh "${word}" và trả về kết quả dạng JSON thuần túy (không kèm markdown như \`\`\`json, không kèm chữ thừa) với cấu trúc chính xác sau:
{
  "word": "${word}",
  "type": "loại từ (noun, verb, adj, adv...)",
  "vietnamese": "nghĩa tiếng Việt chuẩn xác",
  "mnemonic": "mẹo ghi nhớ siêu tốc, hài hước hoặc liên tưởng thú vị bằng tiếng Việt",
  "examples": [
    "Câu ví dụ tiếng Anh 1 kèm nghĩa tiếng Việt",
    "Câu ví dụ tiếng Anh 2 kèm nghĩa tiếng Việt"
  ],
  "image_url": "https://images.unsplash.com/photo-1546410531-bb4caa6b424d"
}`;

    try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                response_format: { type: "json_object" }
            })
        });

        const data = await groqRes.json();
        
        if (data.error) {
            throw new Error(data.error.message || 'Lỗi từ Groq API');
        }

        const candidateText = data.choices?.[0]?.message?.content;
        if (!candidateText) {
            throw new Error('Groq AI không trả về dữ liệu phản hồi.');
        }

        let cleanJSON = candidateText.trim();
        if (cleanJSON.startsWith('```json')) {
            cleanJSON = cleanJSON.replace(/^```json/, '').replace(/```$/, '').trim();
        } else if (cleanJSON.startsWith('```')) {
            cleanJSON = cleanJSON.replace(/^```/, '').replace(/```$/, '').trim();
        }

        const parsedResult = JSON.parse(cleanJSON);
        return res.status(200).json(parsedResult);

    } catch (err) {
        console.error("Translation API Error:", err);
        return res.status(500).json({ error: `Lỗi xử lý AI: ${err.message}` });
    }
}
