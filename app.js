const AGE_KEY = "video-player-age-verified";
const LUSTPRESS_API = window.APP_CONFIG?.lustpressApi ?? "http://localhost:3000";

const ageGate = document.getElementById("age-gate");
const enterBtn = document.getElementById("enter-btn");
const leaveBtn = document.getElementById("leave-btn");
const grid = document.getElementById("grid");
const searchInput = document.getElementById("search");
const modal = document.getElementById("player-modal");
const modalTitle = document.getElementById("modal-title");
const modalDesc = document.getElementById("modal-desc");
const modalSource = document.getElementById("modal-source");
const modalClose = document.getElementById("modal-close");
const playerFrame = document.getElementById("player-frame");
const playerVideo = document.getElementById("player-video");
const tabIndian = document.getElementById("tab-indian");
const tabLustpress = document.getElementById("tab-lustpress");
const siteSelect = document.getElementById("site-select");
const browseBtn = document.getElementById("browse-btn");
const randomBtn = document.getElementById("random-btn");
const apiStatus = document.getElementById("api-status");
const loadMoreWrap = document.getElementById("load-more-wrap");
const loadMoreBtn = document.getElementById("load-more-btn");
const footerText = document.getElementById("footer-text");

let activeSource = "indian";
let lustpressResults = [];
let lustpressPage = 1;
let lustpressHasMore = false;
let lustpressLoading = false;
let searchTimer = null;
const BROWSE_QUERY = "hd";
let indianResults = [];
let indianPage = 1;
let indianHasMore = false;
let indianLoading = false;

function hideAgeGate() {
  if (ageGate) ageGate.classList.add("hidden");
}

function initAgeGate() {
  try {
    if (localStorage.getItem(AGE_KEY) === "true") {
      hideAgeGate();
    }
  } catch {
    // localStorage can fail in private/file modes
  }

  enterBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    try {
      localStorage.setItem(AGE_KEY, "true");
    } catch {
      // still enter even if storage is blocked
    }
    hideAgeGate();
  });

  leaveBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    window.location.href = "https://www.google.com";
  });
}

initAgeGate();

function showPlayerMedia(type) {
  playerFrame.classList.toggle("hidden", type !== "iframe");
  playerVideo.classList.toggle("hidden", type !== "video");
}

function renderLustpressGrid() {
  grid.innerHTML = "";

  if (lustpressLoading && lustpressResults.length === 0) {
    grid.innerHTML = `<p class="empty-msg">Loading from Lustpress…</p>`;
    return;
  }

  if (lustpressResults.length === 0) {
    grid.innerHTML = `<p class="empty-msg">No videos yet. Click Browse or search ${escapeHtml(siteSelect.value)}.</p>`;
    return;
  }

  lustpressResults.forEach((item) => {
    const card = document.createElement("article");
    card.className = "card";
    const meta = [item.duration, item.views].filter(Boolean).join(" · ");
    card.innerHTML = `
      <div class="card-thumb">
        <img src="${escapeHtml(item.image || "")}" alt="${escapeHtml(item.title || "Video")}" loading="lazy" />
        <div class="play-overlay"><span class="play-icon">▶</span></div>
      </div>
      <div class="card-body">
        <span class="card-tag">${escapeHtml(siteSelect.value)}</span>
        <h3 class="card-title">${escapeHtml(item.title || "Untitled")}</h3>
        <span class="card-year">${escapeHtml(meta)}</span>
      </div>
    `;
    card.addEventListener("click", () => openLustpressPlayer(item));
    grid.appendChild(card);
  });
}

function indianThumb(url) {
  if (!url) return "";
  return `/api/indian/thumb?url=${encodeURIComponent(url)}`;
}

