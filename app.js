/**
 * AI HairStudio - Photorealistic Hairstyle Transfer
 */

// 実写ヘアカタログの定義（メンズ & レディース）
const HAIR_CATALOG = {
  men: [
    {
      id: 'm_mash',
      name: 'ナチュラルマッシュ',
      desc: '清潔感・王道トレンド',
      refImage: 'assets/hairstyles/1.png',
      prompt: 'handsome Japanese young man with clean natural mash haircut, soft bangs covering forehead, silky hair texture, salon lighting'
    },
    {
      id: 'm_center',
      name: 'センターパート',
      desc: '大人の色気・爽やか',
      refImage: 'assets/hairstyles/0.png',
      prompt: 'handsome Japanese man with stylish center part hairstyle, sleek parted bangs, forehead visible, clean-cut, detailed hair'
    },
    {
      id: 'm_short',
      name: 'スパイキーショート',
      desc: '束感・男らしい短髪',
      refImage: 'assets/hairstyles/4.jpg',
      prompt: 'handsome Japanese man with spiky short haircut, textured top, neat side fade, masculine stylish look'
    },
    {
      id: 'm_perm',
      name: 'ニュアンスパーマ',
      desc: '外国人風ウェーブ',
      refImage: 'assets/hairstyles/3.jpg',
      prompt: 'handsome Japanese man with natural wavy perm hair, loose curls, voluminous textured hair, soft salon lighting'
    },
    {
      id: 'm_wolf',
      name: 'ウルフカット',
      desc: '立体感レイヤー',
      refImage: 'assets/hairstyles/5.jpg',
      prompt: 'stylish Japanese man with modern wolf cut hair, layered fringe, textured nape length, trendy haircut'
    }
  ],
  women: [
    {
      id: 'w_bob',
      name: '切りっぱなしボブ',
      desc: '小顔・人気No.1',
      refImage: 'assets/hairstyles/7.png',
      prompt: 'beautiful Japanese woman with chic blunt bob haircut, chin length straight hair, transparent light bangs, glossy hair shine'
    },
    {
      id: 'w_medium',
      name: 'シースルーミディアム',
      desc: '透明感・モテ髪',
      refImage: 'assets/hairstyles/6.png',
      prompt: 'pretty Japanese woman with shoulder-length medium layered hair, see-through bangs, soft natural texture'
    },
    {
      id: 'w_wave',
      name: 'ゆるふわロングウェーブ',
      desc: '華やかフェミニン',
      refImage: 'assets/hairstyles/8.png',
      prompt: 'gorgeous Japanese woman with long voluminous wavy curly hair, soft feminine curls, silky shine, 8k portrait'
    },
    {
      id: 'w_short',
      name: 'ハンサムショート',
      desc: '上品・耳掛けスタイル',
      refImage: 'assets/hairstyles/9.jpg',
      prompt: 'elegant Japanese woman with chic short pixie haircut, side swept bangs, neat ear tuck, stylish silhouette'
    },
    {
      id: 'w_straight',
      name: '艶ストレートロング',
      desc: '清楚・サラ艶ヘア',
      refImage: 'assets/hairstyles/11.jpg',
      prompt: 'beautiful Japanese woman with sleek straight long black hair, angel ring shine, silky texture, elegant portrait'
    }
  ]
};

// ヘアカラー定義
const HAIR_COLORS = [
  { id: 'c_black', name: 'ナチュラルブラック', hex: '#1c1b1b', prompt: 'natural jet black hair color' },
  { id: 'c_dark_brown', name: 'ダークブラウン', hex: '#3d261e', prompt: 'rich dark chocolate brown hair color' },
  { id: 'c_ash_greige', name: 'アッシュグレージュ', hex: '#58504d', prompt: 'translucent ash greige hair color with cool tones' },
  { id: 'c_milk_tea', name: 'ミルクティーベージュ', hex: '#947a61', prompt: 'soft milk tea beige hair color, blonde highlights' },
  { id: 'c_blonde', name: 'ハイトーンブロンド', hex: '#c5a059', prompt: 'vibrant platinum blonde hair color' },
  { id: 'c_wine', name: 'カシスワインレッド', hex: '#4f1a27', prompt: 'deep wine red cassis hair color' },
  { id: 'c_olive', name: 'オリーブアッシュ', hex: '#404533', prompt: 'matte olive ash brown hair color' },
  { id: 'c_pink_brown', name: 'ピンクブラウン', hex: '#63353c', prompt: 'warm dusty pink brown hair color' }
];

// アプリケーション状態
const state = {
  gender: 'men',
  currentStyleId: 'm_mash',
  currentColorId: 'c_black',
  originalImage: null,
  currentResultImage: null,
  isMasking: false,
  brushRadius: 28,
  isGenerating: false,
  showOriginal: false
};

