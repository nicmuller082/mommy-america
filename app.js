const homes = [
  { id: "11", name: "1 bedroom, 1 bathroom", beds: 1, baths: 1, standard: { weekly: 60, biweekly: 70, monthly: 85 }, deep: { weekly: 100, biweekly: 110, monthly: 120 } },
  { id: "21", name: "2 bedrooms, 1 bathroom", beds: 2, baths: 1, standard: { weekly: 80, biweekly: 90, monthly: 100 }, deep: { weekly: 130, biweekly: 140, monthly: 150 } },
  { id: "22", name: "2 bedrooms, 2 bathrooms", beds: 2, baths: 2, standard: { weekly: 90, biweekly: 100, monthly: 110 }, deep: { weekly: 150, biweekly: 160, monthly: 180 } },
  { id: "32", name: "3 bedrooms, 2 bathrooms", beds: 3, baths: 2, standard: { weekly: 120, biweekly: 130, monthly: 140 }, deep: { weekly: 180, biweekly: 190, monthly: 210 } },
  { id: "42", name: "4 bedrooms, 2 bathrooms", beds: 4, baths: 2, standard: { weekly: 150, biweekly: 160, monthly: 170 }, deep: { weekly: 230, biweekly: 250, monthly: 270 } },
  { id: "43", name: "4 bedrooms, 3 bathrooms", beds: 4, baths: 3, standard: { weekly: 190, biweekly: 200, monthly: 210 }, deep: { weekly: 300, biweekly: 330, monthly: 360 } }
];
const freqs = [
  { id: "weekly", name: "Weekly" },
  { id: "biweekly", name: "Every 2 weeks" },
  { id: "monthly", name: "Monthly" }
];
const kinds = [
  { id: "standard", name: "Standard cleaning" },
  { id: "deep", name: "Deep cleaning" },
  { id: "move", name: "Move in / move out" },
  { id: "airbnb", name: "Airbnb / short stay" }
];
const addons = [
  { id: "oven", name: "Inside oven", price: 30, note: "Interior only." },
  { id: "fridge", name: "Inside fridge or freezer", price: 20, note: "One appliance." },
  { id: "windows", name: "Interior window", price: 15, note: "Per frame." },
  { id: "sliding", name: "Sliding window", price: 20, note: "Per sliding door or window." },
  { id: "pethair", name: "Pet hair removal", price: 20, note: "Extra pass for hair." },
  { id: "laundry", name: "Laundry, one load", price: 20, note: "Wash, dry, fold." },
  { id: "linen", name: "Bed linen change", price: 10, note: "Leave the sheets out." },
  { id: "dishes", name: "Dishes, light", price: 15, note: "A sink, not a piled counter." },
  { id: "dishesHeavy", name: "Dishes, heavy", price: 20, note: "A full sink." },
  { id: "baseboards", name: "Baseboards", price: 20, note: "Included on a deep clean." },
  { id: "declutter", name: "Decluttering, one hour", price: 30, note: "Per hour." },
  { id: "fans", name: "Ceiling fans", price: 10, note: "Included on a deep clean." },
  { id: "cabinets", name: "Inside cabinets", price: 25, note: "You empty them first." },
  { id: "microwave", name: "Microwave", price: 8, note: "Interior wipe." }
];
const money = n => "$" + Math.round(n);
const state = { baths: 0, addons: {} };

function selectedHome() { return homes.find(h => h.id === document.getElementById("home").value) || homes[3]; }
function selectedFreq() { return document.getElementById("freq").value || "biweekly"; }
function selectedKind() { return document.getElementById("kind").value || "standard"; }

function priceFor(home, kind, freq) {
  const card = kind === "standard" ? home.standard : home.deep;
  return card[freq];
}

function total() {
  const home = selectedHome();
  const freq = selectedFreq();
  const kind = selectedKind();
  let price = priceFor(home, kind, freq) + state.baths * 20;
  const lines = [];
  if (document.getElementById("ownSupplies").checked) {
    price += 10;
    lines.push({ name: "Her supplies", cost: 10 });
  }
  addons.forEach(a => {
    if (!state.addons[a.id]) return;
    if ((a.id === "baseboards" || a.id === "fans") && kind !== "standard") return;
    price += a.price;
    lines.push({ name: a.name, cost: a.price });
  });
  return { home, freq, kind, price, lines };
}