function renderIndianGrid() {
  grid.innerHTML = "";

  if (indianLoading && indianResults.length === 0) {
    grid.innerHTML = `<p class="empty-msg">Loading Indian videos…</p>`;
    return;
  }

  if (indianResults.length === 0) {
    grid.innerHTML = `<p class="empty-msg">No Indian videos found.</p>`;
    return;
  }

  indianResults.forEach((item) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="card-thumb">
        <img src="${escapeHtml(indianThumb(item.image))}" alt="${escapeHtml(item.title)}" loading="lazy" />
        <div class="play-overlay"><span class="play-icon">▶</span></div>
      </div>
      <div class="card-body">
        <span class="card-tag">Indian</span>
        <h3 class="card-title">${escapeHtml(item.title)}</h3>
        <span class="card-year">${escapeHtml(item.date || "")}</span>
      </div>
    `;
    card.addEventListener("click", () => openIndianPlayer(item));
    grid.appendChild(card);
  });
}

function renderGrid() {
  if (activeSource === "indian") {
    renderIndianGrid();
  } else {
    renderLustpressGrid();
  }
}

async function openLustpressPlayer(item) {
  modalTitle.textContent = item.title || "Now Playing";
  modalDesc.textContent = "Loading video…";
  modalSource.href = item.link || "#";
  modalSource.textContent = "View on source site →";
  modal.classList.add("open");
  document.body.style.overflow = "hidden";

  try {
    const detail = await lustpressFetch(`/${siteSelect.value}/get?id=${encodeURIComponent(item.id)}`);
    const data = detail.data ?? {};
    modalTitle.textContent = data.title || item.title || "Now Playing";
    modalDesc.textContent = [data.duration, data.views, ...(data.tags || []).slice(0, 5)].filter(Boolean).join(" · ");
    modalSource.href = detail.source || item.link || "#";
    modalSource.textContent = "Played on this site";

    const candidates = [detail.assets?.[0], item.video, lustpressEmbedUrl(siteSelect.value, item.id)]
      .filter((url) => url && url !== "None");
    const fileUrl = candidates.find((url) => /\.(mp4|webm|m3u8)(\?|$)/i.test(url));
    const embedUrlValue = candidates.find((url) => /\/embed\//i.test(url));

    if (fileUrl) {
      showPlayerMedia("video");
      playerFrame.src = "";
      playerVideo.src = fileUrl;
      playerVideo.load();
      playerVideo.play().catch(() => {});
    } else if (embedUrlValue) {
      showPlayerMedia("iframe");
      playerVideo.removeAttribute("src");
      playerVideo.load();
      playerFrame.src = embedUrlValue;
    } else {
      throw new Error("No in-site player found for this video");
    }
  } catch (err) {
    modalDesc.textContent = err.message || "Failed to load video.";
    showPlayerMedia("iframe");
    if (item.video && /\/embed\//i.test(item.video)) {
      playerFrame.src = item.video;
    }
  }
}

async function openIndianPlayer(item) {
  modalTitle.textContent = item.title || "Now Playing";
  modalDesc.textContent = "Loading video on this site…";
  modalSource.href = "#";
  modalSource.removeAttribute("target");
  modalSource.textContent = "Playing on this site";
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
  showPlayerMedia("video");
  playerFrame.src = "";

  try {
    const res = await fetch(`/api/indian/play?id=${encodeURIComponent(item.id)}`);
    const json = await res.json();
    if (!res.ok || !json.success || !json.stream) {
      throw new Error(json.message || "Could not load video");
    }
    modalDesc.textContent = item.date || "";
    playerVideo.src = json.stream;
    playerVideo.load();
    await playerVideo.play().catch(() => {});
  } catch (err) {
    modalDesc.textContent = err.message || "Failed to play this video here.";
  }
}

function lustpressEmbedUrl(site, id) {
  const embeds = {
    pornhub: `https://www.pornhub.com/embed/${id}`,
    redtube: `https://embed.redtube.com/?id=${id}`,
    youporn: `https://www.youporn.com/embed/${id}`,
  };
  return embeds[site] ?? null;
}

async function lustpressFetch(path) {
  const res = await fetch(`${LUSTPRESS_API}${path}`);
  if (!res.ok) {
    throw new Error(`Lustpress returned ${res.status}`);
  }
  const json = await res.json();
  if (!json.success) {
    throw new Error("Lustpress request failed");
  }
  return json;
}

function normalizeSearchItem(item) {
  return {
    id: String(item.id ?? ""),
    title: item.title ?? "Untitled",
    image: item.image ?? item.scr ?? item.thumb ?? "",
    duration: item.duration ?? "",
    views: item.views ?? item.video_viewed ?? "",
    link: item.link ?? "",
    video: item.video ?? "",
  };
}

function mergeUniqueVideos(existing, incoming) {
  const seen = new Set(existing.map((v) => v.id));
  const next = [...existing];
  incoming.forEach((item) => {
    if (item.id && item.id !== "None" && !seen.has(item.id)) {
      seen.add(item.id);
      next.push(item);
    }
  });
  return next;
}

function currentLustpressQuery() {
  return searchInput.value.trim() || BROWSE_QUERY;
}

