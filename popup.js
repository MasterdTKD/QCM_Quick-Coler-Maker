// タブ切り替え
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    tab.classList.add('active');
    document.getElementById(`${tab.dataset.tab}-tab`).style.display = 'block';
  });
});

// 初回と復元
chrome.storage.local.get(['lastColor', 'initialized'], data => {
  if (!data.initialized) {
    syncColor(255, 0, 0);
    chrome.storage.local.set({ initialized: true, lastColor: '#ff0000' });
  } else if (data.lastColor) {
    const [r, g, b] = hexToRgb(data.lastColor);
    syncColor(r, g, b);
  }
});

['r', 'g', 'b'].forEach(id => {
  const num = document.getElementById(id);
  const range = document.getElementById(id + '-range');
  num.addEventListener('input', updateFromRGB);
  range.addEventListener('input', () => {
    num.value = range.value;
    updateFromRGB();
  });
});

['h', 's', 'v'].forEach(id => {
  const num = document.getElementById(id);
  const range = document.getElementById(id + '-range');
  num.addEventListener('input', updateFromHSV);
  range.addEventListener('input', () => {
    num.value = range.value;
    updateFromHSV();
  });
});

document.getElementById('color-picker').addEventListener('input', () => {
  const [r, g, b] = hexToRgb(document.getElementById('color-picker').value);
  syncColor(r, g, b);
});

document.getElementById('save-rgb').onclick = () => saveColor(rgbToHex(
  +document.getElementById('r').value,
  +document.getElementById('g').value,
  +document.getElementById('b').value
));

document.getElementById('save-hsv').onclick = () => saveColor(rgbToHex(
  ...Object.values(hsvToRgb(
    +document.getElementById('h').value,
    +document.getElementById('s').value,
    +document.getElementById('v').value
  ))
));

document.getElementById('copy-rgb').onclick = () => {
  const r = document.getElementById('r').value;
  const g = document.getElementById('g').value;
  const b = document.getElementById('b').value;
  navigator.clipboard.writeText(`rgb(${r}, ${g}, ${b})`);
};

document.getElementById('copy-hsv').onclick = () => {
  const h = document.getElementById('h').value;
  const s = document.getElementById('s').value;
  const v = document.getElementById('v').value;
  navigator.clipboard.writeText(`hsv(${h}, ${s}%, ${v}%)`);
};

document.getElementById('toggle-theme').onclick = () => {
  document.body.classList.toggle('dark');
};

document.getElementById('clear-saved').onclick = () => {
  chrome.storage.local.set({ colors: [] }, loadSavedColors);
};

function updateFromRGB() {
  const r = +document.getElementById('r').value;
  const g = +document.getElementById('g').value;
  const b = +document.getElementById('b').value;
  syncColor(r, g, b);
}

function updateFromHSV() {
  const h = +document.getElementById('h').value;
  const s = +document.getElementById('s').value;
  const v = +document.getElementById('v').value;
  const { r, g, b } = hsvToRgb(h, s, v);
  syncColor(r, g, b);
}

function syncColor(r, g, b) {
  setRGB(r, g, b);
  const hsv = rgbToHsv(r, g, b);
  setHSV(hsv.h, hsv.s, hsv.v);
  const hex = rgbToHex(r, g, b);
  document.getElementById('color-picker').value = hex;
  document.getElementById('color-display').style.backgroundColor = hex;
  document.getElementById('hsv-display').style.backgroundColor = hex;
  document.getElementById('picker-display').style.backgroundColor = hex;
  chrome.storage.local.set({ lastColor: hex });
}

function setRGB(r, g, b) {
  ['r', 'g', 'b'].forEach((id, i) => {
    document.getElementById(id).value = [r, g, b][i];
    document.getElementById(id + '-range').value = [r, g, b][i];
  });
}

function setHSV(h, s, v) {
  ['h', 's', 'v'].forEach((id, i) => {
    document.getElementById(id).value = [h, s, v][i];
    document.getElementById(id + '-range').value = [h, s, v][i];
  });
}

function saveColor(hex) {
  chrome.storage.local.get({ colors: [] }, data => {
    if (!data.colors.includes(hex)) {
      data.colors.push(hex);
      chrome.storage.local.set({ colors: data.colors }, loadSavedColors);
    }
  });
}

function loadSavedColors() {
  chrome.storage.local.get({ colors: [] }, data => {
    const container = document.getElementById('saved-colors');
    container.innerHTML = '';
    data.colors.forEach(hex => {
      const div = document.createElement('div');
      const box = document.createElement('div');
      const actions = document.createElement('div');
      box.className = 'saved-color-box';
      box.style.backgroundColor = hex;
      box.title = hex;
      box.onclick = () => {
        const [r, g, b] = hexToRgb(hex);
        syncColor(r, g, b);
      };
      box.ondblclick = () => navigator.clipboard.writeText(hex);
      const copyBtn = document.createElement('button');
      copyBtn.textContent = 'コピー';
      copyBtn.onclick = () => navigator.clipboard.writeText(hex);
      const delBtn = document.createElement('button');
      delBtn.textContent = '削除';
      delBtn.onclick = () => {
        chrome.storage.local.set({ colors: data.colors.filter(c => c !== hex) }, loadSavedColors);
      };
      actions.appendChild(copyBtn);
      actions.appendChild(delBtn);
      div.appendChild(box);
      div.appendChild(document.createTextNode(hex));
      div.appendChild(actions);
      container.appendChild(div);
    });
  });
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex) {
  const int = parseInt(hex.slice(1), 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, v = max, d = max - min;
  s = max === 0 ? 0 : d / max;
  if (d === 0) h = 0;
  else if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
  else if (max === g) h = ((b - r) / d + 2);
  else h = ((r - g) / d + 4);
  h = Math.round(h * 60);
  return { h, s: Math.round(s * 100), v: Math.round(v * 100) };
}

function hsvToRgb(h, s, v) {
  s /= 100; v /= 100;
  let c = v * s;
  let x = c * (1 - Math.abs((h / 60) % 2 - 1));
  let m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

loadSavedColors();
