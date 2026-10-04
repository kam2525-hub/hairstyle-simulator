/**
 * AI HairStudio - Trend HairStyles & Photorealistic Transfer
 */

// 正確な実写カタログ定義（人気トレンドヘア）
const HAIR_CATALOG = {
  men: [
    {
      id: 'm_center',
      name: 'センターパート',
      tag: '大人気 No.1',
      desc: 'おでこ分け・大人清潔感',
      image: 'assets/catalog/m_center.jpg'
    },
    {
      id: 'm_wolf',
      name: 'ウルフカット',
      tag: 'トレンド',
      desc: '襟足レイヤー・立体感',
      image: 'assets/catalog/m_wolf.jpg'
    },
    {
      id: 'm_comma',
      name: 'コンマバング',
      tag: '韓国アイドル風',
      desc: '内巻きカーブ前髪',
      image: 'assets/catalog/m_comma.jpg'
    },
    {
      id: 'm_mash',
      name: 'ナチュラルマッシュ',
      tag: '王道',
      desc: '重ため前髪・小顔効果',
      image: 'assets/catalog/m_mash.jpg'
    },
    {
      id: 'm_spiral',
      name: 'スパイラルパーマ',
      tag: '束感・動き',
      desc: '波打ちウェーブ',
      image: 'assets/catalog/m_spiral.jpg'
    },
    {
      id: 'm_fade',
      name: 'フェードショート',
      tag: '男らしさ',
      desc: 'アップバング・刈り上げ',
      image: 'assets/catalog/m_fade.jpg'
    }
  ],
  women: [
    {
      id: 'w_layer',
      name: '韓国風くびれレイヤー',
      tag: '人気 No.1',
      desc: '小顔レイヤー・透明感',
      image: 'assets/catalog/w_layer.jpg'
    },
    {
      id: 'w_bob',
      name: '切りっぱなしボブ',
      tag: '定番トレンド',
      desc: 'タッセルボブ・毛先直線',
      image: 'assets/catalog/w_bob.jpg'
    },
    {
      id: 'w_wave',
      name: 'ヨシンモリ (女神巻き)',
      tag: '韓国フェミニン',
      desc: '大波ゆるやかウェーブ',
      image: 'assets/catalog/w_wave.jpg'
    },
    {
      id: 'w_short',
      name: 'ハンサムショート',
      tag: '小顔・上品',
      desc: '耳掛け・美シルエット',
      image: 'assets/catalog/w_short.jpg'
    },
    {
      id: 'w_straight',
      name: 'サラ艶ストレートロング',
      tag: '清楚・王道',
      desc: '天使の輪・シルキータッチ',
      image: 'assets/catalog/w_straight.jpg'
    }
  ]
};

// ヘアカラー定義
const HAIR_COLORS = [
  { id: 'c_black', name: 'ブラック', hex: '#1c1b1b' },
  { id: 'c_dark_brown', name: 'ダークブラウン', hex: '#3d261e' },
  { id: 'c_ash_greige', name: 'グレージュ', hex: '#58504d' },
  { id: 'c_milk_tea', name: 'ミルクティー', hex: '#947a61' },
  { id: 'c_blonde', name: 'ブロンド', hex: '#c5a059' },
  { id: 'c_wine', name: 'ワインレッド', hex: '#4f1a27' },
  { id: 'c_olive', name: 'オリーブ', hex: '#404533' },
  { id: 'c_pink_brown', name: 'ピンクブラウン', hex: '#63353c' }
];

// アプリケーション状態
const state = {
  gender: 'men',
  currentStyleId: 'm_center',
  currentColorId: 'c_black',
  originalImage: null,
  currentResultImage: null,
  isProcessing: false,
  apiKey: localStorage.getItem('google_ai_studio_api_key') || '',
  // 調整スライダー
  scale: 1.0,
  offsetX: 0,
  offsetY: 0,
  // ドラッグ操作
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  initOffsetX: 0,
  initOffsetY: 0
};

// DOM要素
const mainCanvas = document.getElementById('mainCanvas');
const ctx = mainCanvas.getContext('2d');
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