async function searchLustpress({ reset = true } = {}) {
  const key = currentLustpressQuery();
  const browsing = !searchInput.value.trim();

  if (reset) {
    lustpressPage = 1;
    lustpressResults = [];
  }

  lustpressLoading = true;
  apiStatus.textContent = browsing ? "Loading videos…" : "Searching…";
  renderGrid();

  try {
    const site = siteSelect.value;
    const json = await lustpressFetch(
      `/${site}/search?key=${encodeURIComponent(key)}&page=${lustpressPage}`
    );
    const batch = (json.data ?? []).map(normalizeSearchItem).filter((v) => v.id && v.id !== "None");
    lustpressResults = reset ? batch : mergeUniqueVideos(lustpressResults, batch);
    lustpressHasMore = batch.length > 0;
    apiStatus.textContent = `${lustpressResults.length} video${lustpressResults.length === 1 ? "" : "s"}`;
    loadMoreWrap.classList.toggle("hidden", !lustpressHasMore);
  } catch (err) {
    apiStatus.textContent = lustpressOfflineMessage();
    if (reset) lustpressResults = [];
    lustpressHasMore = false;
    loadMoreWrap.classList.add("hidden");
  } finally {
    lustpressLoading = false;
    renderGrid();
  }
}

async function loadRandomLustpress() {
  lustpressLoading = true;
  apiStatus.textContent = "Fetching videos…";
  renderGrid();

  try {
    const site = siteSelect.value;
    const json = await lustpressFetch(`/${site}/random`);
    const data = json.data ?? {};
    const item = normalizeSearchItem({
      id: data.id,
      title: data.title,
      image: data.image,
      duration: data.duration,
      views: data.views,
      link: json.source,
      video: json.assets?.[0],
    });

    let related = [];
    if (item.id) {
      try {
        const relatedJson = await lustpressFetch(`/${site}/related?id=${encodeURIComponent(item.id)}`);
        related = (relatedJson.data ?? []).map(normalizeSearchItem);
      } catch {
        related = [];
      }
    }

    lustpressResults = mergeUniqueVideos([item], related);
    lustpressHasMore = false;
    loadMoreWrap.classList.add("hidden");
    apiStatus.textContent = `${lustpressResults.length} video${lustpressResults.length === 1 ? "" : "s"}`;
    renderGrid();
  } catch (err) {
    apiStatus.textContent = lustpressOfflineMessage();
    lustpressResults = [];
    renderGrid();
  } finally {
    lustpressLoading = false;
  }
}

async function loadIndianFeed({ reset = true } = {}) {
  if (reset) {
    indianPage = 1;
    indianResults = [];
  }

  indianLoading = true;
  apiStatus.textContent = "Loading Indian videos…";
  renderGrid();

  try {
    const q = searchInput.value.trim();
    const params = new URLSearchParams({ page: String(indianPage) });
    if (q) params.set("q", q);
    const res = await fetch(`/api/indian?${params}`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Indian feed failed");
    }
    const batch = json.data || [];
    indianResults = reset ? batch : [...indianResults, ...batch];
    indianHasMore = Boolean(json.hasMore);
    apiStatus.textContent = `${indianResults.length} Indian video${indianResults.length === 1 ? "" : "s"}`;
    loadMoreWrap.classList.toggle("hidden", !indianHasMore);
  } catch (err) {
    apiStatus.textContent = err.message || "Indian feed offline — run npm start";
    if (reset) indianResults = [];
    indianHasMore = false;
    loadMoreWrap.classList.add("hidden");
  } finally {
    indianLoading = false;
    renderGrid();
  }
}

function lustpressOfflineMessage() {
  if (window.location.protocol === "file:") {
    return "Open http://localhost:8080 — file:// cannot reach the API";
  }
  return "API offline — run: bun run start:prod (in lustpress folder)";
}

async function checkLustpressHealth() {
  if (window.location.protocol === "file:") {
    apiStatus.textContent = lustpressOfflineMessage();
    return;
  }

  try {
    const res = await fetch(LUSTPRESS_API, { method: "GET" });
    apiStatus.textContent = res.ok ? "API connected" : "API unreachable";
  } catch {
    apiStatus.textContent = lustpressOfflineMessage();
  }
}

function setSource(source) {
  activeSource = source;
  document.body.classList.toggle("theme-indian", source === "indian");
  document.body.classList.toggle("theme-lustpress", source === "lustpress");
  tabIndian.classList.toggle("active", source === "indian");
  tabLustpress.classList.toggle("active", source === "lustpress");
  tabIndian.setAttribute("aria-selected", source === "indian");
  tabLustpress.setAttribute("aria-selected", source === "lustpress");

  loadMoreWrap.classList.add("hidden");
  browseBtn.classList.toggle("hidden", source !== "lustpress");
  randomBtn.classList.toggle("hidden", source !== "lustpress");
  siteSelect.classList.toggle("hidden", source !== "lustpress");

  if (source === "indian") {
    searchInput.placeholder = "Search Indian videos…";
    footerText.textContent = "Indian videos play in this player. For personal viewing only.";
    loadIndianFeed({ reset: true });
  } else {
    searchInput.placeholder = `Search ${siteSelect.value} or leave empty to browse…`;
    footerText.textContent = "Lustpress videos play in this player. For personal viewing only.";
    checkLustpressHealth();
    searchLustpress({ reset: true });
  }
}

