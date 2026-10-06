const homes = [
  { id: "1", name: "1 bed · up to 1,200 sq ft", baths: 1, prices: { weekly: 115, biweekly: 129, monthly: 139, once: 149, deep: 249, move: 279 }, hours: { weekly: 1.75, biweekly: 2.25, monthly: 2.75, once: 2.75, deep: 4, move: 4.5 } },
  { id: "2", name: "2 bed · up to 1,600 sq ft", baths: 2, prices: { weekly: 129, biweekly: 145, monthly: 159, once: 169, deep: 289, move: 319 }, hours: { weekly: 2.25, biweekly: 2.75, monthly: 3.25, once: 3.25, deep: 5.25, move: 5.75 } },
  { id: "3", name: "3 bed · up to 2,200 sq ft", baths: 2, prices: { weekly: 149, biweekly: 165, monthly: 185, once: 199, deep: 349, move: 379 }, hours: { weekly: 3, biweekly: 3.5, monthly: 4, once: 4, deep: 6.25, move: 7 } },
  { id: "4", name: "4 bed · up to 3,000 sq ft", baths: 3, prices: { weekly: 175, biweekly: 189, monthly: 209, once: 229, deep: 399, move: 439 }, hours: { weekly: 4, biweekly: 4.5, monthly: 5.25, once: 5.25, deep: 8, move: 9 } },
  { id: "5", name: "5 bed · up to 3,600 sq ft", baths: 3, prices: { weekly: 199, biweekly: 219, monthly: 245, once: 269, deep: 459, move: 499 }, hours: { weekly: 5, biweekly: 5.75, monthly: 6.75, once: 6.75, deep: 10, move: 11 } }
];
const plans = [
  { id: "weekly", name: "Weekly" },
  { id: "biweekly", name: "Every 2 weeks" },
  { id: "monthly", name: "Monthly" },
  { id: "once", name: "One-time" },
  { id: "deep", name: "Deep clean" },
  { id: "move", name: "Move in / out" }
];
const addons = [
  { id: "oven", name: "Oven interior", price: 25, note: "Maintained ovens. Heavy grease is quoted." },
  { id: "fridge", name: "Fridge interior", price: 25, note: "About 40 minutes." },
  { id: "linen", name: "Change linen", price: 10, note: "Per bed. Leave the sheets out." },
  { id: "windows", name: "Interior windows", price: 40, note: "Reachable glass, up to 8." },
  { id: "laundry", name: "Laundry, 1 load", price: 20, note: "Started on arrival, folded at the end." },
  { id: "cabinets", name: "Inside cabinets", price: 22, note: "You empty them first." },
  { id: "baseboards", name: "Baseboards", price: 18, note: "Included on a deep clean." },
  { id: "microwave", name: "Microwave", price: 8, note: "Interior wipe." }
];
const money = n => "$" + Math.round(n);
const state = { baths: 0, addons: {} };

function selectedHome() { return homes.find(h => h.id === document.getElementById("home").value) || homes[2]; }
function selectedPlan() { return document.getElementById("plan").value || "biweekly"; }

function total() {
  const home = selectedHome();
  const plan = selectedPlan();
  let price = home.prices[plan] + state.baths * 15;
  if (document.getElementById("ownProducts").checked) price -= 8;
  const lines = [];
  addons.forEach(a => {
    if (!state.addons[a.id]) return;
    const qty = a.id === "linen" ? Math.max(1, Number(home.id)) : 1;
    const cost = a.price * qty;
    price += cost;
    lines.push({ name: a.name + (qty > 1 ? " × " + qty : ""), cost });
  });
  return { home, plan, price, hours: home.hours[plan], lines };
}

function renderTable() {
  document.getElementById("priceBody").innerHTML = homes.map(h => `
    <tr><td>${h.name}<div class="fine">${h.baths} bath${h.baths > 1 ? "s" : ""} included</div></td>${plans.map(p => `<td>${money(h.prices[p.id])}<div class="fine">${h.hours[p.id]} hrs</div></td>`).join("")}</tr>`).join("");
}
function renderAddons() {
  document.getElementById("addonList").innerHTML = addons.map(a => `<div class="addon"><span><b>${a.name}</b><br><span class="fine">${a.note}</span></span><b>${money(a.price)}</b></div>`).join("");
  document.getElementById("addonChecks").innerHTML = addons.map(a => `<label class="check"><span>${a.name}</span><span><input type="checkbox" data-addon="${a.id}" /> ${money(a.price)}</span></label>`).join("");
}
function renderQuote() {
  const q = total();
  const planName = plans.find(p => p.id === q.plan).name;
  document.getElementById("summary").innerHTML = `
    <p class="eyebrow">Your visit</p>
    <h3>${money(q.price)}</h3>
    <div class="line"><span>${q.home.name}</span><span></span></div>
    <div class="line"><span>${planName}</span><span>${q.hours} hrs</span></div>
    <div class="line"><span>${q.home.baths} bath${q.home.baths > 1 ? "s" : ""} included</span><span>in price</span></div>
    <div class="line"><span>Extra baths</span><span>${state.baths ? state.baths + " · " + money(state.baths * 15) : "—"}</span></div>
    ${q.lines.map(l => `<div class="line"><span>${l.name}</span><span>${money(l.cost)}</span></div>`).join("")}
    <div class="line total"><span>Estimated total</span><span>${money(q.price)}</span></div>
    <p class="fine">About ${money(q.price / q.hours)} an hour for her time. Request holds on this phone until the calendar is live.</p>`;
}

function init() {
  document.getElementById("home").innerHTML = homes.map(h => `<option value="${h.id}" ${h.id === "3" ? "selected" : ""}>${h.name} · ${h.baths} bath${h.baths > 1 ? "s" : ""} included</option>`).join("");
  document.getElementById("plan").innerHTML = plans.map(p => `<option value="${p.id}" ${p.id === "biweekly" ? "selected" : ""}>${p.name}</option>`).join("");
  renderTable();
  renderAddons();
  renderQuote();
  const showIncluded = () => {
    const home = selectedHome();
    document.getElementById("bathNote").textContent = `${home.baths} bathroom${home.baths > 1 ? "s" : ""} included. Each extra bath is $15.`;
    renderQuote();
  };
  document.querySelectorAll("#quoteForm select, #quoteForm input").forEach(el => el.addEventListener("change", showIncluded));
  showIncluded();
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
      plan: plans.find(p => p.id === q.plan).name,
      total: q.price,
      savedAt: new Date().toISOString()
    };
    const all = JSON.parse(localStorage.getItem("mommy-requests") || "[]");
    all.push(request);
    localStorage.setItem("mommy-requests", JSON.stringify(all));
    document.getElementById("confirm").textContent = `${request.name}, ${request.plan} for ${request.home} at ${money(request.total)}. Preferred day ${request.day || "flexible"}. Saved on this device until login and the calendar are added.`;
    document.getElementById("modal").classList.add("on");
  };
  document.getElementById("close").onclick = () => document.getElementById("modal").classList.remove("on");
}
init();
