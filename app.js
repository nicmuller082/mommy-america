const homes = [
  { id: "11", name: "1 bedroom, 1 bathroom", beds: 1, baths: 1, standard: { weekly: 60, biweekly: 70, monthly: 85 }, deep: { weekly: 100, biweekly: 110, monthly: 120 }, hours: { standard: 1.5, deep: 2.5 } },
  { id: "21", name: "2 bedrooms, 1 bathroom", beds: 2, baths: 1, standard: { weekly: 80, biweekly: 90, monthly: 100 }, deep: { weekly: 130, biweekly: 140, monthly: 150 }, hours: { standard: 2, deep: 3.25 } },
  { id: "22", name: "2 bedrooms, 2 bathrooms", beds: 2, baths: 2, standard: { weekly: 90, biweekly: 100, monthly: 110 }, deep: { weekly: 150, biweekly: 160, monthly: 180 }, hours: { standard: 2.25, deep: 3.75 } },
  { id: "32", name: "3 bedrooms, 2 bathrooms", beds: 3, baths: 2, standard: { weekly: 120, biweekly: 130, monthly: 140 }, deep: { weekly: 180, biweekly: 190, monthly: 210 }, hours: { standard: 3, deep: 4.5 } },
  { id: "42", name: "4 bedrooms, 2 bathrooms", beds: 4, baths: 2, standard: { weekly: 150, biweekly: 160, monthly: 170 }, deep: { weekly: 230, biweekly: 250, monthly: 270 }, hours: { standard: 3.75, deep: 5.5 } },
  { id: "43", name: "4 bedrooms, 3 bathrooms", beds: 4, baths: 3, standard: { weekly: 190, biweekly: 200, monthly: 210 }, deep: { weekly: 300, biweekly: 330, monthly: 360 }, hours: { standard: 4.25, deep: 6.25 } }
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
const addonMinutes = { oven: 30, fridge: 30, windows: 15, sliding: 20, pethair: 30, laundry: 20, linen: 10, dishes: 15, dishesHeavy: 25, baseboards: 30, declutter: 60, fans: 10, cabinets: 30, microwave: 10 };
const zones = {
  cinco: { name: "Cinco Ranch", drive: 15, ok: true },
  richmond: { name: "Richmond", drive: 15, ok: true },
  katywest: { name: "West Katy", drive: 20, ok: true },
  sugarwest: { name: "Sugar Land west of 99", drive: 25, ok: true },
  sugareast: { name: "Sugar Land east", drive: 35, ok: false },
  houston: { name: "Houston", drive: 50, ok: false }
};
const DAY_START = 8 * 60;
const HARD_LEAVE = 14 * 60 + 30;
const BUS = 15 * 60;
const money = n => "$" + Math.round(n);
const state = { baths: 0, addons: {} };

function durationMinutes(home, kind) {
  const base = (kind === "standard" ? home.hours.standard : home.hours.deep) * 60;
  const extra = state.baths * 25 + addons.reduce((sum, a) => sum + (state.addons[a.id] && !((a.id === "baseboards" || a.id === "fans") && kind !== "standard") ? addonMinutes[a.id] : 0), 0);
  return Math.round(base + extra);
}
function latestLeave(zone) { return Math.min(HARD_LEAVE, BUS - zone.drive - 5); }
function fmt(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}
function bookings() { return JSON.parse(localStorage.getItem("mommy-bookings") || "[]"); }
function taken(date, start, end) {
  return bookings().some(b => b.date === date && start < b.end && end > b.start);
}

function selectedHome() { return homes.find(h => h.id === document.getElementById("home").value) || homes[3]; }
function selectedFreq() { return document.getElementById("freq").value || "biweekly"; }
function selectedKind() { return document.getElementById("kind").value || "standard"; }

function priceFor(home, kind, freq) {
  const card = kind === "standard" ? home.standard : home.deep;
  return card[freq];
}

function quote() {
  const home = selectedHome();
  const freq = selectedFreq();
  const kind = selectedKind();
  const zone = zones[document.getElementById("zone").value] || zones.cinco;
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
  const minutes = durationMinutes(home, kind);
  const leaveBy = latestLeave(zone);
  const zoneNote = zone.ok
    ? `${zone.name} is about ${zone.drive} minutes home, so she can leave by ${fmt(leaveBy)} and make the 3:00 bus.`
    : `${zone.name} is about ${zone.drive} minutes home. She cannot finish at 2:30 and make the 3:00 bus. Book only if she leaves by ${fmt(leaveBy)}.`;
  return { home, freq, kind, price, lines, minutes, leaveBy, zone, zoneNote };
}
function fillStarts(q) {
  const date = document.getElementById("day").value;
  const select = document.getElementById("start");
  const previous = select.value;
  const weekday = date ? new Date(date + "T12:00:00").getDay() : 1;
  if (date && (weekday === 0 || weekday === 6)) {
    select.innerHTML = `<option value="">Monday to Friday only</option>`;
    document.getElementById("timeNote").textContent = "She does not book Saturday or Sunday.";
    return;
  }
  const options = [];
  for (let start = DAY_START; start + q.minutes <= q.leaveBy; start += 30) {
    const end = start + q.minutes;
    if (date && taken(date, start, end)) continue;
    options.push(`<option value="${start}">${fmt(start)} – ${fmt(end)}</option>`);
  }
  select.innerHTML = options.length ? options.join("") : `<option value="">No start fits before ${fmt(q.leaveBy)}</option>`;
  if (previous && [...select.options].some(o => o.value === previous)) select.value = previous;
  document.getElementById("timeNote").textContent = options.length
    ? `This visit is ${fmt(q.minutes).replace(":", "h ")}m. She is on site from 8:00 and must leave by ${fmt(q.leaveBy)}.`
    : `This visit is too long to finish and still reach the bus. Drop an add-on or pick a smaller clean.`;
}
function ics(booking) {
  const stamp = booking.date.replace(/-/g, "");
  const start = stamp + "T" + fmt(booking.start).replace(":", "") + "00";
  const end = stamp + "T" + fmt(booking.end).replace(":", "") + "00";
  return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Mommy America//Booking//EN\nBEGIN:VEVENT\nDTSTART:${start}\nDTEND:${end}\nSUMMARY:Mommy America · ${booking.home}\nLOCATION:${booking.address}\nDESCRIPTION:${booking.kind}. ${booking.notes || ""}\nEND:VEVENT\nEND:VCALENDAR`;
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
  const q = quote();
  const kindName = kinds.find(k => k.id === q.kind).name;
  const freqName = freqs.find(f => f.id === q.freq).name;
  const pricedAs = q.kind === "standard" ? "" : `<div class="line"><span>Priced from the deep card</span><span></span></div>`;
  fillStarts(q);
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
    <div class="line"><span>On site</span><span>${fmt(q.minutes)} · leave by ${fmt(q.leaveBy)}</span></div>
    <p class="fine">${q.zoneNote} A booking file downloads for Apple Calendar. An existing event on this phone blocks the slot. Her other Apple events need the iCloud link before they can block the page.</p>`;
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
    const q = quote();
    const start = Number(document.getElementById("start").value);
    if (!document.getElementById("day").value || !start) return alert("Pick a weekday and a start time that ends before she has to leave.");
    const booking = {
      name: document.getElementById("name").value,
      phone: document.getElementById("phone").value,
      address: document.getElementById("address").value,
      date: document.getElementById("day").value,
      start,
      end: start + q.minutes,
      notes: document.getElementById("notes").value,
      home: q.home.name,
      kind: kinds.find(k => k.id === q.kind).name,
      total: q.price
    };
    const all = bookings();
    all.push(booking);
    localStorage.setItem("mommy-bookings", JSON.stringify(all));
    const file = new Blob([ics(booking)], { type: "text/calendar" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = "mommy-america-booking.ics";
    link.click();
    document.getElementById("confirm").textContent = `${booking.name}, ${booking.kind} at ${booking.address} on ${booking.date}, ${fmt(booking.start)} to ${fmt(booking.end)}. Open the downloaded file to add it to Apple Calendar.`;
    document.getElementById("modal").classList.add("on");
  };
  document.getElementById("close").onclick = () => document.getElementById("modal").classList.remove("on");
}
init();
