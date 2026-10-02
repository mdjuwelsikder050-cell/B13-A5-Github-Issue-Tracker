// ---------- Auth guard ----------
if (sessionStorage.getItem("issueTrackerAuth") !== "true") {
  window.location.replace("index.html");
}

// ---------- Config ----------
const API_BASE = "https://phi-lab-server.vercel.app/api/v1/lab/issues";

// Offline fallback so the UI still works if the API can't be reached.
const FALLBACK_ISSUES = [
  { id: 1, title: "Fix navigation menu on mobile devices", description: "The navigation menu doesn't collapse properly on mobile devices. Need to fix the responsive behavior.", status: "open", labels: ["bug", "help wanted"], priority: "high", author: "john_doe", assignee: "jane_smith", createdAt: "2024-01-15T10:30:00Z", updatedAt: "2024-01-15T10:30:00Z" },
  { id: 2, title: "Add dark mode toggle", description: "Users want a dark mode option in the settings panel.", status: "open", labels: ["enhancement"], priority: "medium", author: "sara_lee", assignee: "", createdAt: "2024-01-16T09:12:00Z", updatedAt: "2024-01-16T09:12:00Z" },
  { id: 3, title: "Update README with setup steps", description: "The installation section is outdated and missing the environment variable list.", status: "closed", labels: ["documentation"], priority: "low", author: "mike_ross", assignee: "john_doe", createdAt: "2024-01-10T14:00:00Z", updatedAt: "2024-01-18T11:45:00Z" },
  { id: 4, title: "Login form accepts empty password", description: "Submitting the form with a blank password still triggers a request to the server.", status: "closed", labels: ["bug"], priority: "high", author: "anna_k", assignee: "mike_ross", createdAt: "2024-01-08T08:20:00Z", updatedAt: "2024-01-12T16:05:00Z" },
  { id: 5, title: "Add pagination to issue list", description: "Loading every issue at once is slow. Add pagination or infinite scroll.", status: "open", labels: ["enhancement", "good first issue"], priority: "medium", author: "tom_h", assignee: "", createdAt: "2024-01-20T13:40:00Z", updatedAt: "2024-01-20T13:40:00Z" },
  { id: 6, title: "Notifications badge shows wrong count", description: "The unread badge does not reset after opening the notification panel.", status: "open", labels: ["bug"], priority: "high", author: "priya_s", assignee: "sara_lee", createdAt: "2024-01-21T07:55:00Z", updatedAt: "2024-01-21T07:55:00Z" },
  { id: 7, title: "Improve color contrast on buttons", description: "Some secondary buttons fail WCAG AA contrast checks.", status: "closed", labels: ["enhancement", "documentation"], priority: "low", author: "leo_m", assignee: "anna_k", createdAt: "2024-01-05T12:00:00Z", updatedAt: "2024-01-09T10:10:00Z" },
  { id: 8, title: "Export issues as CSV", description: "Allow exporting the currently filtered issues into a CSV file.", status: "open", labels: ["enhancement", "help wanted"], priority: "low", author: "nina_p", assignee: "", createdAt: "2024-01-22T15:30:00Z", updatedAt: "2024-01-22T15:30:00Z" }
];

// ---------- State ----------
const state = {
  all: [],          // every issue for the current search ("" = no search)
  tab: "all",
  query: ""
};

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const grid = $("grid");
const spinner = $("spinner");
const emptyBox = $("empty");
const notice = $("notice");
const modalBackdrop = $("modalBackdrop");
const modal = $("modal");

// ---------- Helpers ----------
const escapeHTML = (str = "") =>
  String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d) ? "—" : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const normalizeStatus = (s) => (String(s).toLowerCase() === "closed" ? "closed" : "open");
const normalizePriority = (p) => {
  const v = String(p || "").toLowerCase();
  return ["high", "medium", "low"].includes(v) ? v : "low";
};

function labelClass(name) {
  const n = String(name).toLowerCase();
  if (n.includes("bug")) return "bug";
  if (n.includes("enhancement") || n.includes("feature")) return "enhancement";
  if (n.includes("help")) return "help";
  if (n.includes("doc")) return "docs";
  if (n.includes("good")) return "good";
  return "other";
}

const ICON_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/></svg>';
const ICON_CLOSED = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16 9.5"/></svg>';

const setLoading = (on) => spinner.classList.toggle("hidden", !on);

function showNotice(msg) {
  notice.textContent = msg || "";
  notice.classList.toggle("hidden", !msg);
}

// ---------- Data ----------
function extractList(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.data)) return json.data;
  return [];
}

async function fetchIssues(query = "") {
  const url = query
    ? `${API_BASE}/issues/search?q=${encodeURIComponent(query)}`
    : `${API_BASE}/issues`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return extractList(await res.json());
}

function localSearch(list, q) {
  const needle = q.toLowerCase();
  return list.filter((i) =>
    [i.title, i.description, i.author, ...(i.labels || [])].join(" ").toLowerCase().includes(needle)
  );
}

async function load(query = "") {
  state.query = query;
  setLoading(true);
  showNotice("");
  try {
    state.all = await fetchIssues(query);
  } catch (err) {
    console.warn("API unavailable, using sample data:", err);
    state.all = query ? localSearch(FALLBACK_ISSUES, query) : [...FALLBACK_ISSUES];
    showNotice("Couldn't reach the issues server, so sample data is shown.");
  } finally {
    setLoading(false);
  }
  render();
}

