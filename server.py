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
from PIL import Image

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

CACHE_DIR = os.path.abspath('assets/ai_cache')
CATALOG_DIR = os.path.abspath('assets/catalog')
os.makedirs(CACHE_DIR, exist_ok=True)

# 各スタイルの高精度AIプロンプト
STYLE_PROMPTS = {
    # メンズ
    'm_center': {
        'name': 'センターパート',
        'prompt': 'hyperrealistic 8k portrait photography of a handsome Asian young man with trendy Korean center-part hairstyle, forehead neatly parted in the middle, natural volume, soft hair shine, silky hair texture, professional salon photoshoot, sharp focus, clean background'
    },
    'm_wolf': {
        'name': 'ウルフカット',
        'prompt': 'hyperrealistic 8k portrait photography of a stylish handsome Asian young man with trendy modern wolf cut hairstyle, layered fringe, textured spiky hair volume on top, medium-length flicked-out hair at nape, cool salon lighting'
    },
    'm_comma': {
        'name': 'コンマバング',
        'prompt': 'hyperrealistic 8k portrait photography of a handsome Korean K-pop idol with iconic comma bangs hairstyle, curved comma-shaped fringe pointing inward, glossy textured hair, trendy modern haircut, studio lighting'
    },
    'm_mash': {
        'name': 'ナチュラルマッシュ',
        'prompt': 'hyperrealistic 8k portrait of a handsome Japanese young man with clean natural mash hairstyle, soft textured fringe completely covering forehead, rounded silhouette, fluffy volume, realistic hair texture, warm studio portrait'
    },
    'm_spiral': {
        'name': 'スパイラルパーマ',
        'prompt': 'hyperrealistic 8k portrait of a handsome Asian man with stylish nuance twist spiral perm hairstyle, defined curly wavy locks, textured volume, wet glossy hair look, professional barber photography'
    },
    'm_fade': {
        'name': 'フェードショート',
        'prompt': 'hyperrealistic 8k photo of a stylish man with clean undercut skin fade on sides, short textured spiky crop with up-parted bangs, sharp hairline, masculine haircut'
    },
    # レディース
    'w_layer': {
        'name': '韓国風くびれレイヤー',
        'prompt': 'hyperrealistic 8k portrait of a beautiful Japanese woman with trendy Korean layered cut hairstyle, airy face-framing layers, soft volume, feminine salon photography'
    },
    'w_bob': {
        'name': '切りっぱなしボブ',
        'prompt': 'hyperrealistic 8k portrait of a gorgeous Japanese woman with chic blunt bob haircut, chin length straight sleek hair, neat straight fringe, glossy hair shine, elegant studio lighting'
    },
    'w_wave': {
        'name': 'ヨシンモリ (女神巻き)',
        'prompt': 'hyperrealistic 8k portrait of a glamorous Japanese woman with luxurious Korean goddess waves hairstyle, big bouncy loose wavy hair, voluminous silky hair, beauty salon photoshoot'
    },
    'w_short': {
        'name': 'ハンサムショート',
        'prompt': 'hyperrealistic 8k portrait of a chic Japanese woman with stylish handsome pixie short haircut, side-swept bangs, neat ear tuck, sophisticated look'
    },
    'w_straight': {
        'name': 'サラ艶ストレートロング',
        'prompt': 'hyperrealistic 8k portrait of a beautiful Japanese woman with sleek straight waist-length long hair, angel ring hair shine, silky smooth texture, elegant portrait'
    }
}

COLOR_PROMPTS = {
    'c_black': 'natural jet black hair',
    'c_dark_brown': 'rich dark chocolate brown hair color',
    'c_ash_greige': 'cool-toned translucent ash greige hair color',
    'c_milk_tea': 'creamy soft milk tea beige blonde hair color',
    'c_blonde': 'vibrant platinum blonde hair color',
    'c_wine': 'deep wine red cassis hair color',
    'c_olive': 'matte olive ash brown hair color',
    'c_pink_brown': 'warm dusty rose pink brown hair color'
}