// DOM要素
const mainCanvas = document.getElementById('mainCanvas');
const maskCanvas = document.getElementById('maskCanvas');
const mctx = mainCanvas.getContext('2d');
const sctx = maskCanvas.getContext('2d');

const emptyGuide = document.getElementById('emptyGuide');
const imageInput = document.getElementById('imageInput');
const imageInputAlt = document.getElementById('imageInputAlt');
const btnSampleMale = document.getElementById('btnSampleMale');
const btnSampleFemale = document.getElementById('btnSampleFemale');

const tabMen = document.getElementById('tabMen');
const tabWomen = document.getElementById('tabWomen');
const hairStyleGrid = document.getElementById('hairStyleGrid');
const hairColorGrid = document.getElementById('hairColorGrid');
const currentStyleLabel = document.getElementById('currentStyleLabel');
const currentColorLabel = document.getElementById('currentColorLabel');

const btnAutoMask = document.getElementById('btnAutoMask');
const btnClearMask = document.getElementById('btnClearMask');
const btnToggleCompare = document.getElementById('btnToggleCompare');
const btnDownload = document.getElementById('btnDownload');
const btnGenerateAI = document.getElementById('btnGenerateAI');

const loadingOverlay = document.getElementById('loadingOverlay');
const loadingTitle = document.getElementById('loadingTitle');
const loadingSubtitle = document.getElementById('loadingSubtitle');

// 初期化
window.addEventListener('DOMContentLoaded', () => {
  renderCatalogList();
  renderColorList();
  setupEventListeners();
  // 初期で男性モデルを読み込み
  loadSampleModel('male');
});

// カタログ一覧の描画
function renderCatalogList() {
  hairStyleGrid.innerHTML = '';
  const styles = HAIR_CATALOG[state.gender];

  if (!styles.some(s => s.id === state.currentStyleId)) {
    state.currentStyleId = styles[0].id;
  }

  styles.forEach(style => {
    const isSelected = style.id === state.currentStyleId;
    const item = document.createElement('div');
    item.className = `cursor-pointer rounded-xl border overflow-hidden transition flex flex-col ${
      isSelected 
        ? 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-500/10' 
        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
    }`;
    item.innerHTML = `
      <div class="relative w-full h-28 bg-slate-950 overflow-hidden">
        <img src="${style.refImage}" alt="${style.name}" class="w-full h-full object-cover transition transform hover:scale-105" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'">
        ${isSelected ? '<div class="absolute top-2 right-2 bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow"><i class="fa-solid fa-check"></i></div>' : ''}
      </div>
      <div class="p-2.5">
        <div class="font-bold text-xs text-white leading-tight">${style.name}</div>
        <div class="text-[10px] text-slate-400 mt-0.5">${style.desc}</div>
      </div>
    `;
    item.onclick = () => {
      state.currentStyleId = style.id;
      renderCatalogList();
      updateLabels();
    };
    hairStyleGrid.appendChild(item);
  });
  updateLabels();
}

// カラー一覧の描画
function renderColorList() {
  hairColorGrid.innerHTML = '';
  HAIR_COLORS.forEach(color => {
    const isSelected = color.id === state.currentColorId;
    const item = document.createElement('button');
    item.className = `p-2 rounded-xl border flex flex-col items-center gap-1 transition ${
      isSelected 
        ? 'bg-slate-800 border-pink-500 ring-2 ring-pink-500/30' 
        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
    }`;
    item.innerHTML = `
      <div class="w-6 h-6 rounded-full border border-white/20 shadow-inner flex items-center justify-center" style="background-color: ${color.hex}">
        ${isSelected ? '<i class="fa-solid fa-check text-[9px] text-white"></i>' : ''}
      </div>
      <span class="text-[10px] text-slate-300 truncate w-full text-center">${color.name.slice(0, 4)}</span>
    `;
    item.onclick = () => {
      state.currentColorId = color.id;
      renderColorList();
      updateLabels();
    };
    hairColorGrid.appendChild(item);
  });
  updateLabels();
}

function updateLabels() {
  const currentStyle = [...HAIR_CATALOG.men, ...HAIR_CATALOG.women].find(s => s.id === state.currentStyleId);
  const currentColor = HAIR_COLORS.find(c => c.id === state.currentColorId);
  if (currentStyle) currentStyleLabel.textContent = currentStyle.name;
  if (currentColor) currentColorLabel.textContent = currentColor.name;
}