// ---------- Render ----------
function visibleIssues() {
  if (state.tab === "all") return state.all;
  return state.all.filter((i) => normalizeStatus(i.status) === state.tab);
}

function cardHTML(issue) {
  const status = normalizeStatus(issue.status);
  const priority = normalizePriority(issue.priority);
  const labels = (issue.labels || [])
    .map((l) => `<span class="label ${labelClass(l)}">${escapeHTML(l)}</span>`)
    .join("");

  return `
    <button class="card ${status}" data-id="${escapeHTML(issue.id)}" aria-label="Open issue: ${escapeHTML(issue.title)}">
      <div class="card-head">
        <span class="status-pill ${status}">${status === "open" ? ICON_OPEN : ICON_CLOSED}${status}</span>
        <span class="priority ${priority}">${priority}</span>
      </div>
      <h3>${escapeHTML(issue.title)}</h3>
      <p class="desc">${escapeHTML(issue.description)}</p>
      <div class="labels">${labels}</div>
      <div class="card-foot">
        <span>Author: <b>${escapeHTML(issue.author || "unknown")}</b></span>
        <span>Created: <b>${formatDate(issue.createdAt)}</b></span>
      </div>
    </button>`;
}

function render() {
  const list = visibleIssues();
  const open = state.all.filter((i) => normalizeStatus(i.status) === "open").length;
  const closed = state.all.length - open;

  $("issueCount").textContent = list.length;
  $("openCount").textContent = open;
  $("closedCount").textContent = closed;
  $("summaryText").textContent = state.query
    ? `Results for “${state.query}”`
    : "Track and manage your project issues";

  grid.innerHTML = list.map(cardHTML).join("");
  emptyBox.classList.toggle("hidden", list.length > 0);
}

// ---------- Modal ----------
function modalHTML(issue) {
  const status = normalizeStatus(issue.status);
  const priority = normalizePriority(issue.priority);
  const labels = (issue.labels || [])
    .map((l) => `<span class="label ${labelClass(l)}">${escapeHTML(l)}</span>`)
    .join("") || "—";

  return `
    <button class="modal-close" id="modalClose" aria-label="Close">&times;</button>
    <div class="card-head" style="justify-content:flex-start;gap:10px">
      <span class="status-pill ${status}">${status === "open" ? ICON_OPEN : ICON_CLOSED}${status}</span>
      <span class="priority ${priority}">${priority}</span>
    </div>
    <h2 id="modalTitle">${escapeHTML(issue.title)}</h2>
    <div class="labels">${labels}</div>
    <p class="desc">${escapeHTML(issue.description)}</p>
    <dl class="meta">
      <div><dt>Author</dt><dd>${escapeHTML(issue.author || "—")}</dd></div>
      <div><dt>Assignee</dt><dd>${escapeHTML(issue.assignee || "Unassigned")}</dd></div>
      <div><dt>Created</dt><dd>${formatDate(issue.createdAt)}</dd></div>
      <div><dt>Last updated</dt><dd>${formatDate(issue.updatedAt)}</dd></div>
    </dl>
    <div class="modal-actions"><button class="btn-primary" id="modalDone">Close</button></div>`;
}

function paintModal(issue) {
  modal.className = `modal ${normalizeStatus(issue.status)}`;
  modal.innerHTML = modalHTML(issue);
  $("modalClose").addEventListener("click", closeModal);
  $("modalDone").addEventListener("click", closeModal);
  $("modalClose").focus();
}

async function openModal(id) {
  const cached = state.all.find((i) => String(i.id) === String(id));
  modalBackdrop.classList.remove("hidden");
  modalBackdrop.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  if (cached) paintModal(cached);
  else modal.innerHTML = '<div class="spinner small"></div>';

  // Refresh with the full record from the single-issue endpoint
  try {
    const res = await fetch(`${API_BASE}/issue/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(res.status);
    const json = await res.json();
    const fresh = json && json.data ? json.data : json;
    if (fresh && fresh.title && !modalBackdrop.classList.contains("hidden")) paintModal(fresh);
  } catch (err) {
    /* cached card data is already on screen */
  }
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
  modalBackdrop.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// ---------- Events ----------
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", async () => {
    document.querySelectorAll(".tab").forEach((t) => {
      const active = t === btn;
      t.classList.toggle("active", active);
      t.setAttribute("aria-selected", String(active));
    });
    state.tab = btn.dataset.tab;

    // Show the spinner briefly on each category switch, then render from loaded data
    setLoading(true);
    await new Promise((r) => setTimeout(r, 250));
    setLoading(false);
    render();
  });
});

$("searchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  load($("searchInput").value.trim());
});

// Clearing the box restores the full list
$("searchInput").addEventListener("input", (e) => {
  if (e.target.value === "" && state.query !== "") load("");
});

grid.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (card) openModal(card.dataset.id);
});

modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modalBackdrop.classList.contains("hidden")) closeModal();
});

$("logoutBtn").addEventListener("click", () => {
  sessionStorage.removeItem("issueTrackerAuth");
  window.location.href = "index.html";
});

// ---------- Init ----------
load();
