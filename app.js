/**
 * AI HairStudio - Exact Same Face Virtual Hair Changer
 */

const HAIR_STYLES = {
  men: [
    { id: 'm_center', name: 'センターパート', wig: 'assets/wigs/wig_center.png', thumb: 'assets/catalog/m_center.jpg', desc: 'おでこ分け・大人清潔感' },
    { id: 'm_comma', name: 'コンマバング', wig: 'assets/wigs/wig_comma.png', thumb: 'assets/catalog/m_comma.jpg', desc: '韓国アイドル風・内巻き' },
    { id: 'm_wolf', name: 'ウルフカット', wig: 'assets/wigs/wig_wolf.png', thumb: 'assets/catalog/m_wolf.jpg', desc: '襟足レイヤー・立体感' },
    { id: 'm_mash', name: 'ナチュラルマッシュ', wig: 'assets/wigs/wig_mash.png', thumb: 'assets/catalog/m_mash.jpg', desc: '重ため前髪・王道人気' },
    { id: 'm_spiral', name: 'スパイラルパーマ', wig: 'assets/wigs/wig_spiral.png', thumb: 'assets/catalog/m_spiral.jpg', desc: '波打ちウェーブ・束感' }
  ],
  women: [
    { id: 'w_layer', name: 'くびれレイヤー', wig: 'assets/wigs/wig_layer.png', thumb: 'assets/catalog/w_layer.jpg', desc: '韓国風小顔レイヤー' },
    { id: 'w_bob', name: '切りっぱなしボブ', wig: 'assets/wigs/wig_bob.png', thumb: 'assets/catalog/w_bob.jpg', desc: '顎ラインのタッセルボブ' }
  ]
};

// アプリ状態
const state = {
  gender: 'men',
  currentStyleId: 'm_center',
  baseImage: null,
  wigImage: null,
  // 調整パラメータ
  scale: 1.0,
  offsetX: 0,
  offsetY: 0,
  // ドラッグ操作
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  initOffsetX: 0,
  initOffsetY: 0,
  showOriginal: false
};

// DOM要素
const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
const imageInput = document.getElementById('imageInput');

const tabMen = document.getElementById('tabMen');
const tabWomen = document.getElementById('tabWomen');
const hairStyleGrid = document.getElementById('hairStyleGrid');
const currentStyleLabel = document.getElementById('currentStyleLabel');

const chatPromptInput = document.getElementById('chatPromptInput');
const btnSubmitChat = document.getElementById('btnSubmitChat');
const quickBtns = document.querySelectorAll('.quick-btn');

const rangeScale = document.getElementById('rangeScale');
const rangeOffsetY = document.getElementById('rangeOffsetY');
const rangeOffsetX = document.getElementById('rangeOffsetX');
const valScale = document.getElementById('valScale');
const valOffsetY = document.getElementById('valOffsetY');
const valOffsetX = document.getElementById('valOffsetX');
const btnResetAdjust = document.getElementById('btnResetAdjust');
const btnToggleCompare = document.getElementById('btnToggleCompare');
const btnDownload = document.getElementById('btnDownload');

// 初期化
window.addEventListener('DOMContentLoaded', () => {
  renderCatalogList();
  setupEventListeners();
  loadBaseModel('male');
});

// カタログ一覧の描画
function renderCatalogList() {
  hairStyleGrid.innerHTML = '';
  const styles = HAIR_STYLES[state.gender];

  styles.forEach(style => {
    const isSelected = style.id === state.currentStyleId;
    const item = document.createElement('div');
    item.className = `cursor-pointer rounded-xl border overflow-hidden transition flex flex-col ${
      isSelected 
        ? 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/40 shadow-lg' 
        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
    }`;
    item.innerHTML = `
      <div class="h-20 bg-slate-950 overflow-hidden relative">
        <img src="${style.thumb}" alt="${style.name}" class="w-full h-full object-cover">
        ${isSelected ? '<div class="absolute top-2 right-2 bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow"><i class="fa-solid fa-check"></i></div>' : ''}
      </div>
      <div class="p-2">
        <div class="font-bold text-xs text-white">${style.name}</div>
        <div class="text-[10px] text-slate-400 truncate">${style.desc}</div>
      </div>
    `;
    item.onclick = () => {
      selectStyle(style.id);
    };
    hairStyleGrid.appendChild(item);
  });
}

function selectStyle(styleId) {
  state.currentStyleId = styleId;
  const current = [...HAIR_STYLES.men, ...HAIR_STYLES.women].find(s => s.id === styleId);
  if (current) {
    currentStyleLabel.textContent = current.name;
    loadWig(current.wig);
  }
  renderCatalogList();
}

// ウィッグ（透明PNG）の読み込み
function loadWig(src) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    state.wigImage = img;
    renderCanvas();
  };
  img.src = src;
}