function closePlayer() {
  modal.classList.remove("open");
  playerFrame.src = "";
  playerVideo.pause();
  playerVideo.removeAttribute("src");
  playerVideo.load();
  document.body.style.overflow = "";
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

modalClose.addEventListener("click", closePlayer);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closePlayer();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePlayer();
});

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if (activeSource === "indian") {
      loadIndianFeed({ reset: true });
    } else {
      searchLustpress({ reset: true });
    }
  }, 400);
});

tabIndian.addEventListener("click", () => setSource("indian"));
tabLustpress.addEventListener("click", () => setSource("lustpress"));

siteSelect.addEventListener("change", () => {
  searchInput.placeholder = `Search ${siteSelect.value} or leave empty to browse…`;
  searchLustpress({ reset: true });
});

browseBtn.addEventListener("click", () => {
  searchInput.value = "";
  searchLustpress({ reset: true });
});
randomBtn.addEventListener("click", loadRandomLustpress);
loadMoreBtn.addEventListener("click", () => {
  if (activeSource === "indian") {
    indianPage += 1;
    loadIndianFeed({ reset: false });
    return;
  }
  lustpressPage += 1;
  searchLustpress({ reset: false });
});

const FALLBACK_VIDEOS = [
  { id: "2025-9-8-no.-36-dvd", title: "Weekly Playboy — Ai Yamada (2025)", year: "2025", tag: "Latest", description: "Recently uploaded Playboy full nude centerfold DVD." },
  { id: "playmate-video-calendar-1999_202609", title: "Playboy Playmate Video Calendar", year: "1999", tag: "Latest", description: "Full nude Playboy playmates calendar video." },
  { id: "tiffany-fallon-compilation", title: "Playboy Centerfold — Tiffany Fallon", year: "2005", tag: "Latest", description: "Playboy POTY full nude centerfold." },
  { id: "5369y-480p", title: "Playboy — Jennifer Walcott", year: "2001", tag: "Nude", description: "Miss August 2001 full nude Playboy video." },
  { id: "noodlemagazine-video-e-962f-1d-95ac-7-720p", title: "Cybergirl — Hillary Fisher (HD)", year: "2009", tag: "Nude", description: "Full nude HD cybergirl video." },
  { id: "noodlemagazine-video-cc-41044963cd-720p", title: "Cybergirl — Hillary Fisher Xtra (HD)", year: "2009", tag: "Nude", description: "Extended full nude cybergirl HD." },
  { id: "12191662-480p-2", title: "Penthouse — The All Pet Workout", year: "1993", tag: "Nude", description: "Full nude Penthouse workout video." },
  { id: "36xg-4-480p", title: "Danni's Hard Drive — Boob Bowl", year: "2004", tag: "Latest", description: "Full nude adult compilation." },
  { id: "a-series-of-liz-ocean-adult-films", title: "Liz Ocean Adult Films", year: "2020s", tag: "Latest", description: "Recent adult film series upload." },
  { id: "a-series-of-sunnie-daye-adult-films", title: "Sunnie Daye Adult Films", year: "2020s", tag: "Latest", description: "Recent explicit adult film series." },
  { id: "a-night-in-nude-1993-1080p-pvca", title: "A Night in Nude", year: "1993", tag: "Nude", description: "Japanese erotic film 1080p full nude." },
  { id: "20260906-2026-09-06-20-23-21", title: "Hall of Fame — Christy Carrera", year: "1996", tag: "Latest", description: "Recently uploaded full nude feature." },
  { id: "a-free-ride_202607", title: "A Free Ride (1915)", year: "1915", tag: "Classic", description: "One of the earliest known American stag films, now in the public domain." },
  { id: "Rare1930sFrenchFetishStagFilm2SmWithASmile", title: "1930s French Stag Film", year: "1930s", tag: "Vintage", description: "Rare public domain French stag film from the 1930s." },
  { id: "1940sFrenchStagFilmWhippingSpankingFetish", title: "1940s French Stag Film", year: "1940s", tag: "Vintage", description: "1940s French stag film from a public domain collection." },
  { id: "IrvingKlawRare1950sBondageFetishStagFilms", title: "Irving Klaw 1950s Stag Films", year: "1950s", tag: "Vintage", description: "Three rare 1950s bondage stag films." },
  { id: "1960sSmFetishStagFilmDominatrixSpanksSchoolgirlHard", title: "1960s Dominatrix Stag Film (Part 1)", year: "1960s", tag: "Vintage", description: "1960s underground fetish stag film, public domain." },
  { id: "1960sSmFetishStagFilmDominatrixSchoolgirlpart2", title: "1960s Dominatrix Stag Film (Part 2)", year: "1960s", tag: "Vintage", description: "Part two of the 1960s fetish stag film loop." },
  { id: "1960sFetishStagFilmBlackDominatrixDisciplinesWhiteSlaveGirl", title: "1960s Fetish Stag Film", year: "1960s", tag: "Vintage", description: "1960s interracial fetish stag film, public domain." },
  { id: "the-dentist-d.-d.-teoli-jr.-a.-c.", title: "The Dentist (1947–48)", year: "1947", tag: "Classic", description: "Vintage 16mm stag film from Internet Archive." },
  { id: "tulipe-french-german-stag-film-d.-d.-teoli-jr.-a.-c.", title: "Tulipe French-German Stag Film", year: "1920s", tag: "Classic", description: "Rare French stag films from the 1920s–30s." },
  { id: "christmas-eves-d.-d.-teoli-jr.-a.-c.", title: "Christmas Eve's", year: "1940s", tag: "Vintage", description: "Vintage nudie cutie stag film, open content." },
  { id: "Stripper-DancerErotique", title: "Stripper – Dancer Erotique", year: "Vintage", tag: "Burlesque", description: "Vintage erotic dance film from Internet Archive." },
  { id: "MousquetaireAuRestaurant", title: "Mousquetaire Au Restaurant", year: "Vintage", tag: "Classic", description: "Classic vintage erotic short film." },
  { id: "starlight-174-vhs-telecine-d.-d.-teoli-jr.-a.-c.", title: "Starlight 174", year: "Vintage", tag: "Nudie Cutie", description: "Vintage nudie cutie VHS telecine." },
  { id: "private-private-d.-d.-teoli-jr.-a.-c.", title: "Private, Private", year: "Vintage", tag: "Grindhouse", description: "16mm grindhouse stag film, open content." },
  { id: "for-your-lips-only-part-2", title: "For Your Lips Only Part 2", year: "Vintage", tag: "Classic", description: "Vintage erotic film from Internet Archive." },
  { id: "kama-sutra-a-tale-of-love-1996_202605", title: "Kama Sutra: A Tale of Love", year: "1996", tag: "Indian", description: "Mira Nair's Indian erotic drama set in 16th-century India." },
  { id: "utsav-1984-eros-dvd-rip-ac-3-audio", title: "Utsav", year: "1984", tag: "Indian", description: "Classic Bollywood erotic drama starring Rekha." },
  { id: "maya.-memsaab.-1993-hd-rip", title: "Maya Memsaab", year: "1993", tag: "Indian", description: "Deepa Mehta's Indian erotic drama." },
  { id: "jism-2003-xvi-drip-mp-3-ddr", title: "Jism", year: "2003", tag: "Indian", description: "Bollywood erotic thriller starring Bipasha Basu." },
  { id: "Jism22012", title: "Jism 2", year: "2012", tag: "Indian", description: "Bollywood erotic thriller sequel starring Sunny Leone." },
  { id: "hawas-2004-dv-drip-x-264-aac-3-wanxsz", title: "Hawas", year: "2004", tag: "Indian", description: "Bollywood erotic drama about obsession and desire." },
  { id: "hawas-1974-hindi.-web.-dl.-480p.-amazon.-avc.x-264.-aac.-esubs.-by-juleyano", title: "Hawas (1974)", year: "1974", tag: "Indian", description: "Vintage Hindi erotic drama from the 1970s." },
  { id: "RaginiMMS2", title: "Ragini MMS 2", year: "2014", tag: "Indian", description: "Bollywood horror-erotica film starring Sunny Leone." },
  { id: "ragini-mms-complete", title: "Ragini MMS", year: "2011", tag: "Indian", description: "Found-footage style Bollywood erotic horror film." },
  { id: "hate-story-a_202603", title: "Hate Story", year: "2012", tag: "Indian", description: "Bollywood erotic thriller about revenge and seduction." },
];

function init() {
  setSource("indian");
}

init();
