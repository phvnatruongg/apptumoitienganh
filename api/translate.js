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
    const PIXABAY_KEY = '56753602-ea75e73c98316218e67432c1e';

    const prompt = `Bạn là một giáo viên tiếng Anh sáng tạo, hài hước, chuyên nghĩ ra mẹo nhớ từ vựng "không đụng hàng" cho học sinh Việt Nam.

Phân tích từ tiếng Anh "${word}" và trả về DUY NHẤT một object JSON đúng cấu trúc sau (không thêm chữ hay markdown nào khác ngoài JSON):
{
  "word": "${word}",
  "type": "noun/verb/adjective",
  "vietnamese": "nghĩa tiếng Việt chuẩn xác nhất, ngắn gọn",
  "mnemonic": "một mẹo nhớ SÁNG TẠO, VUI, DỄ HÌNH DUNG - có thể chơi chữ theo cách phát âm nghe giống tiếng Việt, hoặc một hình ảnh/liên tưởng bất ngờ, hài hước gắn với nghĩa của từ. TUYỆT ĐỐI KHÔNG viết theo kiểu công thức khô khan như 'Nhớ từ X gắn liền với nghĩa Y'. Hãy viết như đang kể một câu chuyện/liên tưởng ngắn 1-2 câu.",
  "examples": [
    "Một câu ví dụ tiếng Anh tự nhiên, đời thường, có ngữ cảnh cụ thể (không phải câu mẫu chung chung như 'I study the word') - nghĩa tiếng Việt của câu đó",
    "Một câu ví dụ tiếng Anh KHÁC hẳn ngữ cảnh với câu 1 ở trên - nghĩa tiếng Việt của câu đó"
  ],
  "image_url": ""
}

Lưu ý bắt buộc về định dạng mỗi phần tử trong "examples": viết đúng theo mẫu "Câu tiếng Anh - Nghĩa tiếng Việt của câu đó", dùng dấu gạch ngang " - " để phân tách, không dùng dấu ngoặc hay ký hiệu khác.

Không viết bất kỳ chữ hay khối markdown nào bên ngoài JSON.`;

    try {
        // 1. Gọi Groq API — temperature cao hơn để mẹo nhớ và ví dụ đa dạng, sáng tạo, không lặp công thức
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey.trim()}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.95,
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
                parsedResult.image_url = "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=600";
            }
        } catch (imgErr) {
            parsedResult.image_url = "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=600";
        }

        return res.status(200).json(parsedResult);
    } catch (err) {
        console.error("Translation API Error:", err);
        return res.status(500).json({ error: `Lỗi xử lý AI: ${err.message}` });
    }
}