function renderTables() {
  const head = freqs.map(f => `<th>${f.name}</th>`).join("");
  document.getElementById("standardHead").innerHTML = `<tr><th>Home</th>${head}</tr>`;
  document.getElementById("deepHead").innerHTML = `<tr><th>Home</th>${head}</tr>`;
  document.getElementById("standardBody").innerHTML = homes.map(h => `<tr><td>${h.name}</td>${freqs.map(f => `<td>${money(h.standard[f.id])}</td>`).join("")}</tr>`).join("");
  document.getElementById("deepBody").innerHTML = homes.map(h => `<tr><td>${h.name}</td>${freqs.map(f => `<td>${money(h.deep[f.id])}</td>`).join("")}</tr>`).join("");
}
function renderAddons() {
  document.getElementById("addonList").innerHTML = addons.map(a => `<div class="addon"><span><b>${a.name}</b><br><span class="fine">${a.note}</span></span><b>${money(a.price)}</b></div>`).join("");
  document.getElementById("addonChecks").innerHTML = addons.map(a => `<label class="check"><span>${a.name}</span><span><input type="checkbox" data-addon="${a.id}" /> ${money(a.price)}</span></label>`).join("");
}
function renderQuote() {
  const q = total();
  const kindName = kinds.find(k => k.id === q.kind).name;
  const freqName = freqs.find(f => f.id === q.freq).name;
  const pricedAs = q.kind === "standard" ? "" : `<div class="line"><span>Priced from the deep card</span><span></span></div>`;
  document.getElementById("summary").innerHTML = `
    <p class="script" style="font-size:28px;margin:0">Your visit</p>
    <h3>${money(q.price)}</h3>
    <div class="line"><span>${q.home.name}</span><span></span></div>
    <div class="line"><span>${kindName}</span><span>${freqName}</span></div>
    ${pricedAs}
    <div class="line"><span>${q.home.baths} bathroom${q.home.baths > 1 ? "s" : ""} included</span><span>in the price</span></div>
    <div class="line"><span>Extra bathrooms</span><span>${state.baths ? state.baths + " · " + money(state.baths * 20) : "—"}</span></div>
    ${q.lines.map(l => `<div class="line"><span>${l.name}</span><span>${money(l.cost)}</span></div>`).join("")}
    <div class="line total"><span>Estimated total</span><span>${money(q.price)}</span></div>
    <p class="fine">Travel outside Katy, Richmond, and Sugar Land is quoted per request. Supplies are $10 if she brings them.</p>`;
  document.getElementById("bathNote").textContent = `${q.home.baths} bathroom${q.home.baths > 1 ? "s" : ""} included. Each extra bathroom is $20.`;
}

function init() {
  document.getElementById("home").innerHTML = homes.map(h => `<option value="${h.id}" ${h.id === "32" ? "selected" : ""}>${h.name}</option>`).join("");
  document.getElementById("kind").innerHTML = kinds.map(k => `<option value="${k.id}">${k.name}</option>`).join("");
  document.getElementById("freq").innerHTML = freqs.map(f => `<option value="${f.id}" ${f.id === "biweekly" ? "selected" : ""}>${f.name}</option>`).join("");
  renderTables();
  renderAddons();
  renderQuote();
  document.querySelectorAll("#quoteForm select, #quoteForm input").forEach(el => el.addEventListener("change", renderQuote));
  document.getElementById("addonChecks").addEventListener("change", e => {
    if (e.target.dataset.addon) state.addons[e.target.dataset.addon] = e.target.checked;
    renderQuote();
  });
  document.getElementById("bathPlus").onclick = () => { state.baths = Math.min(4, state.baths + 1); document.getElementById("baths").textContent = state.baths; renderQuote(); };
  document.getElementById("bathMinus").onclick = () => { state.baths = Math.max(0, state.baths - 1); document.getElementById("baths").textContent = state.baths; renderQuote(); };
  document.getElementById("quoteForm").onsubmit = e => {
    e.preventDefault();
    const q = total();
    const request = {
      name: document.getElementById("name").value,
      phone: document.getElementById("phone").value,
      address: document.getElementById("address").value,
      day: document.getElementById("day").value,
      notes: document.getElementById("notes").value,
      home: q.home.name,
      kind: kinds.find(k => k.id === q.kind).name,
      freq: freqs.find(f => f.id === q.freq).name,
      total: q.price,
      savedAt: new Date().toISOString()
    };
    const all = JSON.parse(localStorage.getItem("mommy-requests") || "[]");
    all.push(request);
    localStorage.setItem("mommy-requests", JSON.stringify(all));
    document.getElementById("confirm").textContent = `${request.name}, ${request.kind} (${request.freq}) for ${request.home} at ${money(request.total)}. Preferred day ${request.day || "flexible"}. Call 346-833-5797 to confirm.`;
    document.getElementById("modal").classList.add("on");
  };
  document.getElementById("close").onclick = () => document.getElementById("modal").classList.remove("on");
}
init();