def generate_with_google_imagen(api_key, prompt):
    """Google AI Studio (Imagen 3) APIを呼び出して画像を生成"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key={api_key}"
    payload = {
        "instances": [
            { "prompt": prompt }
        ],
        "parameters": {
            "sampleCount": 1,
            "aspectRatio": "3:4"
        }
    }
    data_json = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data_json, headers={'Content-Type': 'application/json'})
    
    with urllib.request.urlopen(req, timeout=40) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        predictions = res.get('predictions', [])
        if predictions and 'bytesBase64Encoded' in predictions[0]:
            img_b64 = predictions[0]['bytesBase64Encoded']
            img_bytes = base64.b64decode(img_b64)
            return Image.open(io.BytesIO(img_bytes))
    return None

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

@app.route('/api/generate-hair', methods=['POST'])
def generate_hair():
    """
    AIによる髪型生成・シミュレーション
    """
    try:
        data = request.json
        image_b64 = data.get('image')
        style_id = data.get('style_id', 'm_center')
        color_id = data.get('color_id', 'c_black')
        scale = float(data.get('scale', 1.0))
        offset_x = int(data.get('offset_x', 0))
        offset_y = int(data.get('offset_y', 0))
        google_api_key = data.get('api_key') or os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')

        style_info = STYLE_PROMPTS.get(style_id, STYLE_PROMPTS['m_center'])
        color_text = COLOR_PROMPTS.get(color_id, 'natural black hair')
        full_prompt = f"{style_info['prompt']}, dyed in {color_text}"

        ai_image_pil = None
        is_imagen = False

        # 1. Google AI Studioのキーがある場合はGoogle Imagen 3で生成
        if google_api_key:
            try:
                print(f"Calling Google Imagen 3 API with key: {google_api_key[:6]}...")
                ai_image_pil = generate_with_google_imagen(google_api_key, full_prompt)
                if ai_image_pil:
                    is_imagen = True
                    print("Google Imagen 3 generation succeeded!")
            except Exception as e:
                print(f"Google Imagen API error: {e}")

        # 2. キーがない場合はカタログの実写データを使用
        if not ai_image_pil:
            catalog_file = os.path.join(CATALOG_DIR, f"{style_id}.jpg")
            if os.path.exists(catalog_file):
                ai_image_pil = Image.open(catalog_file).convert('RGB')
            else:
                ai_image_pil = Image.open(os.path.join(CATALOG_DIR, "m_center.jpg")).convert('RGB')

        # ユーザー写真の読み込みとブレンド
        if image_b64:
            user_bytes = base64.b64decode(image_b64.split(',')[-1])
            user_pil = Image.open(io.BytesIO(user_bytes)).convert('RGB')
            dst_w, dst_h = user_pil.size

            user_cv = cv2.cvtColor(np.array(user_pil), cv2.COLOR_RGB2BGR)
            ai_cv = cv2.cvtColor(np.array(ai_image_pil), cv2.COLOR_RGB2BGR)

            target_w = int(dst_w * scale)
            target_h = int(dst_h * scale)
            ai_resized = cv2.resize(ai_cv, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)

            # 髪型マスク
            mask = np.zeros((target_h, target_w), dtype=np.uint8)
            center_x = target_w // 2

            if 'wolf' in style_id:
                cv2.ellipse(mask, (center_x, int(target_h * 0.33)), (int(target_w * 0.46), int(target_h * 0.38)), 0, 0, 360, 255, -1)
            elif 'comma' in style_id:
                cv2.ellipse(mask, (center_x, int(target_h * 0.28)), (int(target_w * 0.42), int(target_h * 0.28)), 0, 0, 360, 255, -1)
            elif 'center' in style_id:
                cv2.ellipse(mask, (center_x, int(target_h * 0.27)), (int(target_w * 0.44), int(target_h * 0.28)), 0, 0, 360, 255, -1)
            else:
                cv2.ellipse(mask, (center_x, int(target_h * 0.28)), (int(target_w * 0.43), int(target_h * 0.30)), 0, 0, 360, 255, -1)

            # 顔保護マスク
            face_protect = np.zeros((target_h, target_w), dtype=np.uint8)
            cv2.ellipse(face_protect, (center_x, int(target_h * 0.58)), (int(target_w * 0.26), int(target_h * 0.28)), 0, 0, 360, 255, -1)
            mask = cv2.subtract(mask, face_protect)
            mask_blurred = cv2.GaussianBlur(mask, (25, 25), 12)

            clone_center_x = max(50, min(dst_w - 50, dst_w // 2 + offset_x))
            clone_center_y = max(50, min(dst_h - 50, int(dst_h * 0.28) + offset_y))

            canvas_src = np.zeros_like(user_cv)
            canvas_mask = np.zeros((dst_h, dst_w), dtype=np.uint8)

            src_y1 = max(0, clone_center_y - target_h // 2)
            src_y2 = min(dst_h, clone_center_y + target_h // 2)
            src_x1 = max(0, clone_center_x - target_w // 2)
            src_x2 = min(dst_w, clone_center_x + target_w // 2)

            sty_y1 = max(0, target_h // 2 - (clone_center_y - src_y1))
            sty_y2 = sty_y1 + (src_y2 - src_y1)
            sty_x1 = max(0, target_w // 2 - (clone_center_x - src_x1))
            sty_x2 = sty_x1 + (src_x2 - src_x1)

            canvas_src[src_y1:src_y2, src_x1:src_x2] = ai_resized[sty_y1:sty_y2, sty_x1:sty_x2]
            canvas_mask[src_y1:src_y2, src_x1:src_x2] = mask_blurred[sty_y1:sty_y2, sty_x1:sty_x2]

            try:
                cloned = cv2.seamlessClone(
                    canvas_src, user_cv, canvas_mask, (clone_center_x, clone_center_y), cv2.NORMAL_CLONE
                )
            except Exception:
                alpha = (canvas_mask.astype(float) / 255.0)[:, :, np.newaxis]
                cloned = (canvas_src.astype(float) * alpha + user_cv.astype(float) * (1.0 - alpha)).astype(np.uint8)

            res_rgb = cv2.cvtColor(cloned, cv2.COLOR_BGR2RGB)
            final_pil = Image.fromarray(res_rgb)
        else:
            final_pil = ai_image_pil

        buffered = io.BytesIO()
        final_pil.save(buffered, format="JPEG", quality=95)
        out_b64 = "data:image/jpeg;base64," + base64.b64encode(buffered.getvalue()).decode('utf-8')

        return jsonify({
            'success': True,
            'resultImage': out_b64,
            'isGoogleAI': is_imagen,
            'styleUsed': style_info['name']
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = 5000
    print(f"=== HairStyle Studio AI Server on http://localhost:{port} ===")
    app.run(host='0.0.0.0', port=port, debug=False)
