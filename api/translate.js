const { Groq } = require('@groq/groq-sdk'); // Hoặc require('groq-sdk') tùy thuộc vào thư viện bạn đang dùng ở package.json

// Cấu hình khởi tạo Groq sử dụng biến môi trường của Vercel
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

module.exports = async (req, res) => {
  // Cấu hình CORS để giao diện index.html có thể gọi vào API này mượt mà
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Xử lý request kiểm tra (Preflight) từ trình duyệt
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Chỉ chấp nhận phương thức POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Phương thức không hợp lệ' });
  }

  const { word } = req.body;
  if (!word) {
    return res.status(400).json({ error: 'Vui lòng nhập từ!' });
  }

  try {
    // Câu lệnh Prompt thông minh: nhận diện cả tiếng Anh và tiếng Trung như bạn muốn nhé!
    const prompt = `Bạn là một chuyên gia ngôn ngữ và trợ lý học tập thông minh. Khi người dùng gửi một từ hoặc cụm từ thuộc bất kỳ ngôn ngữ nào (Anh, Trung, Hàn, Nhật...), hãy tự động nhận diện ngôn ngữ đó. Sau đó, hãy dịch, phiên âm (Pinyin kèm dấu nếu là tiếng Trung) và giải thích nghĩa chi tiết, đặt câu ví dụ bằng tiếng Việt một cách dễ hiểu nhất. 
    Trả về một đối tượng JSON khớp chính xác với cấu trúc sau:
    {
      "word": "${word}",
      "type": "loại từ (noun/verb/adjective... hoặc từ loại tiếng Trung)",
      "vietnamese": "nghĩa tiếng Việt chính xác nhất",
      "mnemonic": "mẹo nhớ từ vui vẻ bằng tiếng Việt dựa trên phát âm hoặc ý nghĩa đặc trưng của từ",
      "example_en": "câu ví dụ bằng chính ngôn ngữ đó",
      "example_vi": "dịch nghĩa của câu ví dụ sang tiếng Việt"
    }`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-8b-8192', // Hoặc model miatral/gemma bạn đang chạy ở local
      response_format: { type: "json_object" } // Ép Groq trả về JSON chuẩn
    });

    // Lấy chuỗi JSON trả về từ AI và parse thành Object
    const aiResponse = JSON.parse(completion.choices[0].message.content);
    
    // Trả kết quả về cho giao diện index.html
    return res.status(200).json(aiResponse);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Lỗi xử lý AI Server: ' + error.message });
  }
};
