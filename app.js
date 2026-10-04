/**
 * HairStyle Studio - Main Application Logic
 */

// ヘアスタイル定義（メンズ & レディース）
const HAIR_STYLES = {
  men: [
    {
      id: 'm_mash',
      name: 'ナチュラルマッシュ',
      tag: '定番・人気',
      icon: 'fa-user',
      // SVGパス定義 (頭頂部・前髪・サイド)
      draw: (ctx, color, highlight) => drawMaleMash(ctx, color, highlight)
    },
    {
      id: 'm_center',
      name: 'センターパート',
      tag: '大人・清潔感',
      icon: 'fa-user-tie',
      draw: (ctx, color, highlight) => drawMaleCenterPart(ctx, color, highlight)
    },
    {
      id: 'm_short',
      name: 'スパイキーショート',
      tag: '爽快・ビジネス',
      icon: 'fa-sun',
      draw: (ctx, color, highlight) => drawMaleShort(ctx, color, highlight)
    },
    {
      id: 'm_perm',
      name: 'ニュアンスパーマ',
      tag: '束感・トレンド',
      icon: 'fa-water',
      draw: (ctx, color, highlight) => drawMalePerm(ctx, color, highlight)
    },
    {
      id: 'm_wolf',
      name: 'ウルフカット',
      tag: '個性・動き',
      icon: 'fa-fire',
      draw: (ctx, color, highlight) => drawMaleWolf(ctx, color, highlight)
    }
  ],
  women: [
    {
      id: 'w_bob',
      name: '切りっぱなしボブ',
      tag: '定番人気',
      icon: 'fa-gem',
      draw: (ctx, color, highlight) => drawFemaleBob(ctx, color, highlight)
    },
    {
      id: 'w_medium',
      name: 'シースルーミディアム',
      tag: '透明感・王道',
      icon: 'fa-feather',
      draw: (ctx, color, highlight) => drawFemaleMedium(ctx, color, highlight)
    },
    {
      id: 'w_long_wave',
      name: 'ゆるふわロングウェーブ',
      tag: 'フェミニン',
      icon: 'fa-wind',
      draw: (ctx, color, highlight) => drawFemaleLongWave(ctx, color, highlight)
    },
    {
      id: 'w_short',
      name: 'ハンサムショート',
      tag: '小顔・上品',
      icon: 'fa-sparkles',
      draw: (ctx, color, highlight) => drawFemaleShort(ctx, color, highlight)
    },
    {
      id: 'w_straight',
      name: 'ストレートロング',
      tag: 'サラ艶・清楚',
      icon: 'fa-minus',
      draw: (ctx, color, highlight) => drawFemaleStraight(ctx, color, highlight)
    }
  ]
};

// ヘアカラー定義
const HAIR_COLORS = [
  { id: 'c_black', name: 'ナチュラルブラック', hex: '#1c1b1b', highlight: '#3a3838' },
  { id: 'c_dark_brown', name: 'ダークブラウン', hex: '#3d261e', highlight: '#634237' },
  { id: 'c_ash_greige', name: 'アッシュグレージュ', hex: '#58504d', highlight: '#7e7571' },
  { id: 'c_milk_tea', name: 'ミルクティーベージュ', hex: '#947a61', highlight: '#bda38b' },
  { id: 'c_blonde', name: 'ハイトーンブロンド', hex: '#c5a059', highlight: '#ebd496' },
  { id: 'c_wine', name: 'カシスワインレッド', hex: '#4f1a27', highlight: '#803447' },
  { id: 'c_olive', name: 'オリーブアッシュ', hex: '#404533', highlight: '#636b52' },
  { id: 'c_pink_brown', name: 'ピンクブラウン', hex: '#63353c', highlight: '#8f5760' }
];

// アプリケーション状態
const state = {
  gender: 'men',
  currentStyleId: 'm_mash',
  currentColorId: 'c_black',
  userImage: null,
  showBeforeOnly: false,
  // 調整パラメータ
  transform: {
    scale: 1.0,
    widthRatio: 1.0,
    posX: 0,
    posY: 0,
    rotate: 0
  },
  // ドラッグ操作関連
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  initialPosX: 0,
  initialPosY: 0
};

// DOM要素
const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
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

