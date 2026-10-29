(() => {
  let data = { deals: [] };
  let deals = [];
  let refreshInFlight = false;
  let lastOpenButton = null;

  const state = {
    category: "all",
    search: "",
    sort: "newest"
  };

  const el = {
    grid: document.getElementById("dealGrid"),
    empty: document.getElementById("emptyState"),
    notice: document.getElementById("notice"),
    search: document.getElementById("searchInput"),
    sort: document.getElementById("sortSelect"),
    tabs: document.getElementById("categoryTabs"),
    lastChecked: document.getElementById("lastChecked"),
    lastCheckNote: document.getElementById("lastCheckNote"),
    lastDealAdded: document.getElementById("lastDealAdded"),
    dialog: document.getElementById("dealDialog"),
    dialogContent: document.getElementById("dialogContent"),
    dialogClose: document.getElementById("dialogClose"),
    activeCount: document.getElementById("activeCount"),
    smartHomeCount: document.getElementById("smartHomeCount"),
    homelabCount: document.getElementById("homelabCount"),
    historyCount: document.getElementById("historyCount")
  };

  const formatSEK = value =>
    typeof value === "number"
      ? new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(value)
      : "–";

  const formatDate = value => {
    if (!value) return "–";
    const d = new Date(value);
    return Number.isNaN(d.valueOf())
      ? value
      : new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium" }).format(d);
  };

  const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const iconFor = deal => deal.category === "homelab" ? "🖥️" : "🏠";

  function summary() {
    el.lastChecked.textContent = data.lastChecked ? formatDate(data.lastChecked) : "Ej verifierad";
    el.lastCheckNote.textContent = data.lastCheckNote || (data.lastChecked ? "Körningen slutfördes." : "Inväntar nästa bekräftade körning.");
    el.lastDealAdded.textContent = formatDate(data.lastDealAdded);
    el.activeCount.textContent = deals.filter(d => d.status === "active").length;
    el.smartHomeCount.textContent = deals.filter(d => d.category === "smart-home" && d.status === "active").length;
    el.homelabCount.textContent = deals.filter(d => d.category === "homelab" && d.status === "active").length;
    el.historyCount.textContent = deals.filter(d => d.status === "history").length;
    el.notice.textContent = data.note || "";
  }

  function filteredDeals() {
    const q = state.search.trim().toLowerCase();

    return deals
      .filter(deal => {
        if (state.category === "history" && deal.status !== "history") return false;
        if (state.category === "smart-home" && deal.category !== "smart-home") return false;
        if (state.category === "homelab" && deal.category !== "homelab") return false;

        if (!q) return true;
        const haystack = [
          deal.name, deal.store, deal.compatibility, deal.protocol,
          deal.description, deal.limitation
        ].join(" ").toLowerCase();

        return haystack.includes(q);
      })
      .sort((a, b) => {
        if (state.sort === "discount") return (b.discountPercent ?? -1) - (a.discountPercent ?? -1);
        if (state.sort === "price-low") return (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER);
        if (state.sort === "price-high") return (b.price ?? -1) - (a.price ?? -1);
        return new Date(b.date || 0) - new Date(a.date || 0);
      });
  }

  function card(deal) {
    const discount = typeof deal.discountPercent === "number"
      ? `<span class="discount">−${escapeHtml(deal.discountPercent.toLocaleString("sv-SE", { maximumFractionDigits: 1 }))} %</span>`
      : "";

    const reference = typeof deal.referencePrice === "number"
      ? `<span class="reference-price">${formatSEK(deal.referencePrice)}</span>`
      : "";

    const media = deal.imageUrl
      ? `<img src="${escapeHtml(deal.imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : `<span class="product-placeholder" aria-hidden="true">${iconFor(deal)}</span>`;

    const action = deal.productUrl
      ? `<a class="link-button" href="${escapeHtml(deal.productUrl)}" target="_blank" rel="noopener noreferrer">Till butiken ↗</a>`
      : `<span class="link-button disabled">Ingen länk ännu</span>`;

    const statusLabel = deal.status === "active" ? "Aktuellt" : "Historik";

    return `
      <article class="deal-card ${deal.status === "history" ? "history" : ""} ${deal.id !== "homelab-placeholder" ? "clickable" : ""}" data-deal-id="${escapeHtml(deal.id)}">
        <div class="product-media">${media}</div>
        <div class="card-body">
          <div class="meta-row">
            <span class="store">${escapeHtml(deal.store)}</span>
            <span>${formatDate(deal.date)}</span>
          </div>

          <h2>${escapeHtml(deal.name)}</h2>

          <div class="price-row">
            <span class="price">${formatSEK(deal.price)}</span>
            ${reference}
            ${discount}
          </div>

          <div class="badge-row">
            <span class="badge local">${escapeHtml(deal.compatibility)}</span>
            <span class="badge">${escapeHtml(deal.protocol)}</span>
            ${deal.extraHub ? `<span class="badge">Extra hubb: ${escapeHtml(deal.extraHub)}</span>` : ""}
          </div>

          <p class="description">${escapeHtml(deal.description)}</p>
          <p class="limitation">${escapeHtml(deal.limitation)}</p>

          <div class="card-actions">
            ${deal.id !== "homelab-placeholder" ? `<button class="details-button" type="button" data-open-deal="${escapeHtml(deal.id)}" aria-label="Visa detaljer om ${escapeHtml(deal.name)}">Visa detaljer</button>` : ""}
            ${action}
            <span class="status ${escapeHtml(deal.status)}">${statusLabel}</span>
          </div>
        </div>
      </article>
    `;
  }

function safeProductUrl(value) {
  if (!value) return "";
  try {
    const u = new URL(value, document.baseURI);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
  } catch {
    return "";
  }
}

function detailHtml(deal) {
  const imageUrl = safeProductUrl(deal.imageUrl);
  const productUrl = safeProductUrl(deal.productUrl);
  const image = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
    : `<span class="product-placeholder" aria-hidden="true">${iconFor(deal)}</span>`;
  const price = typeof deal.price === "number" ? `<span class="price">${formatSEK(deal.price)}</span>` : "";
  const reference = typeof deal.referencePrice === "number" ? `<span class="reference-price">${formatSEK(deal.referencePrice)}</span>` : "";
  const discount = typeof deal.discountPercent === "number" ? `<span class="discount">−${escapeHtml(deal.discountPercent.toLocaleString("sv-SE", { maximumFractionDigits: 1 }))} %</span>` : "";
  const uses = Array.isArray(deal.useCases) ? deal.useCases.filter(x => typeof x === "string" && x.trim()) : [];
  const useList = uses.length ? `<ul>${uses.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : "<p>Inga konkreta användningsexempel är registrerade ännu.</p>";
  const shopLink = productUrl ? `<a class="link-button" href="${escapeHtml(productUrl)}" target="_blank" rel="noopener noreferrer">Öppna hos ${escapeHtml(deal.store)}</a>` : "";
  const statusText = deal.status === "history" ? "Historiskt fynd – pris och lager är inte verifierade som aktuella." : "Tidigare rapporterat aktivt fynd – kontrollera butikens pris och lager före köp.";
  return `
    <div class="detail-layout">
      <div class="detail-media">${image}</div>
      <div class="detail-main">
        <p class="detail-kicker">${escapeHtml(deal.store)} · Rapporterat ${formatDate(deal.date)}</p>
        <h2 id="dialogTitle">${escapeHtml(deal.name)}</h2>
        <div class="detail-price">${price}${reference}${discount}</div>
        <div class="badge-row">
          <span class="badge local">${escapeHtml(deal.compatibility)}</span>
          <span class="badge">${escapeHtml(deal.protocol)}</span>
          ${deal.extraHub ? `<span class="badge">Extra hubb: ${escapeHtml(deal.extraHub)}</span>` : ""}
        </div>
        <p class="detail-description">${escapeHtml(deal.description)}</p>
        <section class="detail-section"><h3>Varför är det här ett intressant fynd?</h3><p>${escapeHtml(deal.whyGoodDeal || "En särskild prismotivering har inte registrerats ännu.")}</p></section>
        <section class="detail-section"><h3>Så kan du använda produkten</h3>${useList}</section>
        <section class="detail-section"><h3>Hur passar den i din setup?</h3><p>${escapeHtml(deal.fitForSetup || "En bedömning för din Homey- och Home Assistant-miljö har inte registrerats ännu.")}</p></section>
        <section class="detail-section"><h3>Att tänka på</h3><p class="detail-warning">${escapeHtml(deal.limitation || "Kontrollera aktuella villkor och kompatibilitet.")}</p></section>
        <div class="detail-actions">${shopLink}<span class="detail-status">${statusText}</span></div>
      </div>
    </div>`;
}

function openDeal(id, trigger) {
  const deal = deals.find(x => x.id === id);
  if (!deal || deal.id === "homelab-placeholder") return;
  lastOpenButton = trigger || null;
  el.dialogContent.innerHTML = detailHtml(deal);
  if (!el.dialog.open) el.dialog.showModal();
  el.dialogClose.focus();
}

function onDealGridClick(event) {
  const trigger = event.target.closest("button[data-open-deal]");
  if (trigger) {
    openDeal(trigger.dataset.openDeal, trigger);
    return;
  }
  if (event.target.closest("a,button")) return;
  const card = event.target.closest(".deal-card[data-deal-id]");
  if (card) openDeal(card.dataset.dealId, card.querySelector("button[data-open-deal]"));
}

  function render() {
    const items = filteredDeals();
    el.grid.innerHTML = items.map(card).join("");
    el.empty.hidden = items.length > 0;
  }

  el.grid.addEventListener("click", onDealGridClick);
  el.dialogClose.addEventListener("click", () => el.dialog.close());
  el.dialog.addEventListener("click", event => {
    if (event.target === el.dialog) el.dialog.close();
  });
  el.dialog.addEventListener("close", () => {
    if (lastOpenButton && document.contains(lastOpenButton)) lastOpenButton.focus();
    lastOpenButton = null;
  });

  el.tabs.addEventListener("click", event => {
    const button = event.target.closest("button[data-category]");
    if (!button) return;

    state.category = button.dataset.category;
    el.tabs.querySelectorAll(".tab").forEach(tab => tab.classList.toggle("active", tab === button));
    render();
  });

  el.search.addEventListener("input", () => {
    state.search = el.search.value;
    render();
  });

  el.sort.addEventListener("change", () => {
    state.sort = el.sort.value;
    render();
  });

  // Load deal data with a unique URL so browser and CDN caches cannot keep an old version.
  // Poll while the dashboard is open, and also refresh when the user returns to the tab.
  function refreshDeals() {
    if (refreshInFlight || document.visibilityState === "hidden") return;
    refreshInFlight = true;

    const script = document.createElement("script");
    const url = new URL("./deals.js", document.baseURI);
    url.searchParams.set("v", Date.now().toString());
    script.src = url.href;
    script.async = true;

    const finish = () => {
      refreshInFlight = false;
      script.remove();
    };

    script.onload = () => {
      const latest = window.DEALS_DATA;
      if (latest && Array.isArray(latest.deals)) {
        if (JSON.stringify(latest) !== JSON.stringify(data)) {
          data = latest;
          deals = latest.deals;
          summary();
          render();
        }
      } else if (!deals.length) {
        el.notice.textContent = "Fynddatan kunde inte läsas. Försök ladda om sidan.";
      }
      finish();
    };

    script.onerror = () => {
      if (!deals.length) {
        el.notice.textContent = "Kunde inte hämta fynddata. Kontrollera anslutningen och försök igen.";
      }
      finish();
    };

    document.head.appendChild(script);
  }

  el.notice.textContent = "Hämtar senaste fynd...";
  refreshDeals();
  setInterval(refreshDeals, 5 * 60 * 1000);
  window.addEventListener("focus", refreshDeals);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshDeals();
  });
})();
