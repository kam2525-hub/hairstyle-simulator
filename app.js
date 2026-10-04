/**
 * AI HairStudio - Clean & Beautiful Hair Generator
 */

const HAIR_CATALOG = {
  men: [
    { id: 'm_center', name: 'センターパート', prompt: '前髪をセンター分けにした大人っぽいセンターパート', image: 'assets/catalog/m_center.jpg' },
    { id: 'm_comma', name: 'コンマバング', prompt: '韓国アイドル風の内巻きコンマバング', image: 'assets/catalog/m_comma.jpg' },
    { id: 'm_wolf', name: 'ウルフカット', prompt: '襟足レイヤーの立体的なウルフカット', image: 'assets/catalog/m_wolf.jpg' },
    { id: 'm_mash', name: 'ナチュラルマッシュ', prompt: '重ため前髪のナチュラルマッシュヘア', image: 'assets/catalog/m_mash.jpg' },
    { id: 'm_spiral', name: 'スパイラルパーマ', prompt: '波打ちウェーブのスパイラルパーマ', image: 'assets/catalog/m_spiral.jpg' },
    { id: 'm_fade', name: 'フェードショート', prompt: 'アップバングとサイドを刈り上げたフェードショート', image: 'assets/catalog/m_fade.jpg' }
  ],
  women: [
    { id: 'w_layer', name: 'くびれレイヤー', prompt: '韓国風くびれレイヤーカット', image: 'assets/catalog/w_layer.jpg' },
    { id: 'w_bob', name: '切りっぱなしボブ', prompt: '顎ラインの綺麗な切りっぱなしボブ', image: 'assets/catalog/w_bob.jpg' },
    { id: 'w_wave', name: 'ヨシンモリ', prompt: '韓国風ヨシンモリ（女神巻きウェーブ）', image: 'assets/catalog/w_wave.jpg' },
    { id: 'w_short', name: 'ハンサムショート', prompt: '耳掛けが綺麗な大人のハンサムショート', image: 'assets/catalog/w_short.jpg' },
    { id: 'w_straight', name: '艶ストレート', prompt: '清楚なサラ艶ストレートロングヘア', image: 'assets/catalog/w_straight.jpg' }
  ]
};

const state = {
  gender: 'men',
  currentStyleName: 'センターパート',
  isProcessing: false,
  apiKey: localStorage.getItem('google_ai_studio_api_key') || ''
};

// DOM要素
const mainResultImg = document.getElementById('mainResultImg');
const currentStatusBadge = document.getElementById('currentStatusBadge');
const tabMen = document.getElementById('tabMen');
const tabWomen = document.getElementById('tabWomen');
const hairStyleGrid = document.getElementById('hairStyleGrid');

const chatPromptInput = document.getElementById('chatPromptInput');
const btnSubmitChat = document.getElementById('btnSubmitChat');
const quickPrompts = document.querySelectorAll('.quick-prompt');

const btnDownload = document.getElementById('btnDownload');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingTitle = document.getElementById('loadingTitle');

// 初期化
window.addEventListener('DOMContentLoaded', () => {
  renderCatalogList();
  setupEventListeners();
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
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent"></div>
        <div class="absolute bottom-1 left-2 text-[11px] font-bold text-white drop-shadow">${style.name}</div>
      </div>
    `;
    item.onclick = () => {
      chatPromptInput.value = style.prompt;
      executeHairOrder(style.prompt, style.id, style.name);
    };
    hairStyleGrid.appendChild(item);
  });
}

// イベントリスナー
function setupEventListeners() {
  // 性別タブ
  tabMen.onclick = () => {
    state.gender = 'men';
    tabMen.className = 'flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition bg-indigo-600 text-white shadow';
    tabWomen.className = 'flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition text-slate-400 hover:text-white';
    renderCatalogList();
    executeHairOrder('前髪をセンター分けにした大人っぽいセンターパート', 'm_center', 'センターパート');
  };
  tabWomen.onclick = () => {
    state.gender = 'women';
    tabWomen.className = 'flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition bg-pink-600 text-white shadow';
    tabMen.className = 'flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition text-slate-400 hover:text-white';
    renderCatalogList();
    executeHairOrder('韓国風くびれレイヤーカット', 'w_layer', 'くびれレイヤー');
  };

  // チャット送信
  btnSubmitChat.onclick = () => {
    const prompt = chatPromptInput.value.trim();
    if (!prompt) return;
    executeHairOrder(prompt);
  };

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

  // ダウンロード
  btnDownload.onclick = () => {
    const link = document.createElement('a');
    link.download = `hairstyle_${state.currentStyleName}_${Date.now()}.jpg`;
    link.href = mainResultImg.src;
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

// ✨ チャットオーダーによる髪型生成処理（他人の顔重ね合わせは完全排除！）
async function executeHairOrder(promptText, styleIdHint = null, styleNameHint = null) {
  if (state.isProcessing) return;

  state.isProcessing = true;
  loadingOverlay.classList.remove('hidden');
  loadingTitle.textContent = `「${promptText.slice(0, 16)}...」を生成中`;

  try {
    const response = await fetch('/api/chat-hair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: promptText,
        style_hint: styleIdHint,
        gender: state.gender,
        api_key: state.apiKey
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.resultImage) {
        mainResultImg.src = data.resultImage;
        const name = styleNameHint || promptText.slice(0, 10);
        state.currentStyleName = name;
        currentStatusBadge.textContent = `スタイル: ${name}`;
        return;
      }
    }
  } catch (err) {
    console.error('API error:', err);
  } finally {
    state.isProcessing = false;
    loadingOverlay.classList.add('hidden');
  }
}