const rangeScale = document.getElementById('rangeScale');
const rangeOffsetY = document.getElementById('rangeOffsetY');
const rangeOffsetX = document.getElementById('rangeOffsetX');
const valScale = document.getElementById('valScale');
const valOffsetY = document.getElementById('valOffsetY');
const valOffsetX = document.getElementById('valOffsetX');
const btnResetAdjust = document.getElementById('btnResetAdjust');

const btnToggleCompare = document.getElementById('btnToggleCompare');
const btnDownload = document.getElementById('btnDownload');
const btnGenerateAI = document.getElementById('btnGenerateAI');
const loadingOverlay = document.getElementById('loadingOverlay');

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
        ? 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/20' 
        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
    }`;
    item.innerHTML = `
      <div class="relative w-full h-28 bg-slate-950 overflow-hidden">
        <img src="${style.image}" alt="${style.name}" class="w-full h-full object-cover transition transform hover:scale-105">
        <div class="absolute top-2 left-2 bg-slate-900/80 backdrop-blur text-[10px] px-2 py-0.5 rounded-full text-indigo-300 font-bold border border-slate-700">
          ${style.tag}
        </div>
        ${isSelected ? '<div class="absolute top-2 right-2 bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow"><i class="fa-solid fa-check"></i></div>' : ''}
      </div>
      <div class="p-2.5">
        <div class="font-bold text-xs text-white leading-tight">${style.name}</div>
        <div class="text-[10px] text-slate-400 mt-0.5 truncate">${style.desc}</div>
      </div>
    `;
    item.onclick = () => {
      state.currentStyleId = style.id;
      renderCatalogList();
      updateLabels();
      // スタイル選択時に自動でヘアチェンジ実行！
      executeHairChange();
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
      <span class="text-[10px] text-slate-300 truncate w-full text-center">${color.name}</span>
    `;
    item.onclick = () => {
      state.currentColorId = color.id;
      renderColorList();
      updateLabels();
      executeHairChange();
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

// イベントリスナー
function setupEventListeners() {
  // 性別タブ
  tabMen.onclick = () => {
    state.gender = 'men';
    tabMen.className = 'flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition bg-indigo-600 text-white shadow-lg shadow-indigo-600/20';
    tabWomen.className = 'flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition text-slate-400 hover:text-white';
    renderCatalogList();
    executeHairChange();
  };
  tabWomen.onclick = () => {
    state.gender = 'women';
    tabWomen.className = 'flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition bg-pink-600 text-white shadow-lg shadow-pink-600/20';
    tabMen.className = 'flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition text-slate-400 hover:text-white';
    renderCatalogList();
    executeHairChange();
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
        executeHairChange();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };
  imageInput.onchange = handleUpload;
  imageInputAlt.onchange = handleUpload;

  // サンプルモデル
  btnSampleMale.onclick = () => loadSampleModel('male');
  btnSampleFemale.onclick = () => loadSampleModel('female');

  // スライダー群
  rangeScale.oninput = (e) => {
    state.scale = e.target.value / 100;
    valScale.textContent = `${e.target.value}%`;
    executeHairChange();
  };
  rangeOffsetY.oninput = (e) => {
    state.offsetY = parseInt(e.target.value);
    valOffsetY.textContent = `${e.target.value}px`;
    executeHairChange();
  };
  rangeOffsetX.oninput = (e) => {
    state.offsetX = parseInt(e.target.value);
    valOffsetX.textContent = `${e.target.value}px`;
    executeHairChange();
  };

  btnResetAdjust.onclick = () => {
    state.scale = 1.0;
    state.offsetX = 0;
    state.offsetY = 0;
    rangeScale.value = 100;
    rangeOffsetY.value = 0;
    rangeOffsetX.value = 0;
    valScale.textContent = '100%';
    valOffsetY.textContent = '0px';
    valOffsetX.textContent = '0px';
    executeHairChange();
  };

  // キャンバスドラッグ操作（髪型位置調整）
  mainCanvas.addEventListener('mousedown', (e) => {
    state.isDragging = true;
    state.dragStartX = e.clientX;
    state.dragStartY = e.clientY;
    state.initOffsetX = state.offsetX;
    state.initOffsetY = state.offsetY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!state.isDragging) return;
    const dx = e.clientX - state.dragStartX;
    const dy = e.clientY - state.dragStartY;
    state.offsetX = Math.max(-60, Math.min(60, state.initOffsetX + dx));
    state.offsetY = Math.max(-80, Math.min(80, state.initOffsetY + dy));
    rangeOffsetX.value = state.offsetX;
    rangeOffsetY.value = state.offsetY;
    valOffsetX.textContent = `${state.offsetX}px`;
    valOffsetY.textContent = `${state.offsetY}px`;
  });

  window.addEventListener('mouseup', () => {
    if (state.isDragging) {
      state.isDragging = false;
      executeHairChange();
    }
  });

  // Before / After 比較
  btnToggleCompare.onmousedown = () => showOriginal(true);
  window.addEventListener('mouseup', () => showOriginal(false));
  btnToggleCompare.ontouchstart = (e) => { e.preventDefault(); showOriginal(true); };
  window.addEventListener('touchend', () => showOriginal(false));

  // ダウンロード
  btnDownload.onclick = () => {
    const link = document.createElement('a');
    link.download = `hairstyle_${state.currentStyleId}_${Date.now()}.jpg`;
    link.href = mainCanvas.toDataURL('image/jpeg', 0.95);
    link.click();
  };

  // 合成ボタン
  btnGenerateAI.onclick = executeHairChange;

  // Google AI Studio モーダル
  const apiKeyModal = document.getElementById('apiKeyModal');
  const btnOpenApiKeyModal = document.getElementById('btnOpenApiKeyModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnSaveApiKey = document.getElementById('btnSaveApiKey');
  const btnClearApiKey = document.getElementById('btnClearApiKey');
  const inputApiKey = document.getElementById('inputApiKey');
  const engineBadge = document.getElementById('engineBadge');

  if (state.apiKey) {
    inputApiKey.value = state.apiKey;
    engineBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Google Imagen 3 (稼働中)';
    engineBadge.className = 'hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  }

  btnOpenApiKeyModal.onclick = () => {
    apiKeyModal.classList.remove('hidden');
    inputApiKey.value = state.apiKey;
  };
  btnCloseModal.onclick = () => apiKeyModal.classList.add('hidden');
  btnSaveApiKey.onclick = () => {
    state.apiKey = inputApiKey.value.trim();
    localStorage.setItem('google_ai_studio_api_key', state.apiKey);
    apiKeyModal.classList.add('hidden');
    if (state.apiKey) {
      engineBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Google Imagen 3 (稼働中)';
      engineBadge.className = 'hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    } else {
      engineBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span> リアルヘアエンジン稼働中';
      engineBadge.className = 'hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
    }
    executeHairChange();
  };
  btnClearApiKey.onclick = () => {
    state.apiKey = '';
    localStorage.removeItem('google_ai_studio_api_key');
    inputApiKey.value = '';
    engineBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span> リアルヘアエンジン稼働中';
    engineBadge.className = 'hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
  };
}

// 画像の読み込みセットアップ
function setupImage(img) {
  state.originalImage = img;
  state.currentResultImage = null;
  emptyGuide.classList.add('hidden');

  const maxDimension = 600;
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
  ctx.drawImage(img, 0, 0, w, h);
}

// サンプルモデル読み込み
function loadSampleModel(gender) {
  const imgPath = gender === 'male' ? 'assets/catalog/m_center.jpg' : 'assets/catalog/w_layer.jpg';
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    setupImage(img);
    if (gender === 'male' && state.gender !== 'men') tabMen.click();
    else if (gender === 'female' && state.gender !== 'women') tabWomen.click();
    else executeHairChange();
  };
  img.src = imgPath;
}

function showOriginal(show) {
  if (!state.originalImage) return;
  if (show) {
    ctx.drawImage(state.originalImage, 0, 0, mainCanvas.width, mainCanvas.height);
  } else if (state.currentResultImage) {
    ctx.drawImage(state.currentResultImage, 0, 0, mainCanvas.width, mainCanvas.height);
  }
}

// ✨ ヘアチェンジ実行（サーバー連携 & クライアントフォールバック）
async function executeHairChange() {
  if (!state.originalImage || state.isProcessing) return;

  state.isProcessing = true;
  loadingOverlay.classList.remove('hidden');

  const currentColor = HAIR_COLORS.find(c => c.id === state.currentColorId);
  const originalData = getOriginalDataUrl();

  try {
    // 1. Pythonシームレスクローニングサーバーへリクエスト
    const response = await fetch('/api/generate-hair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: originalData,
        style_id: state.currentStyleId,
        color_id: state.currentColorId,
        scale: state.scale,
        offset_x: state.offsetX,
        offset_y: state.offsetY,
        api_key: state.apiKey
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.resultImage) {
        displayResult(data.resultImage);
        return;
      }
    }

    // サーバーが動いていない（GitHub Pages単体環境など）場合のフロントエンド合成
    synthesizeOnClient();

  } catch (err) {
    // クライアント側で合成
    synthesizeOnClient();
  } finally {
    state.isProcessing = false;
    loadingOverlay.classList.add('hidden');
  }
}

