(() => {
  const data = window.DEALS_DATA || { deals: [] };
  const deals = Array.isArray(data.deals) ? data.deals : [];

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
    lastUpdated: document.getElementById("lastUpdated"),
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
    el.lastUpdated.textContent = formatDate(data.lastUpdated);
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
      <article class="deal-card ${deal.status === "history" ? "history" : ""}">
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
            ${action}
            <span class="status ${escapeHtml(deal.status)}">${statusLabel}</span>
          </div>
        </div>
      </article>
    `;
  }

  function render() {
    const items = filteredDeals();
    el.grid.innerHTML = items.map(card).join("");
    el.empty.hidden = items.length > 0;
  }

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

  summary();
  render();
})();
