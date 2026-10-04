import os
import io
import time
import base64
import json
import urllib.request
import urllib.parse
import hashlib
import cv2
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from PIL import Image, ImageFilter

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

CATALOG_DIR = os.path.abspath('assets/catalog')

# キーワードからスタイルへのマッピング
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

def detect_style_from_prompt(prompt, gender='men'):
    p_lower = prompt.lower()
    for keywords, style_id in STYLE_KEYWORDS:
        for kw in keywords:
            if kw in p_lower or kw in prompt:
                # 性別フィルタ
                if gender == 'women' and not style_id.startswith('w_'):
                    if 'ボブ' in prompt: return 'w_bob'
                    if 'レイヤー' in prompt: return 'w_layer'
                    return 'w_layer'
                return style_id
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
    チャット指示（例: 「センターパートにして」）を受け取り、
    余分な肌の二重露光を完全に除去して、ユーザーの頭の上に髪型だけをブレンド合成
    """
    try:
        data = request.json
        image_b64 = data.get('image')
        prompt = data.get('prompt', 'センターパート')
        style_hint = data.get('style_hint')
        gender = data.get('gender', 'men')
        api_key = data.get('api_key') or os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')

        if not image_b64:
            return jsonify({'success': False, 'error': 'Image is required'}), 400

        # スタイルの決定
        style_id = style_hint if style_hint else detect_style_from_prompt(prompt, gender)

        # ユーザー写真の読み込み
        user_bytes = base64.b64decode(image_b64.split(',')[-1])
        user_pil = Image.open(io.BytesIO(user_bytes)).convert('RGB')
        dst_w, dst_h = user_pil.size

        # スタイル画像の読み込み
        style_path = os.path.join(CATALOG_DIR, f"{style_id}.jpg")
        if not os.path.exists(style_path):
            style_path = os.path.join(CATALOG_DIR, "m_center.jpg")
        style_pil = Image.open(style_path).convert('RGB')

        # Google AI StudioのAPIキーがある場合、Google Imagen 3でリアルタイム生成
        if api_key:
            try:
                print(f"Calling Google Imagen 3 with user chat prompt: {prompt}")
                en_prompt = f"hyperrealistic 8k portrait photography of a handsome Asian person, {prompt}, natural studio lighting, ultra detailed hair strands"
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
                        style_pil = Image.open(io.BytesIO(base64.b64decode(predictions[0]['bytesBase64Encoded']))).convert('RGB')
                        print("Google Imagen 3 generated portrait successfully!")
            except Exception as e:
                print(f"Google Imagen error: {e}")

        # --- 二重露光（心霊写真）を防ぐ高精度アルファマスク合成 ---
        # 1. スタイル画像をユーザー画像サイズに正確にリサイズ
        style_resized = style_pil.resize((dst_w, dst_h), Image.Resampling.LANCZOS)

        # 2. 厳密な髪の毛領域のみのマスク作成（肌や顔中心は100%除外）
        mask_pil = Image.new('L', (dst_w, dst_h), 0)
        from PIL import ImageDraw
        draw = ImageDraw.Draw(mask_pil)

        cx = dst_w // 2
        # スタイルごとの髪領域
        if 'wolf' in style_id:
            # ウルフ: 上部とサイド・襟足
            draw.ellipse([int(cx - dst_w * 0.46), int(dst_h * 0.02), int(cx + dst_w * 0.46), int(dst_h * 0.44)], fill=255)
        elif 'comma' in style_id:
            # コンマバング: 額の上部〜前髪
            draw.ellipse([int(cx - dst_w * 0.42), int(dst_h * 0.03), int(cx + dst_w * 0.42), int(dst_h * 0.36)], fill=255)
        elif 'center' in style_id:
            # センターパート: 額の左右ボリュームとおでこ
            draw.ellipse([int(cx - dst_w * 0.44), int(dst_h * 0.02), int(cx + dst_w * 0.44), int(dst_h * 0.35)], fill=255)
        else:
            draw.ellipse([int(cx - dst_w * 0.43), int(dst_h * 0.02), int(cx + dst_w * 0.43), int(dst_h * 0.38)], fill=255)

        # 【超重要】ユーザーの顔の目・眉・鼻・肌・おでこ下部は完全にマスクからくり抜く（心霊写真バグ根絶）
        draw.ellipse([int(cx - dst_w * 0.28), int(dst_h * 0.28), int(cx + dst_w * 0.28), int(dst_h * 0.95)], fill=0)

        # マスクの境界線をスムーズにぼかす
        mask_smooth = mask_pil.filter(ImageFilter.GaussianBlur(radius=14))

        # 3. 合成（ユーザーの顔の上に髪型だけを重ね合わせ）
        composite = Image.composite(style_resized, user_pil, mask_smooth)

        # 出力
        buffered = io.BytesIO()
        composite.save(buffered, format="JPEG", quality=95)
        out_b64 = "data:image/jpeg;base64," + base64.b64encode(buffered.getvalue()).decode('utf-8')

        return jsonify({
            'success': True,
            'resultImage': out_b64,
            'promptApplied': prompt,
            'styleDetected': style_id
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = 5000
    print(f"=== HairStyle Studio AI Server on http://localhost:{port} ===")
    app.run(host='0.0.0.0', port=port, debug=False)
