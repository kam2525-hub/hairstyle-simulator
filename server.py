import os
import io
import base64
import json
import cv2
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from PIL import Image, ImageOps, ImageFilter

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

CATALOG_DIR = os.path.abspath('assets/catalog')

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

@app.route('/api/generate-hair', methods=['POST'])
def generate_hair():
    """
    ユーザーの顔写真に、選択したヘアスタイルの実写毛髪をシームレスクローン合成
    """
    try:
        data = request.json
        image_b64 = data.get('image')
        style_id = data.get('style_id', 'm_center')
        scale = float(data.get('scale', 1.0))
        offset_x = int(data.get('offset_x', 0))
        offset_y = int(data.get('offset_y', 0))
        color_hex = data.get('color', '#1c1b1b')

        if not image_b64:
            return jsonify({'success': False, 'error': 'Image is required'}), 400

        # ユーザー写真の読み込み
        img_bytes = base64.b64decode(image_b64.split(',')[-1])
        user_img_pil = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        dst_w, dst_h = user_img_pil.size

        # スタイル画像の読み込み
        style_path = os.path.join(CATALOG_DIR, f"{style_id}.jpg")
        if not os.path.exists(style_path):
            style_path = os.path.join(CATALOG_DIR, "m_center.jpg")
        
        style_img_pil = Image.open(style_path).convert('RGB')

        # OpenCV形式に変換 (BGR)
        user_cv = cv2.cvtColor(np.array(user_img_pil), cv2.COLOR_RGB2BGR)
        style_cv = cv2.cvtColor(np.array(style_img_pil), cv2.COLOR_RGB2BGR)

        # スタイル画像をユーザー画像サイズに合わせてリサイズ・スケール調整
        target_w = int(dst_w * scale)
        target_h = int(dst_h * scale)
        style_resized = cv2.resize(style_cv, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)

        # 髪の毛領域のマスクを作成 (上部〜前髪・サイドを含むマスク)
        mask = np.zeros((target_h, target_w), dtype=np.uint8)
        
        # ヘアスタイルごとのマスク形状チューニング
        center_x = target_w // 2
        
        if 'wolf' in style_id:
            # ウルフカット: 襟足まで広めにカバー
            cv2.ellipse(mask, (center_x, int(target_h * 0.32)), 
                        (int(target_w * 0.46), int(target_h * 0.38)), 0, 0, 360, 255, -1)
        elif 'comma' in style_id:
            # コンマバング: 額と前髪のカーブを強調
            cv2.ellipse(mask, (center_x, int(target_h * 0.28)), 
                        (int(target_w * 0.42), int(target_h * 0.28)), 0, 0, 360, 255, -1)
        elif 'center' in style_id:
            # センターパート: おでこ分け目と両サイドのボリューム
            cv2.ellipse(mask, (center_x, int(target_h * 0.27)), 
                        (int(target_w * 0.44), int(target_h * 0.29)), 0, 0, 360, 255, -1)
        else:
            cv2.ellipse(mask, (center_x, int(target_h * 0.28)), 
                        (int(target_w * 0.43), int(target_h * 0.30)), 0, 0, 360, 255, -1)

        # 目や鼻の顔中心部分をくり抜いて、元の顔を100%保護
        face_protect = np.zeros((target_h, target_w), dtype=np.uint8)
        cv2.ellipse(face_protect, (center_x, int(target_h * 0.58)), 
                    (int(target_w * 0.25), int(target_h * 0.28)), 0, 0, 360, 255, -1)
        mask = cv2.subtract(mask, face_protect)

        # マスクのエッジをぼかして自然に馴染ませる
        mask_blurred = cv2.GaussianBlur(mask, (21, 21), 10)

        # 合成の中心位置 (ユーザー顔の頭部付近)
        clone_center_x = max(50, min(dst_w - 50, dst_w // 2 + offset_x))
        clone_center_y = max(50, min(dst_h - 50, int(dst_h * 0.28) + offset_y))

        # 画像切り出し境界チェック & リサイズ安全処理
        # キャンバスにスタイルとマスクを配置
        canvas_src = np.zeros_like(user_cv)
        canvas_mask = np.zeros((dst_h, dst_w), dtype=np.uint8)

        # スタイル画像とユーザー画像の重ね合わせ
        src_y1 = max(0, clone_center_y - target_h // 2)
        src_y2 = min(dst_h, clone_center_y + target_h // 2)
        src_x1 = max(0, clone_center_x - target_w // 2)
        src_x2 = min(dst_w, clone_center_x + target_w // 2)

        sty_y1 = max(0, target_h // 2 - (clone_center_y - src_y1))
        sty_y2 = sty_y1 + (src_y2 - src_y1)
        sty_x1 = max(0, target_w // 2 - (clone_center_x - src_x1))
        sty_x2 = sty_x1 + (src_x2 - src_x1)

        canvas_src[src_y1:src_y2, src_x1:src_x2] = style_resized[sty_y1:sty_y2, sty_x1:sty_x2]
        canvas_mask[src_y1:src_y2, src_x1:src_x2] = mask_blurred[sty_y1:sty_y2, sty_x1:sty_x2]

        # Poisson Blending (Seamless Cloning)
        try:
            # シームレスクローニング実行
            cloned = cv2.seamlessClone(
                canvas_src, 
                user_cv, 
                canvas_mask, 
                (clone_center_x, clone_center_y), 
                cv2.NORMAL_CLONE
            )
        except Exception as clone_err:
            print(f"SeamlessClone warning: {clone_err}, applying alpha blending")
            # 境界エラー等の場合の高品位アルファブレンド
            alpha = (canvas_mask.astype(float) / 255.0)[:, :, np.newaxis]
            cloned = (canvas_src.astype(float) * alpha + user_cv.astype(float) * (1.0 - alpha)).astype(np.uint8)

        # カラー調整（指定されたヘアカラーを適用）
        if color_hex and color_hex.lower() != '#1c1b1b':
            try:
                # HEX -> BGR
                ch = color_hex.lstrip('#')
                r, g, b = tuple(int(ch[i:i+2], 16) for i in (0, 2, 4))
                color_layer = np.full_like(cloned, (b, g, r), dtype=np.uint8)
                
                # 髪領域だけに色をオーバーレイ
                c_mask = (canvas_mask.astype(float) / 255.0)[:, :, np.newaxis]
                color_blend = cv2.addWeighted(cloned, 0.7, color_layer, 0.3, 0)
                cloned = (color_blend.astype(float) * c_mask + cloned.astype(float) * (1.0 - c_mask)).astype(np.uint8)
            except Exception as e:
                print(f"Color tint error: {e}")

        # 出力Base64エンコード
        res_rgb = cv2.cvtColor(cloned, cv2.COLOR_BGR2RGB)
        res_pil = Image.fromarray(res_rgb)
        buffered = io.BytesIO()
        res_pil.save(buffered, format="JPEG", quality=95)
        out_b64 = "data:image/jpeg;base64," + base64.b64encode(buffered.getvalue()).decode('utf-8')

        return jsonify({
            'success': True,
            'resultImage': out_b64,
            'styleId': style_id
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = 5000
    print(f"=== HairStyle Studio AI Server (Poisson Seamless Clone) on http://localhost:{port} ===")
    app.run(host='0.0.0.0', port=port, debug=False)