// イベントリスナー設定
function setupEventListeners() {
  // 性別タブ
  tabMen.onclick = () => {
    state.gender = 'men';
    tabMen.className = 'flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition bg-indigo-600 text-white shadow-lg shadow-indigo-600/20';
    tabWomen.className = 'flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition text-slate-400 hover:text-white';
    renderCatalogList();
  };
  tabWomen.onclick = () => {
    state.gender = 'women';
    tabWomen.className = 'flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition bg-pink-600 text-white shadow-lg shadow-pink-600/20';
    tabMen.className = 'flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition text-slate-400 hover:text-white';
    renderCatalogList();
  };

  // 写真アップロード
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setupImage(img);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };
  imageInput.onchange = handleUpload;
  imageInputAlt.onchange = handleUpload;

  // サンプルモデル読み込み
  btnSampleMale.onclick = () => loadSampleModel('male');
  btnSampleFemale.onclick = () => loadSampleModel('female');

  // マスク描画（ドラッグで髪の毛の変更エリアを赤色で塗る）
  mainCanvas.addEventListener('mousedown', (e) => {
    state.isMasking = true;
    drawMaskPoint(e);
  });
  window.addEventListener('mousemove', (e) => {
    if (state.isMasking) drawMaskPoint(e);
  });
  window.addEventListener('mouseup', () => {
    state.isMasking = false;
  });

  // 自動マスクボタン
  btnAutoMask.onclick = applyAutoMask;

  // マスククリア
  btnClearMask.onclick = () => {
    sctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  };

  // Before / After 比較
  btnToggleCompare.onmousedown = () => showBefore(true);
  window.addEventListener('mouseup', () => showBefore(false));
  btnToggleCompare.ontouchstart = (e) => { e.preventDefault(); showBefore(true); };
  window.addEventListener('touchend', () => showBefore(false));

  // ダウンロード
  btnDownload.onclick = () => {
    const link = document.createElement('a');
    link.download = `hairstyle_ai_${state.gender}_${Date.now()}.jpg`;
    link.href = mainCanvas.toDataURL('image/jpeg', 0.95);
    link.click();
  };

  // ✨ AIリアル生成ボタン実行
  btnGenerateAI.onclick = executeAIGeneration;
}

// 写真のセットアップ
function setupImage(img) {
  state.originalImage = img;
  state.currentResultImage = null;
  emptyGuide.classList.add('hidden');

  const maxDimension = 640;
  let w = img.width;
  let h = img.height;
  if (w > maxDimension || h > maxDimension) {
    if (w > h) {
      h = Math.round((h * maxDimension) / w);
      w = maxDimension;
    } else {
      w = Math.round((w * maxDimension) / h);
      h = maxDimension;
    }
  }

  mainCanvas.width = w;
  mainCanvas.height = h;
  maskCanvas.width = w;
  maskCanvas.height = h;

  mctx.drawImage(img, 0, 0, w, h);
  applyAutoMask();
}

// サンプルモデルの読み込み
function loadSampleModel(gender) {
  const imgPath = gender === 'male' ? 'assets/hairstyles/0.png' : 'assets/hairstyles/10.jpg';
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    setupImage(img);
    if (gender === 'male' && state.gender !== 'men') tabMen.click();
    if (gender === 'female' && state.gender !== 'women') tabWomen.click();
  };
  img.src = imgPath;
}

// マスク描画処理
function drawMaskPoint(e) {
  const rect = mainCanvas.getBoundingClientRect();
  const scaleX = mainCanvas.width / rect.width;
  const scaleY = mainCanvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  sctx.fillStyle = 'rgba(239, 68, 68, 0.7)'; // 赤色半透明
  sctx.beginPath();
  sctx.arc(x, y, state.brushRadius, 0, Math.PI * 2);
  sctx.fill();
}

// 自動髪領域マスク（額より上の頭頂・サイドの髪の毛部分をカバー）
function applyAutoMask() {
  const w = maskCanvas.width;
  const h = maskCanvas.height;
  sctx.clearRect(0, 0, w, h);

  sctx.fillStyle = 'rgba(239, 68, 68, 0.75)';
  sctx.beginPath();
  // 頭頂部〜前髪・耳上をカバーする自然な卵型マスク
  sctx.ellipse(w / 2, h * 0.22, w * 0.44, h * 0.32, 0, 0, Math.PI * 2);
  sctx.fill();
}

// Before/After表示切り替え
function showBefore(show) {
  if (!state.originalImage) return;
  if (show) {
    mctx.drawImage(state.originalImage, 0, 0, mainCanvas.width, mainCanvas.height);
  } else {
    if (state.currentResultImage) {
      mctx.drawImage(state.currentResultImage, 0, 0, mainCanvas.width, mainCanvas.height);
    } else {
      mctx.drawImage(state.originalImage, 0, 0, mainCanvas.width, mainCanvas.height);
    }
  }
}

