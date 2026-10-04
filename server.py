import os
import io
import time
import base64
import json
import urllib.request
import urllib.parse
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from PIL import Image

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

CATALOG_DIR = os.path.abspath('assets/catalog')

# スタイルごとの完成実写写真
STYLE_MAP = {
    'm_center': 'assets/catalog/m_center.jpg',
    'm_wolf': 'assets/catalog/m_wolf.jpg',
    'm_comma': 'assets/catalog/m_comma.jpg',
    'm_mash': 'assets/catalog/m_mash.jpg',
    'm_spiral': 'assets/catalog/m_spiral.jpg',
    'm_fade': 'assets/catalog/m_fade.jpg',
    'w_layer': 'assets/catalog/w_layer.jpg',
    'w_bob': 'assets/catalog/w_bob.jpg',
    'w_wave': 'assets/catalog/w_wave.jpg',
    'w_short': 'assets/catalog/w_short.jpg',
    'w_straight': 'assets/catalog/w_straight.jpg',
}

STYLE_KEYWORDS = [
    (['センターパート', 'センター分け', 'center'], 'm_center'),
    (['コンマ', 'comma', '内巻き'], 'm_comma'),
    (['ウルフ', 'wolf', '襟足'], 'm_wolf'),
    (['マッシュ', 'mash', '重め'], 'm_mash'),
    (['パーマ', 'スパイラル', 'perm', 'wave', 'ウェーブ'], 'm_spiral'),
    (['フェード', '短髪', 'ショート', 'fade', '刈り上げ'], 'm_fade'),
    (['くびれ', 'レイヤー', 'layer'], 'w_layer'),
    (['ボブ', 'bob', '切りっぱなし'], 'w_bob'),
    (['ヨシンモリ', '女神', 'goddess'], 'w_wave'),
    (['ストレート', 'straight', 'さらさら'], 'w_straight')
]

def detect_style(prompt, gender='men'):
    p = prompt.lower()
    for keywords, s_id in STYLE_KEYWORDS:
        for kw in keywords:
            if kw in p or kw in prompt:
                if gender == 'women' and not s_id.startswith('w_'):
                    if 'ボブ' in prompt: return 'w_bob'
                    return 'w_layer'
                return s_id
    return 'm_center' if gender == 'men' else 'w_layer'

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

@app.route('/api/chat-hair', methods=['POST'])
def chat_hair():
    """
    チャット指示を受け取り、余計な顔重ねを一切せず、
    オーダー通りの完成された高画質ヘアスタイル写真をダイレクトに返却
    """
    try:
        data = request.json
        prompt = data.get('prompt', 'センターパート')
        style_hint = data.get('style_hint')
        gender = data.get('gender', 'men')
        api_key = data.get('api_key') or os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')

        style_id = style_hint if style_hint else detect_style(prompt, gender)

        result_pil = None

        # 1. Google AI Studioのキーがある場合はGoogle Imagen 3でリアルタイム完全生成
        if api_key:
            try:
                en_prompt = f"hyperrealistic 8k salon portrait photography of a handsome Japanese person with trendy {prompt} hairstyle, studio lighting, detailed hair texture"
                url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key={api_key}"
                payload = {
                    "instances": [{ "prompt": en_prompt }],
                    "parameters": { "sampleCount": 1, "aspectRatio": "3:4" }
                }
                req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
                with urllib.request.urlopen(req, timeout=35) as resp:
                    res = json.loads(resp.read().decode('utf-8'))
                    predictions = res.get('predictions', [])
                    if predictions and 'bytesBase64Encoded' in predictions[0]:
                        result_pil = Image.open(io.BytesIO(base64.b64decode(predictions[0]['bytesBase64Encoded']))).convert('RGB')
            except Exception as e:
                print(f"Google Imagen error: {e}")

        # 2. キーがない場合は、オーダーされた通りの綺麗な実写サロン写真を直接返却（心霊写真の重ね合わせは完全撤廃！）
        if not result_pil:
            target_path = STYLE_MAP.get(style_id, 'assets/catalog/m_center.jpg')
            if not os.path.exists(target_path):
                target_path = 'assets/catalog/m_center.jpg'
            result_pil = Image.open(target_path).convert('RGB')

        # Base64で返却
        buffered = io.BytesIO()
        result_pil.save(buffered, format="JPEG", quality=95)
        out_b64 = "data:image/jpeg;base64," + base64.b64encode(buffered.getvalue()).decode('utf-8')

        return jsonify({
            'success': True,
            'resultImage': out_b64,
            'promptApplied': prompt,
            'styleId': style_id
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = 5000
    print(f"=== HairStyle Studio Clean Server on http://localhost:{port} ===")
    app.run(host='0.0.0.0', port=port, debug=False)
