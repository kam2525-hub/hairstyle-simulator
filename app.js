/**
 * AI HairStudio - Chat-driven HairStyle Simulator
 */

// トレンドカタログ
const HAIR_CATALOG = {
  men: [
    { id: 'm_center', name: 'センターパート', prompt: '韓国風センターパート、おでこを中央で分けた清潔感ある黒髪スタイル', image: 'assets/catalog/m_center.jpg' },
    { id: 'm_comma', name: 'コンマバング', prompt: '韓国アイドル風のコンマバング、前髪を内側にカールさせたスタイル', image: 'assets/catalog/m_comma.jpg' },
    { id: 'm_wolf', name: 'ウルフカット', prompt: '襟足レイヤーの立体的なウルフカット、束感のあるクールな黒髪', image: 'assets/catalog/m_wolf.jpg' },
    { id: 'm_mash', name: 'ナチュラルマッシュ', prompt: '重ため前髪のナチュラルマッシュヘア、清潔感ある定番ヘアスタイル', image: 'assets/catalog/m_mash.jpg' },
    { id: 'm_spiral', name: 'スパイラルパーマ', prompt: '波打ちウェーブのスパイラルパーマ、ウェット質感と束感のあるスタイル', image: 'assets/catalog/m_spiral.jpg' },
    { id: 'm_fade', name: 'フェードショート', prompt: 'アップバングとサイドを刈り上げた爽快なフェードショートヘア', image: 'assets/catalog/m_fade.jpg' }
  ],
  women: [
    { id: 'w_layer', name: 'くびれレイヤー', prompt: '韓国風くびれレイヤーカット、顔周りに動きのある軽やかなヘアスタイル', image: 'assets/catalog/w_layer.jpg' },
    { id: 'w_bob', name: '切りっぱなしボブ', prompt: '顎ラインの綺麗な切りっぱなしタッセルボブ、ストレート', image: 'assets/catalog/w_bob.jpg' },
    { id: 'w_wave', name: 'ヨシンモリ', prompt: '韓国風ヨシンモリ（女神巻き）、大きく上品な波打ちウェーブロング', image: 'assets/catalog/w_wave.jpg' },
    { id: 'w_short', name: 'ハンサムショート', prompt: '耳掛けが綺麗な大人のハンサムショート、すっきりとした襟足', image: 'assets/catalog/w_short.jpg' },
    { id: 'w_straight', name: '艶ストレート', prompt: '天使の輪が輝く清楚なサラ艶ストレートロングヘア', image: 'assets/catalog/w_straight.jpg' }
  ]
};