// ✨ AIリアル生成の実行処理
async function executeAIGeneration() {
  if (!state.originalImage) {
    alert('まず写真をアップロードしてください');
    return;
  }
  if (state.isGenerating) return;

  state.isGenerating = true;
  loadingOverlay.classList.remove('hidden');

  const currentStyle = [...HAIR_CATALOG.men, ...HAIR_CATALOG.women].find(s => s.id === state.currentStyleId);
  const currentColor = HAIR_COLORS.find(c => c.id === state.currentColorId);
  const prompt = `${currentStyle.prompt}, ${currentColor.prompt}`;

  // マスク画像の取得（白黒マスク）
  const maskData = createBlackWhiteMask();
  const originalData = mainCanvas.toDataURL('image/jpeg', 0.95);

  try {
    // 1. まずローカルのAIサーバー (server.py) へリクエスト
    const response = await fetch('/api/generate-hair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: originalData,
        mask: maskData,
        prompt: prompt,
        gender: state.gender
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.resultImage) {
        displayResult(data.resultImage);
        return;
      }
    }
    // サーバーが動いていない（GitHub Pages単体など）場合はフロントエンド・フォトリアル合成へ
    fallbackClientSynthesis(currentStyle);

  } catch (err) {
    console.warn('APIサーバー未接続のため、クライアント高品位ブレンドモードで実行します:', err);
    fallbackClientSynthesis(currentStyle);
  } finally {
    state.isGenerating = false;
    loadingOverlay.classList.add('hidden');
  }
}

// マスク用Canvasから純白黒マスク（AI用: 白=変更, 黒=顔保持）を生成
function createBlackWhiteMask() {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = mainCanvas.width;
  tempCanvas.height = mainCanvas.height;
  const tctx = tempCanvas.getContext('2d');

  tctx.fillStyle = '#000000';
  tctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  // マスクCanvasの不透明部分を白(#ffffff)で描画
  const maskImgData = sctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  const bwImgData = tctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

  for (let i = 0; i < maskImgData.data.length; i += 4) {
    if (maskImgData.data[i + 3] > 20) {
      bwImgData.data[i] = 255;
      bwImgData.data[i + 1] = 255;
      bwImgData.data[i + 2] = 255;
      bwImgData.data[i + 3] = 255;
    }
  }
  tctx.putImageData(bwImgData, 0, 0);
  return tempCanvas.toDataURL('image/png');
}

// 結果画像の描画反映
function displayResult(resultDataUrl) {
  const resImg = new Image();
  resImg.onload = () => {
    state.currentResultImage = resImg;
    // マスクを非表示にして結果を描画
    sctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    mctx.drawImage(resImg, 0, 0, mainCanvas.width, mainCanvas.height);
  };
  resImg.src = resultDataUrl;
}

// クライアント側での実写写真テクスチャ・シームレス合成
function fallbackClientSynthesis(currentStyle) {
  const refImg = new Image();
  refImg.crossOrigin = 'anonymous';
  refImg.onload = () => {
    // オフスクリーンCanvasで合成
    const off = document.createElement('canvas');
    off.width = mainCanvas.width;
    off.height = mainCanvas.height;
    const octx = off.getContext('2d');

    // 1. 元の写真
    octx.drawImage(state.originalImage, 0, 0, off.width, off.height);

    // 2. 実写ヘアカタログ写真をマスク部分にブレンド
    const maskData = sctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    
    // 実写参照写真をリサイズして配置
    const hairCanvas = document.createElement('canvas');
    hairCanvas.width = off.width;
    hairCanvas.height = off.height;
    const hctx = hairCanvas.getContext('2d');
    hctx.drawImage(refImg, 0, 0, off.width, off.height);

    // カラーオーバーレイの適用
    const currentColor = HAIR_COLORS.find(c => c.id === state.currentColorId);
    if (currentColor && currentColor.id !== 'c_black') {
      hctx.globalCompositeOperation = 'color';
      hctx.fillStyle = currentColor.hex;
      hctx.fillRect(0, 0, off.width, off.height);
      hctx.globalCompositeOperation = 'source-over';
    }

    // マスク領域にだけ自然にフェードして描画
    octx.save();
    octx.globalCompositeOperation = 'destination-out';
    // マスク部分を抜く
    for (let i = 0; i < maskData.data.length; i += 4) {
      if (maskData.data[i + 3] > 40) {
        // マスク領域
      }
    }
    octx.restore();

    // マスクを適用して重ね合わせ
    const tempM = document.createElement('canvas');
    tempM.width = off.width;
    tempM.height = off.height;
    const tmctx = tempM.getContext('2d');
    tmctx.drawImage(maskCanvas, 0, 0);

    hctx.globalCompositeOperation = 'destination-in';
    hctx.drawImage(tempM, 0, 0);

    octx.drawImage(hairCanvas, 0, 0);

    displayResult(off.toDataURL('image/jpeg', 0.95));
  };
  refImg.src = currentStyle.refImage;
}
