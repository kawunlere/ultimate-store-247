const ITEMS_API = "https://ultimate-items.kawunlere.workers.dev";
const ADS_API = "https://ultimate-items.kawunlere.workers.dev";

let allItems = [];

async function loadItems() {
  try {
    const res = await fetch(ITEMS_API + "/api/items");
    const data = await res.json();
    allItems = data.items || [];
    render();
    renderAds();
  } catch (e) {
    console.error("Failed to load items:", e);
  }
}

async function loadAds() {
  try {
    const res = await fetch(ADS_API + "/api/ads");
    const data = await res.json();
    renderAds(data.ads || []);
  } catch (e) {
    console.error("Failed to load ads:", e);
  }
}

function renderAds(ads) {
  const el = document.getElementById("adsBar");
  if (!el || !ads || ads.length === 0) return;
  el.innerHTML = ads.map(a => `<a href="${a.link || '#'}" target="_blank">${a.text}</a>`).join(" • ");
}

function renderGrid(id, filter) {
  const el = document.getElementById(id);
  if (!el) return;
  const items = allItems.filter(a => a.category === filter);
  if (items.length === 0) {
    el.innerHTML = '<div class="empty">No items in this section yet</div>';
    return;
  }
  el.innerHTML = items.map(a => `
    <div class="card" onclick="openItem('${a.id}')">
      <img src="${a.image || 'https://via.placeholder.com/150'}" alt="${a.name}">
      <h4>${a.name}</h4>
      <p>${a.size || ''}</p>
      <div class="price">${a.price || 'Free'}</div>
    </div>
  `).join('');
}

function openItem(id) {
  window.location.href = "item.html?id=" + id;
}

function render() {
  renderGrid("topPicks", "tools");
  renderGrid("appsList", "apps");
  renderGrid("gamesList", "games");
  renderGrid("toolsList", "tools");
  renderGrid("modsList", "mods");
}

document.getElementById && document.addEventListener('DOMContentLoaded', () => {
  const search = document.getElementById("search");
  if (search) {
    search.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll(".card").forEach(c => {
        const name = c.querySelector("h4").innerText.toLowerCase();
        c.style.display = name.includes(q) ? "" : "none";
      });
    });
  }
  loadItems();
});

document.querySelectorAll('.bottom-nav a').forEach(a => {
  a.addEventListener('click', () => {
    document.querySelectorAll('.bottom-nav a').forEach(x => x.classList.remove('active'));
    a.classList.add('active');
  });
});