// アプリ状態
const state = {
  gender: 'men',
  currentPrompt: '前髪をセンター分けにした大人っぽいセンターパート、黒髪',
  originalImage: null,
  currentResultImage: null,
  isProcessing: false,
  apiKey: localStorage.getItem('google_ai_studio_api_key') || ''
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

const chatPromptInput = document.getElementById('chatPromptInput');
const btnSubmitChat = document.getElementById('btnSubmitChat');
const quickPrompts = document.querySelectorAll('.quick-prompt');

const btnToggleCompare = document.getElementById('btnToggleCompare');
const btnDownload = document.getElementById('btnDownload');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingTitle = document.getElementById('loadingTitle');

// 初期化
window.addEventListener('DOMContentLoaded', () => {
  renderCatalogList();
  setupEventListeners();
  loadSampleModel('male');
});

// カタログ一覧の描画
function renderCatalogList() {
  hairStyleGrid.innerHTML = '';
  const styles = HAIR_CATALOG[state.gender];

  styles.forEach(style => {
    const item = document.createElement('div');
    item.className = 'cursor-pointer rounded-xl border border-slate-800 bg-slate-950 overflow-hidden hover:border-indigo-500 transition flex flex-col group';
    item.innerHTML = `
      <div class="h-20 bg-slate-900 overflow-hidden relative">
        <img src="${style.image}" alt="${style.name}" class="w-full h-full object-cover group-hover:scale-105 transition">
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent"></div>
        <div class="absolute bottom-1 left-2 text-[11px] font-bold text-white drop-shadow">${style.name}</div>
      </div>
    `;
    item.onclick = () => {
      chatPromptInput.value = style.prompt;
      executeHairOrder(style.prompt, style.id);
    };
    hairStyleGrid.appendChild(item);
  });
}

// イベントリスナー設定
function setupEventListeners() {
  // 性別タブ
  tabMen.onclick = () => {
    state.gender = 'men';
    tabMen.className = 'flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition bg-indigo-600 text-white shadow';
    tabWomen.className = 'flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition text-slate-400 hover:text-white';
    renderCatalogList();
  };
  tabWomen.onclick = () => {
    state.gender = 'women';
    tabWomen.className = 'flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition bg-pink-600 text-white shadow';
    tabMen.className = 'flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition text-slate-400 hover:text-white';
    renderCatalogList();
  };

  // チャット送信
  btnSubmitChat.onclick = () => {
    const prompt = chatPromptInput.value.trim();
    if (!prompt) return;
    executeHairOrder(prompt);
  };

  // Enterキーで送信 (Shift+Enterは改行)
  chatPromptInput.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      btnSubmitChat.click();
    }
  };

  // クイック入力ボタン
  quickPrompts.forEach(btn => {
    btn.onclick = () => {
      const text = btn.getAttribute('data-text');
      chatPromptInput.value = text;
      executeHairOrder(text);
    };
  });

  // 写真アップロード
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => setupImage(img);
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };
  imageInput.onchange = handleUpload;
  imageInputAlt.onchange = handleUpload;

  btnSampleMale.onclick = () => loadSampleModel('male');
  btnSampleFemale.onclick = () => loadSampleModel('female');

  // Before / After 比較
  btnToggleCompare.onmousedown = () => showOriginal(true);
  window.addEventListener('mouseup', () => showOriginal(false));
  btnToggleCompare.ontouchstart = (e) => { e.preventDefault(); showOriginal(true); };
  window.addEventListener('touchend', () => showOriginal(false));

  // ダウンロード
  btnDownload.onclick = () => {
    const link = document.createElement('a');
    link.download = `hairstyle_ai_${Date.now()}.jpg`;
    link.href = mainCanvas.toDataURL('image/jpeg', 0.95);
    link.click();
  };

  // Google AI Studio モーダル
  const apiKeyModal = document.getElementById('apiKeyModal');
  const btnOpenApiKeyModal = document.getElementById('btnOpenApiKeyModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnSaveApiKey = document.getElementById('btnSaveApiKey');
  const btnClearApiKey = document.getElementById('btnClearApiKey');
  const inputApiKey = document.getElementById('inputApiKey');

  btnOpenApiKeyModal.onclick = () => {
    apiKeyModal.classList.remove('hidden');
    inputApiKey.value = state.apiKey;
  };
  btnCloseModal.onclick = () => apiKeyModal.classList.add('hidden');
  btnSaveApiKey.onclick = () => {
    state.apiKey = inputApiKey.value.trim();
    localStorage.setItem('google_ai_studio_api_key', state.apiKey);
    apiKeyModal.classList.add('hidden');
    alert('Google AI APIキーを保存しました！');
  };
  btnClearApiKey.onclick = () => {
    state.apiKey = '';
    localStorage.removeItem('google_ai_studio_api_key');
    inputApiKey.value = '';
    alert('APIキーを解除しました。');
  };
}

// 画像のセットアップ
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

// ✨ チャット指示からの髪型生成処理
async function executeHairOrder(promptText, styleIdHint = null) {
  if (!state.originalImage || state.isProcessing) return;

  state.isProcessing = true;
  loadingOverlay.classList.remove('hidden');
  loadingTitle.textContent = `「${promptText.slice(0, 16)}...」をAI生成中`;

  const originalData = getOriginalDataUrl();

  try {
    const response = await fetch('/api/chat-hair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: originalData,
        prompt: promptText,
        style_hint: styleIdHint,
        gender: state.gender,
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
    // 失敗時はアラート
    alert('生成に失敗しました。もう一度お試しください。');
  } catch (err) {
    console.error('API Error:', err);
    alert('サーバーとの通信に失敗しました。');
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