// スライダー要素
const rangeScale = document.getElementById('rangeScale');
const rangePosY = document.getElementById('rangePosY');
const rangePosX = document.getElementById('rangePosX');
const rangeRotate = document.getElementById('rangeRotate');
const rangeWidthRatio = document.getElementById('rangeWidthRatio');
const valScale = document.getElementById('valScale');
const valPosY = document.getElementById('valPosY');
const valPosX = document.getElementById('valPosX');
const valRotate = document.getElementById('valRotate');
const valWidthRatio = document.getElementById('valWidthRatio');

const btnToggleBeforeAfter = document.getElementById('btnToggleBeforeAfter');
const btnResetAdjust = document.getElementById('btnResetAdjust');
const btnDownload = document.getElementById('btnDownload');

// 初期化
window.addEventListener('DOMContentLoaded', () => {
  renderStyleList();
  renderColorList();
  setupEventListeners();
  // 初期で男性モデルを読み込んで試せるようにする
  loadSampleAvatar('male');
});

// スタイル一覧の描画
function renderStyleList() {
  hairStyleGrid.innerHTML = '';
  const styles = HAIR_STYLES[state.gender];
  
  // 現在の選択スタイルが存在するかチェック
  if (!styles.some(s => s.id === state.currentStyleId)) {
    state.currentStyleId = styles[0].id;
  }

  styles.forEach(style => {
    const isSelected = style.id === state.currentStyleId;
    const item = document.createElement('button');
    item.className = `p-3 rounded-xl border text-left transition flex flex-col justify-between ${
      isSelected 
        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10' 
        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
    }`;
    item.innerHTML = `
      <div class="flex items-center justify-between w-full mb-2">
        <i class="fa-solid ${style.icon} text-lg ${isSelected ? 'text-indigo-400' : 'text-slate-500'}"></i>
        <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-normal">${style.tag}</span>
      </div>
      <div>
        <div class="font-bold text-xs leading-snug">${style.name}</div>
      </div>
    `;
    item.onclick = () => {
      state.currentStyleId = style.id;
      renderStyleList();
      updateLabels();
      renderCanvas();
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
    item.className = `p-2 rounded-xl border flex flex-col items-center gap-1.5 transition ${
      isSelected 
        ? 'bg-slate-800 border-indigo-500 shadow-md ring-2 ring-indigo-500/30' 
        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
    }`;
    item.innerHTML = `
      <div class="w-8 h-8 rounded-full border border-white/20 shadow-inner flex items-center justify-center" style="background-color: ${color.hex}">
        ${isSelected ? '<i class="fa-solid fa-check text-xs text-white drop-shadow"></i>' : ''}
      </div>
      <span class="text-[10px] text-slate-300 truncate w-full text-center">${color.name.split('')[0] + color.name.slice(1, 5)}</span>
    `;
    item.onclick = () => {
      state.currentColorId = color.id;
      renderColorList();
      updateLabels();
      renderCanvas();
    };
    hairColorGrid.appendChild(item);
  });
  updateLabels();
}

function updateLabels() {
  const currentStyle = [...HAIR_STYLES.men, ...HAIR_STYLES.women].find(s => s.id === state.currentStyleId);
  const currentColor = HAIR_COLORS.find(c => c.id === state.currentColorId);
  if (currentStyle) currentStyleLabel.textContent = currentStyle.name;
  if (currentColor) currentColorLabel.textContent = currentColor.name;
}

// イベントリスナー設定
function setupEventListeners() {
  // 性別タブ
  tabMen.onclick = () => {
    state.gender = 'men';
    tabMen.className = 'flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition bg-indigo-600 text-white shadow';
    tabWomen.className = 'flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition text-slate-400 hover:text-white';
    renderStyleList();
    renderCanvas();
  };
  tabWomen.onclick = () => {
    state.gender = 'women';
    tabWomen.className = 'flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition bg-pink-600 text-white shadow';
    tabMen.className = 'flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition text-slate-400 hover:text-white';
    renderStyleList();
    renderCanvas();
  };

  // 写真アップロード
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        state.userImage = img;
        emptyGuide.classList.add('hidden');
        resetAdjustments();
        renderCanvas();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };
  imageInput.onchange = handleUpload;
  imageInputAlt.onchange = handleUpload;

  // サンプルモデル読み込み
  btnSampleMale.onclick = () => loadSampleAvatar('male');
  btnSampleFemale.onclick = () => loadSampleAvatar('female');

  // スライダー群の連動
  rangeScale.oninput = (e) => {
    state.transform.scale = e.target.value / 100;
    valScale.textContent = `${e.target.value}%`;
    renderCanvas();
  };
  rangePosY.oninput = (e) => {
    state.transform.posY = parseInt(e.target.value);
    valPosY.textContent = `${e.target.value}px`;
    renderCanvas();
  };
  rangePosX.oninput = (e) => {
    state.transform.posX = parseInt(e.target.value);
    valPosX.textContent = `${e.target.value}px`;
    renderCanvas();
  };
  rangeRotate.oninput = (e) => {
    state.transform.rotate = parseInt(e.target.value);
    valRotate.textContent = `${e.target.value}°`;
    renderCanvas();
  };
  rangeWidthRatio.oninput = (e) => {
    state.transform.widthRatio = e.target.value / 100;
    valWidthRatio.textContent = `${e.target.value}%`;
    renderCanvas();
  };

  // Before / After 比較トグル
  btnToggleBeforeAfter.onmousedown = () => {
    state.showBeforeOnly = true;
    renderCanvas();
  };
  window.addEventListener('mouseup', () => {
    if (state.showBeforeOnly) {
      state.showBeforeOnly = false;
      renderCanvas();
    }
  });
  btnToggleBeforeAfter.ontouchstart = (e) => {
    e.preventDefault();
    state.showBeforeOnly = true;
    renderCanvas();
  };
  window.addEventListener('touchend', () => {
    if (state.showBeforeOnly) {
      state.showBeforeOnly = false;
      renderCanvas();
    }
  });

  // リセットボタン
  btnResetAdjust.onclick = () => {
    resetAdjustments();
    renderCanvas();
  };

  // 画像保存
  btnDownload.onclick = () => {
    if (!state.userImage) return;
    const link = document.createElement('a');
    link.download = `hairstyle_${state.gender}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // キャンバスドラッグ操作（髪型位置調整）
  canvas.addEventListener('mousedown', (e) => {
    state.isDragging = true;
    state.dragStartX = e.clientX;
    state.dragStartY = e.clientY;
    state.initialPosX = state.transform.posX;
    state.initialPosY = state.transform.posY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!state.isDragging) return;
    const deltaX = e.clientX - state.dragStartX;
    const deltaY = e.clientY - state.dragStartY;
    state.transform.posX = state.initialPosX + deltaX;
    state.transform.posY = state.initialPosY + deltaY;
    
    // スライダーの値も同期
    rangePosX.value = Math.max(-100, Math.min(100, state.transform.posX));
    valPosX.textContent = `${rangePosX.value}px`;
    rangePosY.value = Math.max(-120, Math.min(120, state.transform.posY));
    valPosY.textContent = `${rangePosY.value}px`;

    renderCanvas();
  });

  window.addEventListener('mouseup', () => {
    state.isDragging = false;
  });

  // マウスホイールで拡大縮小
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.03 : -0.03;
    state.transform.scale = Math.max(0.6, Math.min(1.5, state.transform.scale + zoomDelta));
    rangeScale.value = Math.round(state.transform.scale * 100);
    valScale.textContent = `${rangeScale.value}%`;
    renderCanvas();
  }, { passive: false });
}

// 調整リセット
function resetAdjustments() {
  state.transform = {
    scale: 1.0,
    widthRatio: 1.0,
    posX: 0,
    posY: 0,
    rotate: 0
  };
  rangeScale.value = 100;
  valScale.textContent = '100%';
  rangePosY.value = 0;
  valPosY.textContent = '0px';
  rangePosX.value = 0;
  valPosX.textContent = '0px';
  rangeRotate.value = 0;
  valRotate.textContent = '0°';
  rangeWidthRatio.value = 100;
  valWidthRatio.textContent = '100%';
}

// キャンバス描画メイン処理
function renderCanvas() {
  if (!state.userImage) return;

  const width = state.userImage.width;
  const height = state.userImage.height;

  canvas.width = width;
  canvas.height = height;

  // 1. 元画像の描画（顔・背景）
  ctx.drawImage(state.userImage, 0, 0, width, height);

  // Before表示のみの場合は髪型を描画しない
  if (state.showBeforeOnly) return;

  // 2. 選択された髪型の描画
  const currentStyle = [...HAIR_STYLES.men, ...HAIR_STYLES.women].find(s => s.id === state.currentStyleId);
  const currentColor = HAIR_COLORS.find(c => c.id === state.currentColorId);

  if (!currentStyle || !currentColor) return;

  ctx.save();

  // 顔の標準中心位置を基準にトランスフォーム
  const centerX = width / 2 + state.transform.posX;
  const topY = height * 0.28 + state.transform.posY; // 額・生え際あたりの基準点

  ctx.translate(centerX, topY);
  ctx.rotate((state.transform.rotate * Math.PI) / 180);
  ctx.scale(state.transform.scale * state.transform.widthRatio, state.transform.scale);

  // 髪型描画関数の実行 (基準点 (0, 0) を顔の頭頂〜額の中心として描画)
  currentStyle.draw(ctx, currentColor.hex, currentColor.highlight);

  ctx.restore();
}

// ==========================================
// 髪型デザイン描画エンジン (SVG Path / ベクター)
// ==========================================

// --- メンズ髪型 ---

// 1. ナチュラルマッシュ
function drawMaleMash(ctx, color, highlight) {
  // ベースシルエット
  ctx.fillStyle = color;
  ctx.beginPath();
  // 頭頂部〜サイド〜前髪
  ctx.moveTo(0, -90);
  ctx.bezierCurveTo(70, -95, 120, -50, 115, 10); // 右サイド
  ctx.bezierCurveTo(110, 45, 95, 60, 85, 55);    // 右もみあげ
  ctx.bezierCurveTo(80, 20, 75, 15, 65, 20);     // 右前髪毛先
  ctx.bezierCurveTo(45, 25, 20, 23, 0, 25);      // センター前髪 (目の上)
  ctx.bezierCurveTo(-20, 23, -45, 25, -65, 20);  // 左前髪
  ctx.bezierCurveTo(-75, 15, -80, 20, -85, 55);  // 左もみあげ
  ctx.bezierCurveTo(-95, 60, -110, 45, -115, 10);// 左サイド
  ctx.bezierCurveTo(-120, -50, -70, -95, 0, -90);// 頭頂部へ戻る
  ctx.closePath();
  ctx.fill();

  // 束感とハイライト
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.ellipse(15, -45, 55, 14, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // 前髪の毛束ライン
  drawHairStrand(ctx, -30, -20, -35, 22, highlight);
  drawHairStrand(ctx, 0, -30, 2, 24, highlight);
  drawHairStrand(ctx, 35, -20, 40, 21, highlight);
}

// 2. センターパート
function drawMaleCenterPart(ctx, color, highlight) {
  ctx.fillStyle = color;
  
  // 左半分
  ctx.beginPath();
  ctx.moveTo(-5, -85);
  ctx.bezierCurveTo(-60, -90, -115, -45, -110, 15);
  ctx.bezierCurveTo(-105, 50, -90, 60, -80, 50);
  ctx.bezierCurveTo(-75, 20, -50, 10, -35, 15);
  ctx.bezierCurveTo(-20, 18, -10, 0, -5, -40);
  ctx.closePath();
  ctx.fill();

  // 右半分
  ctx.beginPath();
  ctx.moveTo(5, -85);
  ctx.bezierCurveTo(60, -90, 115, -45, 110, 15);
  ctx.bezierCurveTo(105, 50, 90, 60, 80, 50);
  ctx.bezierCurveTo(75, 20, 50, 10, 35, 15);
  ctx.bezierCurveTo(20, 18, 10, 0, 5, -40);
  ctx.closePath();
  ctx.fill();

  // 額の抜け感ハイライト
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.ellipse(-35, -35, 30, 10, -0.3, 0, Math.PI * 2);
  ctx.ellipse(35, -35, 30, 10, 0.3, 0, Math.PI * 2);
  ctx.fill();
}

// 3. スパイキーショート
function drawMaleShort(ctx, color, highlight) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -105);
  // スパイク状の束
  ctx.lineTo(25, -95);
  ctx.lineTo(35, -105);
  ctx.lineTo(55, -85);
  ctx.lineTo(75, -92);
  ctx.lineTo(95, -50);
  ctx.lineTo(100, -10);
  ctx.lineTo(85, 30);  // サイド刈り上げライン
  ctx.lineTo(75, 10);
  // アップバング (前髪を上げたライン)
  ctx.bezierCurveTo(40, -10, -40, -10, -75, 10);
  ctx.lineTo(-85, 30);
  ctx.lineTo(-100, -10);
  ctx.lineTo(-95, -50);
  ctx.lineTo(-75, -92);
  ctx.lineTo(-55, -85);
  ctx.lineTo(-35, -105);
  ctx.lineTo(-25, -95);
  ctx.closePath();
  ctx.fill();

  // 立ち上がりハイライト
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.ellipse(0, -60, 45, 12, 0, 0, Math.PI * 2);
  ctx.fill();
}

// 4. ニュアンスパーマ
function drawMalePerm(ctx, color, highlight) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -95);
  // ウェーブのうねり
  ctx.bezierCurveTo(35, -105, 75, -95, 105, -55);
  ctx.bezierCurveTo(125, -20, 115, 20, 105, 45);
  ctx.bezierCurveTo(90, 65, 80, 45, 75, 25);
  // スパイラルな前髪
  ctx.bezierCurveTo(60, 30, 45, 15, 30, 25);
  ctx.bezierCurveTo(15, 35, 5, 20, -5, 28);
  ctx.bezierCurveTo(-20, 35, -35, 18, -50, 26);
  ctx.bezierCurveTo(-70, 30, -80, 50, -95, 45);
  ctx.bezierCurveTo(-115, 20, -125, -20, -105, -55);
  ctx.bezierCurveTo(-75, -95, -35, -105, 0, -95);
  ctx.closePath();
  ctx.fill();

  // パーマのツヤ
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.ellipse(20, -40, 45, 14, 0.2, 0, Math.PI * 2);
  ctx.fill();
  drawHairStrand(ctx, -15, -10, -10, 25, highlight);
  drawHairStrand(ctx, 20, -15, 18, 22, highlight);
}

// 5. ウルフカット
function drawMaleWolf(ctx, color, highlight) {
  ctx.fillStyle = color;
  // 襟足のハネ毛（後ろ髪）
  ctx.beginPath();
  ctx.moveTo(-70, 40);
  ctx.lineTo(-105, 95);
  ctx.lineTo(-80, 90);
  ctx.lineTo(-65, 110);
  ctx.lineTo(0, 100);
  ctx.lineTo(65, 110);
  ctx.lineTo(80, 90);
  ctx.lineTo(105, 95);
  ctx.lineTo(70, 40);
  ctx.closePath();
  ctx.fill();

  // トップとサイド
  drawMaleMash(ctx, color, highlight);
}

// --- レディース髪型 ---

// 1. 切りっぱなしボブ
function drawFemaleBob(ctx, color, highlight) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -90);
  ctx.bezierCurveTo(75, -95, 125, -50, 120, 30);
  ctx.bezierCurveTo(118, 80, 105, 110, 85, 115); // 切りっぱなしの毛先
  ctx.lineTo(70, 110);
  ctx.bezierCurveTo(65, 50, 60, 20, 45, 20);   // 内側
  ctx.bezierCurveTo(30, 20, 15, 18, 0, 20);     // シースルー前髪
  ctx.bezierCurveTo(-15, 18, -30, 20, -45, 20);
  ctx.bezierCurveTo(-60, 20, -65, 50, -70, 110);
  ctx.lineTo(-85, 115);
  ctx.bezierCurveTo(-105, 110, -118, 80, -120, 30);
  ctx.bezierCurveTo(-125, -50, -75, -95, 0, -90);
  ctx.closePath();
  ctx.fill();

  // ツヤリング（天使の輪）
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.ellipse(0, -40, 70, 12, 0, 0, Math.PI * 2);
  ctx.fill();
}

// 2. シースルーミディアム
function drawFemaleMedium(ctx, color, highlight) {
  ctx.fillStyle = color;
  // 鎖骨までのミディアム
  ctx.beginPath();
  ctx.moveTo(0, -92);
  ctx.bezierCurveTo(80, -95, 130, -40, 125, 60);
  ctx.bezierCurveTo(120, 130, 95, 165, 80, 160);
  ctx.bezierCurveTo(65, 140, 60, 70, 50, 25);
  // 薄めのシースルーバング
  ctx.bezierCurveTo(30, 22, 10, 20, 0, 22);
  ctx.bezierCurveTo(-10, 20, -30, 22, -50, 25);
  ctx.bezierCurveTo(-60, 70, -65, 140, -80, 160);
  ctx.bezierCurveTo(-95, 165, -120, 130, -125, 60);
  ctx.bezierCurveTo(-130, -40, -80, -95, 0, -92);
  ctx.closePath();
  ctx.fill();

  // 天使の輪
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.ellipse(0, -45, 75, 14, 0, 0, Math.PI * 2);
  ctx.fill();
}

// 3. ゆるふわロングウェーブ
function drawFemaleLongWave(ctx, color, highlight) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -95);
  ctx.bezierCurveTo(85, -95, 140, -30, 135, 70);
  // ウェーブの広がり
  ctx.bezierCurveTo(145, 120, 115, 180, 125, 230);
  ctx.bezierCurveTo(110, 245, 85, 220, 80, 180);
  ctx.bezierCurveTo(70, 120, 65, 60, 50, 22);
  // 前髪
  ctx.bezierCurveTo(30, 20, 10, 18, 0, 20);
  ctx.bezierCurveTo(-10, 18, -30, 20, -50, 22);
  ctx.bezierCurveTo(-65, 60, -70, 120, -80, 180);
  ctx.bezierCurveTo(-85, 220, -110, 245, -125, 230);
  ctx.bezierCurveTo(-115, 180, -145, 120, -135, 70);
  ctx.bezierCurveTo(-140, -30, -85, -95, 0, -95);
  ctx.closePath();
  ctx.fill();

  // ハイライト
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.ellipse(0, -45, 75, 14, 0, 0, Math.PI * 2);
  ctx.ellipse(90, 120, 20, 50, 0.3, 0, Math.PI * 2);
  ctx.ellipse(-90, 120, 20, 50, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

// 4. ハンサムショート
function drawFemaleShort(ctx, color, highlight) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -90);
  ctx.bezierCurveTo(70, -95, 110, -45, 105, 10);
  ctx.bezierCurveTo(100, 35, 85, 45, 75, 35);  // 耳掛けライン
  ctx.bezierCurveTo(65, 15, 50, 10, 30, 15);
  ctx.bezierCurveTo(15, 18, 0, 15, -15, 18);
  ctx.bezierCurveTo(-35, 15, -55, 12, -70, 30);
  ctx.bezierCurveTo(-85, 45, -100, 35, -105, 10);
  ctx.bezierCurveTo(-110, -45, -70, -95, 0, -90);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.ellipse(0, -45, 60, 12, 0, 0, Math.PI * 2);
  ctx.fill();
}

// 5. ストレートロング
function drawFemaleStraight(ctx, color, highlight) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -92);
  ctx.bezierCurveTo(80, -95, 130, -30, 125, 70);
  ctx.lineTo(120, 240);
  ctx.lineTo(85, 240);
  ctx.bezierCurveTo(75, 120, 65, 50, 50, 20);
  // 前髪
  ctx.bezierCurveTo(30, 20, 10, 18, 0, 20);
  ctx.bezierCurveTo(-10, 18, -30, 20, -50, 20);
  ctx.bezierCurveTo(-65, 50, -75, 120, -85, 240);
  ctx.lineTo(-120, 240);
  ctx.lineTo(-125, 70);
  ctx.bezierCurveTo(-130, -30, -80, -95, 0, -92);
  ctx.closePath();
  ctx.fill();

  // 縦長のストレートツヤ
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.ellipse(0, -45, 75, 14, 0, 0, Math.PI * 2);
  ctx.ellipse(95, 80, 8, 90, 0, 0, Math.PI * 2);
  ctx.ellipse(-95, 80, 8, 90, 0, 0, Math.PI * 2);
  ctx.fill();
}

// 毛束の筋を描画するヘルパー
function drawHairStrand(ctx, x1, y1, x2, y2, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo((x1 + x2) / 2 + 5, (y1 + y2) / 2, x2, y2);
  ctx.stroke();
}

// ==========================================
// サンプルモデル顔画像の生成（Canvasアバター）
// ==========================================
function loadSampleAvatar(gender) {
  const offCanvas = document.createElement('canvas');
  offCanvas.width = 500;
  offCanvas.height = 650;
  const octx = offCanvas.getContext('2d');

  // 背景グラデーション（サロン風スタジオ）
  const bgGrad = octx.createRadialGradient(250, 300, 50, 250, 325, 380);
  bgGrad.addColorStop(0, '#334155');
  bgGrad.addColorStop(1, '#0f172a');
  octx.fillStyle = bgGrad;
  octx.fillRect(0, 0, 500, 650);

  // 首・肩
  octx.fillStyle = gender === 'male' ? '#e2b397' : '#f0c7ab';
  octx.beginPath();
  octx.moveTo(190, 380);
  octx.lineTo(170, 550);
  octx.lineTo(330, 550);
  octx.lineTo(310, 380);
  octx.closePath();
  octx.fill();

  // 服（Tシャツ）
  octx.fillStyle = gender === 'male' ? '#1e293b' : '#f8fafc';
  octx.beginPath();
  octx.moveTo(130, 650);
  octx.lineTo(160, 480);
  octx.quadraticCurveTo(250, 530, 340, 480);
  octx.lineTo(370, 650);
  octx.closePath();
  octx.fill();

  // 顔の輪郭（きれいな卵型）
  octx.fillStyle = gender === 'male' ? '#ebd1c0' : '#fbe5d6';
  octx.beginPath();
  octx.ellipse(250, 290, 105, 140, 0, 0, Math.PI * 2);
  octx.fill();

  // 額の生え際（控えめなベース短髪）
  octx.fillStyle = '#2b231d';
  octx.beginPath();
  octx.arc(250, 210, 100, Math.PI * 1.1, Math.PI * 1.9);
  octx.closePath();
  octx.fill();

  // 眉
  octx.strokeStyle = '#3d2b20';
  octx.lineWidth = gender === 'male' ? 4 : 2.5;
  octx.lineCap = 'round';
  // 左眉
  octx.beginPath();
  octx.moveTo(180, 255);
  octx.quadraticCurveTo(205, 248, 230, 253);
  octx.stroke();
  // 右眉
  octx.beginPath();
  octx.moveTo(270, 253);
  octx.quadraticCurveTo(295, 248, 320, 255);
  octx.stroke();

  // 目
  drawEye(octx, 205, 280, gender === 'female');
  drawEye(octx, 295, 280, gender === 'female');

  // 鼻
  octx.strokeStyle = '#c49a80';
  octx.lineWidth = 2.5;
  octx.beginPath();
  octx.moveTo(250, 280);
  octx.lineTo(248, 325);
  octx.quadraticCurveTo(250, 332, 256, 328);
  octx.stroke();

  // 唇
  octx.fillStyle = gender === 'female' ? '#d4737d' : '#be8478';
  octx.beginPath();
  octx.ellipse(250, 365, 24, gender === 'female' ? 10 : 7, 0, 0, Math.PI * 2);
  octx.fill();

  // チーク (女性モデル用)
  if (gender === 'female') {
    octx.fillStyle = 'rgba(244, 114, 182, 0.15)';
    octx.beginPath();
    octx.ellipse(195, 320, 25, 15, -0.1, 0, Math.PI * 2);
    octx.ellipse(305, 320, 25, 15, 0.1, 0, Math.PI * 2);
    octx.fill();
  }

  // 生成したCanvasを画像として読み込み
  const sampleImg = new Image();
  sampleImg.onload = () => {
    state.userImage = sampleImg;
    emptyGuide.classList.add('hidden');
    resetAdjustments();
    // 性別タブも自動で合わせる
    if (gender === 'male' && state.gender !== 'men') {
      tabMen.click();
    } else if (gender === 'female' && state.gender !== 'women') {
      tabWomen.click();
    } else {
      renderCanvas();
    }
  };
  sampleImg.src = offCanvas.toDataURL();
}

// 目の描画
function drawEye(octx, x, y, isFemale) {
  // 白目
  octx.fillStyle = '#ffffff';
  octx.beginPath();
  octx.ellipse(x, y, 16, 9, 0, 0, Math.PI * 2);
  octx.fill();

  // 瞳
  octx.fillStyle = '#2c1e18';
  octx.beginPath();
  octx.arc(x, y, 7, 0, Math.PI * 2);
  octx.fill();

  // ハイライト
  octx.fillStyle = '#ffffff';
  octx.beginPath();
  octx.arc(x - 2.5, y - 2.5, 2.5, 0, Math.PI * 2);
  octx.fill();

  // アイライン
  octx.strokeStyle = '#1e1410';
  octx.lineWidth = isFemale ? 2.5 : 1.5;
  octx.beginPath();
  octx.arc(x, y - 2, 17, Math.PI * 1.15, Math.PI * 1.85);
  octx.stroke();

  if (isFemale) {
    // まつ毛
    octx.lineWidth = 1.5;
    octx.beginPath();
    octx.moveTo(x + 12, y - 6);
    octx.lineTo(x + 18, y - 9);
    octx.stroke();
  }
}
