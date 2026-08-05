const cache = new Map();
const pending = new Map();

const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 ngày

const DEFAULT_IMAGE =
    "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=600";

function cleanAIResponse(text) {
    let clean = text.trim();

    if (clean.startsWith("```json")) {
        clean = clean.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (clean.startsWith("```")) {
        clean = clean.replace(/^```/, "").replace(/```$/, "").trim();
    }

    return JSON.parse(clean);
}

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { word } = req.body;

    if (!word) {
        return res.status(400).json({
            error: "Thiếu từ cần tra!"
        });
    }

    const key = word.trim().toLowerCase();

    // ===== CACHE =====

    const cached = cache.get(key);

    if (cached && Date.now() - cached.time < CACHE_TTL) {
        return res.status(200).json(cached.data);
    }

    // ===== Nếu đang có request cùng từ =====

    if (pending.has(key)) {
        const result = await pending.get(key);
        return res.status(200).json(result);
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({
            error: "Chưa cấu hình GROQ_API_KEY!"
        });
    }

    const PIXABAY_KEY = "56753602-ea75e73c98316218e67432c1e";

    const prompt = `Bạn là một giáo viên tiếng Anh sáng tạo, hài hước, chuyên nghĩ ra mẹo nhớ từ vựng "không đụng hàng" cho học sinh Việt Nam.

Phân tích từ "${word}" và chỉ trả về JSON:

{
  "word":"${word}",
  "type":"noun/verb/adjective",
  "vietnamese":"",
  "mnemonic":"",
  "examples":[
    "English - Tiếng Việt",
    "English - Tiếng Việt"
  ],
  "image_url":""
}`;

    const task = (async () => {

        // Chạy song song
        const groqPromise = fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey.trim()}`
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.5,
                    response_format: {
                        type: "json_object"
                    }
                })
            }
        );

        const pixabayPromise = fetch(
            `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(
                key
            )}&image_type=photo&per_page=3`
        );

        const [groqRes, pixabayRes] = await Promise.all([
            groqPromise,
            pixabayPromise
        ]);

        const groqData = await groqRes.json();

        if (!groqRes.ok || groqData.error) {

            throw new Error(
                groqData.error?.message ||
                "Groq API Error"
            );

        }

        const aiContent =
            groqData.choices?.[0]?.message?.content;

        if (!aiContent) {
            throw new Error("Groq không trả dữ liệu.");
        }

        const result = cleanAIResponse(aiContent);

        try {

            const pixabayData = await pixabayRes.json();

            if (
                pixabayData.hits &&
                pixabayData.hits.length
            ) {

                result.image_url =
                    pixabayData.hits[0].webformatURL;

            } else {

                result.image_url = DEFAULT_IMAGE;

            }

        } catch {

            result.image_url = DEFAULT_IMAGE;

        }

        cache.set(key, {
            data: result,
            time: Date.now()
        });

        return result;
    })();

    pending.set(key, task);

    try {

        const result = await task;

        return res.status(200).json(result);

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            error: err.message
        });

    } finally {

        pending.delete(key);

    }

}
