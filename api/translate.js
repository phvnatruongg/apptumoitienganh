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

    const prompt = `Phân tích từ tiếng Anh "${word}" và trả về kết quả dạng JSON thuần túy (không kèm markdown như \`\`\`json) với cấu trúc chính xác sau:
{
  "word": "${word}",
  "type": "loại từ (noun, verb, adj, adv...)",
  "vietnamese": "nghĩa tiếng Việt chuẩn xác",
  "mnemonic": "mẹo ghi nhớ siêu tốc, hài hước bằng tiếng Việt",
  "examples": [
    "Câu ví dụ tiếng Anh 1 kèm nghĩa tiếng Việt",
    "Câu ví dụ tiếng Anh 2 kèm nghĩa tiếng Việt"
  ],
  "image_url": "https://source.unsplash.com/featured/?${encodeURIComponent(word)}"
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
        if (data.error) throw new Error(data.error.message);

        const candidateText = data.choices?.[0]?.message?.content;
        let cleanJSON = candidateText.trim();
        if (cleanJSON.startsWith('```json')) cleanJSON = cleanJSON.replace(/^```json/, '').replace(/```$/, '').trim();
        else if (cleanJSON.startsWith('```')) cleanJSON = cleanJSON.replace(/^```/, '').replace(/```$/, '').trim();

        return res.status(200).json(JSON.parse(cleanJSON));
    } catch (err) {
        return res.status(500).json({ error: `Lỗi xử lý AI: ${err.message}` });
    }
}
