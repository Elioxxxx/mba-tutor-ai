import dotenv from 'dotenv';
dotenv.config();

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_MODEL = process.env.MINIMAX_MODEL;
const MINIMAX_API_URL = 'https://api.minimaxi.com/v1/text/chatcompletion_v2';

console.log('Model:', MINIMAX_MODEL);
console.log('API Key:', MINIMAX_API_KEY?.substring(0, 20) + '...');

async function test() {
  try {
    const response = await fetch(MINIMAX_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: MINIMAX_MODEL,
        messages: [
          { role: 'system', content: '你是一个测试助手' },
          { role: 'user', content: '请回复"MiniMax API 连通成功"' },
        ],
        temperature: 0.1,
        max_tokens: 100,
      }),
    });

    console.log('Status:', response.status);
    const data = await response.json();
    
    if (response.ok) {
      const reply = data.choices?.[0]?.message?.content;
      console.log('✅ Reply:', reply);
    } else {
      console.log('❌ Error:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('❌ Network error:', err.message);
  }
}

test();