// ベースモデル（正面同一顔）の読み込み
function loadBaseModel(gender) {
  const src = gender === 'male' ? 'assets/catalog/m_center.jpg' : 'assets/catalog/w_layer.jpg';
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    state.baseImage = img;
    const maxDim = 540;
    let w = img.width;
    let h = img.height;
    if (w > maxDim || h > maxDim) {
      if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
      else { w = Math.round((w * maxDim) / h); h = maxDim; }
    }
    canvas.width = w;
    canvas.height = h;

    // 初期のウィッグをロード
    const current = [...HAIR_STYLES.men, ...HAIR_STYLES.women].find(s => s.id === state.currentStyleId);
    if (current) loadWig(current.wig);
    else renderCanvas();
  };
  img.src = src;
}

// キャンバス描画（同じ正面の顔の上に、透明ウィッグを綺麗に合成）
function renderCanvas() {
  if (!state.baseImage) return;

  const w = canvas.width;
  const h = canvas.height;

  // 1. 全く同じ正面の顔写真を描画
  ctx.drawImage(state.baseImage, 0, 0, w, h);

  // Before確認モードなら髪を乗せない
  if (state.showOriginal || !state.wigImage) return;

  // 2. 選択された髪型（透明ウィッグ）だけを同じ顔の上に乗せる
  const targetW = w * state.scale;
  const targetH = h * state.scale;
  const posX = (w - targetW) / 2 + state.offsetX;
  const posY = (h - targetH) / 2 + state.offsetY - h * 0.02;

  ctx.drawImage(state.wigImage, posX, posY, targetW, targetH);
}

// イベントリスナー
function setupEventListeners() {
  // 性別タブ
  tabMen.onclick = () => {
    state.gender = 'men';
    state.currentStyleId = 'm_center';
    tabMen.className = 'flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition bg-indigo-600 text-white shadow';
    tabWomen.className = 'flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition text-slate-400 hover:text-white';
    renderCatalogList();
    selectStyle('m_center');
  };
  tabWomen.onclick = () => {
    state.gender = 'women';
    state.currentStyleId = 'w_layer';
    tabWomen.className = 'flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition bg-pink-600 text-white shadow';
    tabMen.className = 'flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition text-slate-400 hover:text-white';
    renderCatalogList();
    selectStyle('w_layer');
  };

  // チャット指示
  const handleChat = () => {
    const text = chatPromptInput.value.trim().toLowerCase();
    if (!text) return;
    if (text.includes('センター')) selectStyle('m_center');
    else if (text.includes('コンマ')) selectStyle('m_comma');
    else if (text.includes('ウルフ')) selectStyle('m_wolf');
    else if (text.includes('マッシュ')) selectStyle('m_mash');
    else if (text.includes('パーマ') || text.includes('ウェーブ')) selectStyle('m_spiral');
    else if (text.includes('ボブ')) selectStyle('w_bob');
    else if (text.includes('レイヤー') || text.includes('くびれ')) selectStyle('w_layer');
    else selectStyle('m_center');
  };
  btnSubmitChat.onclick = handleChat;
  chatPromptInput.onkeydown = (e) => { if (e.key === 'Enter') handleChat(); };

  // ワンタップボタン
  quickBtns.forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      selectStyle(id);
    };
  });

  // 写真アップロード（ユーザー自身の正面写真）
  imageInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        state.baseImage = img;
        const maxDim = 540;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
          else { w = Math.round((w * maxDim) / h); h = maxDim; }
        }
        canvas.width = w;
        canvas.height = h;
        renderCanvas();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // スライダー群
  rangeScale.oninput = (e) => {
    state.scale = e.target.value / 100;
    valScale.textContent = `${e.target.value}%`;
    renderCanvas();
  };
  rangeOffsetY.oninput = (e) => {
    state.offsetY = parseInt(e.target.value);
    valOffsetY.textContent = `${e.target.value}px`;
    renderCanvas();
  };
  rangeOffsetX.oninput = (e) => {
    state.offsetX = parseInt(e.target.value);
    valOffsetX.textContent = `${e.target.value}px`;
    renderCanvas();
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
    renderCanvas();
  };

  // キャンバスドラッグ操作（生え際・位置の直感微調整）
  canvas.addEventListener('mousedown', (e) => {
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
    renderCanvas();
  });
  window.addEventListener('mouseup', () => { state.isDragging = false; });

  // Before確認 (長押し)
  btnToggleCompare.onmousedown = () => { state.showOriginal = true; renderCanvas(); };
  window.addEventListener('mouseup', () => { if (state.showOriginal) { state.showOriginal = false; renderCanvas(); } });
  btnToggleCompare.ontouchstart = (e) => { e.preventDefault(); state.showOriginal = true; renderCanvas(); };
  window.addEventListener('touchend', () => { if (state.showOriginal) { state.showOriginal = false; renderCanvas(); } });

  // 保存
  btnDownload.onclick = () => {
    const link = document.createElement('a');
    link.download = `hairstyle_${state.currentStyleId}_${Date.now()}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
  };
}
