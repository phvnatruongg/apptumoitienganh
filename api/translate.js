const { Groq } = require('groq/groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

module.exports = async function handler(req, res) {
  // Cho phép CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { word } = req.body;
    if (!word) {
      return res.status(400).json({ error: 'Thiếu từ cần tra!' });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "Bạn là một trợ lý tiếng Anh chuyên nghiệp. Hãy trả về kết quả dưới dạng JSON thuần túy, không có markdown (không dùng ```json), bao gồm nghĩa tiếng Việt, phiên âm, từ loại và các câu ví dụ."
        },
        {
          role: "user",
          content: `Hãy phân tích từ tiếng Anh sau: "${word}"`
        }
      ],
      response_format: { type: "json_object" }
    });

    const resultText = completion.choices[0]?.message?.content;
    const data = JSON.parse(resultText);

    return res.status(200).json(data);
  } catch (error) {
    console.error('Lỗi API Groq:', error);
    return res.status(500).json({ error: error.message || 'Lỗi server nội bộ' });
  }
};