function getOriginalDataUrl() {
  const temp = document.createElement('canvas');
  temp.width = mainCanvas.width;
  temp.height = mainCanvas.height;
  const tctx = temp.getContext('2d');
  tctx.drawImage(state.originalImage, 0, 0, temp.width, temp.height);
  return temp.toDataURL('image/jpeg', 0.95);
}

function displayResult(dataUrl) {
  const resImg = new Image();
  resImg.onload = () => {
    state.currentResultImage = resImg;
    ctx.drawImage(resImg, 0, 0, mainCanvas.width, mainCanvas.height);
  };
  resImg.src = dataUrl;
}

// クライアント単体での高品位シームレス合成（GitHub Pages等で動作）
function synthesizeOnClient() {
  const currentStyle = [...HAIR_CATALOG.men, ...HAIR_CATALOG.women].find(s => s.id === state.currentStyleId);
  const currentColor = HAIR_COLORS.find(c => c.id === state.currentColorId);
  if (!currentStyle) return;

  const styleImg = new Image();
  styleImg.crossOrigin = 'anonymous';
  styleImg.onload = () => {
    const w = mainCanvas.width;
    const h = mainCanvas.height;

    // オフスクリーンCanvas
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const octx = off.getContext('2d');

    // 1. 元の顔写真を描画
    octx.drawImage(state.originalImage, 0, 0, w, h);

    // 2. 髪型レイヤーの描画
    const hairCanvas = document.createElement('canvas');
    hairCanvas.width = w;
    hairCanvas.height = h;
    const hctx = hairCanvas.getContext('2d');

    const targetW = w * state.scale;
    const targetH = h * state.scale;
    const posX = (w - targetW) / 2 + state.offsetX;
    const posY = (h - targetH) / 2 + state.offsetY - h * 0.05;

    hctx.drawImage(styleImg, posX, posY, targetW, targetH);

    // カラーオーバーレイ
    if (currentColor && currentColor.id !== 'c_black') {
      hctx.globalCompositeOperation = 'color';
      hctx.fillStyle = currentColor.hex;
      hctx.fillRect(0, 0, w, h);
      hctx.globalCompositeOperation = 'source-over';
    }

    // 3. マスク作成（頭頂部〜前髪を抽出し、顔中心を抜く）
    const mask = document.createElement('canvas');
    mask.width = w;
    mask.height = h;
    const mctx = mask.getContext('2d');

    // 髪領域（グラデーション）
    const grad = mctx.createRadialGradient(w / 2 + state.offsetX, h * 0.25 + state.offsetY, 20, w / 2 + state.offsetX, h * 0.25 + state.offsetY, w * 0.45);
    grad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
    grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.95)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    mctx.fillStyle = grad;
    mctx.fillRect(0, 0, w, h);

    // 目・鼻・口の保護領域を抜く
    mctx.globalCompositeOperation = 'destination-out';
    const faceGrad = mctx.createRadialGradient(w / 2, h * 0.58, 10, w / 2, h * 0.58, w * 0.28);
    faceGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
    faceGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0.8)');
    faceGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    mctx.fillStyle = faceGrad;
    mctx.fillRect(0, 0, w, h);

    // 4. マスクを髪型に適用
    hctx.globalCompositeOperation = 'destination-in';
    hctx.drawImage(mask, 0, 0);

    // 5. 合成
    octx.drawImage(hairCanvas, 0, 0);
    displayResult(off.toDataURL('image/jpeg', 0.95));
  };
  styleImg.src = currentStyle.image;
}
