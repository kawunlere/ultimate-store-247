const APPS = [
  {name: "Spotify", cat: "apps", price: "Free", size: "35MB", img: "https://via.placeholder.com/150/1DB954/fff?text=Spotify"},
  {name: "TikTok", cat: "apps", price: "Free", size: "85MB", img: "https://via.placeholder.com/150/000/fff?text=TikTok"},
  {name: "WhatsApp", cat: "apps", price: "Free", size: "45MB", img: "https://via.placeholder.com/150/25D366/fff?text=WA"},
  {name: "Dead Target", cat: "games", price: "Free", size: "120MB", img: "https://via.placeholder.com/150/222/fff?text=DT"},
  {name: "Hill Climb", cat: "games", price: "Free", size: "65MB", img: "https://via.placeholder.com/150/4CAF50/fff?text=HCR"},
  {name: "Subway Surf", cat: "games", price: "Free", size: "180MB", img: "https://via.placeholder.com/150/03A9F4/fff?text=SS"},
  {name: "Mod Key Tool", cat: "tools", price: "Free", size: "2MB", img: "https://via.placeholder.com/150/9C27B0/fff?text=Tool"},
  {name: "AIDE Editor", cat: "tools", price: "Free", size: "55MB", img: "https://via.placeholder.com/150/FF9800/fff?text=AIDE"},
  {name: "Mod Menu v1", cat: "mods", price: "Free Key", size: "8MB", img: "https://via.placeholder.com/150/E91E63/fff?text=Mod"},
  {name: "Premium Mod", cat: "mods", price: "Premium", size: "12MB", img: "https://via.placeholder.com/150/673AB7/fff?text=VIP"}
];

const API_URL = "https://ultimate-api.kawunlere.workers.dev";

function renderGrid(id, filter) {
  const el = document.getElementById(id);
  if (!el) return;
  const items = APPS.filter(a => a.cat === filter);
  if (items.length === 0) { el.innerHTML = '<div class="empty">No items yet</div>'; return; }
  el.innerHTML = items.map(a => `
    <div class="card" onclick="alert('Download: ${a.name}')">
      <img src="${a.img}" alt="${a.name}">
      <h4>${a.name}</h4>
      <p>${a.size}</p>
      <div class="price">${a.price}</div>
    </div>
  `).join('');
}

function renderTopPicks() {
  const el = document.getElementById('topPicks');
  const picks = APPS.slice(0, 4);
  el.innerHTML = picks.map(a => `
    <div class="card" onclick="alert('Download: ${a.name}')">
      <img src="${a.img}" alt="${a.name}">
      <h4>${a.name}</h4>
      <p>${a.size}</p>
      <div class="price">${a.price}</div>
    </div>
  `).join('');
}

async function getKey() {
  const deviceId = prompt("Enter your Device ID (shown in mod menu):");
  if (!deviceId) return;
  if (deviceId.length < 5) { alert("Invalid device ID"); return; }
  
  try {
    const res = await fetch(API_URL + "/api/generate-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: deviceId, type: "free" })
    });
    const data = await res.json();
    if (data.success) {
      alert("Your Key: " + data.key + "\n\nExpires: " + data.expires + "\n\nCopy this key and paste it in your mod menu.");
    } else {
      alert("Error: " + data.message);
    }
  } catch (e) {
    alert("Network error. Make sure you have internet.");
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderTopPicks();
  renderGrid('appsList', 'apps');
  renderGrid('gamesList', 'games');
  renderGrid('toolsList', 'tools');
  renderGrid('modsList', 'mods');
});

document.querySelectorAll('.bottom-nav a').forEach(a => {
  a.addEventListener('click', () => {
    document.querySelectorAll('.bottom-nav a').forEach(x => x.classList.remove('active'));
    a.classList.add('active');
  });
});
