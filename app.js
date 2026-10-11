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
  { id: "windows", name: "Interior window", price: 5, note: "Per frame." },
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
const localZips = { "77406": "Richmond", "77407": "Cinco Ranch / Richmond", "77450": "Katy", "77469": "Richmond", "77494": "Katy / Grand Lakes" };
function areaFor(zip) {
  const clean = (zip || "").replace(/\D/g, "").slice(0, 5);
  if (clean.length < 5) return null;
  return localZips[clean]
    ? { ok: true, name: localZips[clean], note: "In area. No travel fee." }
    : { ok: false, name: "Out of area", note: "Out of area. Travel fee to be confirmed from the street address." };
}
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
let appleBusy = [];
function taken(date, start, end) {
  const local = bookings().some(b => b.date === date && start < b.end && end > b.start);
  const apple = appleBusy.some(b => start < b.end && end > b.start);
  return local || apple;
}
async function loadStatus() {
  const note = document.getElementById("calStatus");
  if (!note) return;
  try {
    const data = await fetch("/api/status").then(r => r.json());
    if (!data.connected) {
      note.textContent = data.error || "Calendar is not connected.";
      return;
    }
    const names = data.calendars.map(item => `${item.account}: ${item.calendars.join(", ")}`).join(" · ");
    note.textContent = "Calendar linked. " + names;
  } catch (err) {
    note.textContent = "Calendar check failed. This URL may still be the static site.";
  }
}
async function loadApple(date) {
  appleBusy = [];
  if (!date) return;
  try {
    const response = await fetch("/api/busy?date=" + date);
    const data = await response.json();
    appleBusy = data.busy || [];
    const note = document.getElementById("timeNote");
    if (!data.connected && note) note.textContent = data.error || "Apple Calendar is not connected yet.";
  } catch (err) {
    appleBusy = [];
  }
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
  const area = areaFor(document.getElementById("zip")?.value);
  const zone = area?.ok === false ? { name: area.name, drive: 25, ok: false } : { name: area?.name || "Local", drive: 12, ok: true };
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
  const zoneNote = area
    ? area.note
    : "Enter the ZIP code to confirm whether this address is in area.";
  return { home, freq, kind, price, lines, minutes, leaveBy, zone, zoneNote, area };
}
function nextWeekdays(count) {
  const days = [];
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  while (days.length < count) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}
function openStarts(date, q) {
  const starts = [];
  for (let start = DAY_START; start + q.minutes <= q.leaveBy; start += 30) {
    if (!taken(date, start, start + q.minutes)) starts.push(start);
  }
  return starts;
}
function renderBoard(q) {
  const board = document.getElementById("dayboard");
  const week = document.getElementById("week");
  if (!board || !week) return;
  const selected = document.getElementById("day").value || nextWeekdays(1)[0];
  document.getElementById("day").value = selected;
  week.innerHTML = nextWeekdays(8).map(date => {
    const label = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
    const full = date === selected && openStarts(date, q).length === 0;
    return `<button type="button" class="${date === selected ? "on" : ""}" data-date="${date}">${label}${full ? "<br>Fully booked" : ""}</button>`;
  }).join("");
  const opens = openStarts(selected, q);
  if (!opens.length) {
    board.innerHTML = `<div class="slot busy"><span>8:00 – 14:30</span><b>Fully booked</b></div><p class="fine">No availability for this visit on this day.</p>`;
    return;
  }
  const booked = appleBusy.map(b => `<div class="slot busy"><span>${fmt(b.start)} – ${fmt(b.end)}</span><b>Booked</b></div>`).join("");
  const open = opens.map(start => `<div class="slot open${String(start) === document.getElementById("start").value ? " pick" : ""}" data-start="${start}"><span>${fmt(start)} – ${fmt(start + q.minutes)}</span><b>Open</b></div>`).join("");
  board.innerHTML = booked + open;
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
  select.innerHTML = options.length ? options.join("") : `<option value="">No availability</option>`;
  if (previous && [...select.options].some(o => o.value === previous)) select.value = previous;
  document.getElementById("timeNote").textContent = options.length
    ? `This visit is ${fmt(q.minutes).replace(":", "h ")}m. She is on site from 8:00 and must leave by ${fmt(q.leaveBy)}.`
    : `No availability. This visit does not fit before ${fmt(q.leaveBy)}.`;
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
  const list = document.getElementById("addonList");
  if (list) list.innerHTML = addons.map(a => `<div class="addon"><span><b>${a.name}</b><br><span class="fine">${a.note}</span></span><b>${money(a.price)}</b></div>`).join("");
  const checks = document.getElementById("addonChecks");
  if (checks) checks.innerHTML = addons.map(a => `<label class="check"><span>${a.name}<br><span class="fine">${addonMinutes[a.id]} min</span></span><span><input type="checkbox" data-addon="${a.id}" /> ${money(a.price)}</span></label>`).join("");
}
function renderQuote() {
  const q = quote();
  const kindName = kinds.find(k => k.id === q.kind).name;
  const freqName = freqs.find(f => f.id === q.freq).name;
  const pricedAs = q.kind === "standard" ? "" : `<div class="line"><span>Priced from the deep card</span><span></span></div>`;
  fillStarts(q);
  if (!document.getElementById("availability").hidden) renderBoard(q);
  document.getElementById("summary").innerHTML = `
    <p class="script" style="font-size:28px;margin:0">Your visit</p>
    <h3>${money(q.price)}</h3>
    <div class="line"><span>${q.home.name}</span><span></span></div>
    <div class="line"><span>${kindName}</span><span>${freqName}</span></div>
    ${pricedAs}
    <div class="line"><span>${q.home.baths} bathroom${q.home.baths > 1 ? "s" : ""} included</span><span>in the price</span></div>
    <div class="line"><span>Extra bathrooms</span><span>${state.baths ? state.baths + " · " + money(state.baths * 20) : "—"}</span></div>
    ${q.lines.map(l => `<div class="line"><span>${l.name}</span><span>${money(l.cost)}</span></div>`).join("")}
    ${q.area && !q.area.ok ? `<div class="line"><span>Travel fee</span><span>To be confirmed</span></div>` : ""}
    <div class="line"><span>Estimated time</span><span>${fmt(q.minutes)} on site</span></div>
    <div class="line total"><span>Estimated total</span><span>${money(q.price)}</span></div>
    <p class="fine">${q.zoneNote}</p>`;
  const flag = document.getElementById("areaFlag");
  if (flag) {
    flag.innerHTML = q.area ? `<span class="badge ${q.area.ok ? "in" : "out"}">${q.area.ok ? "In area" : "Out of area"}</span> ${q.area.note}` : "Enter the ZIP to confirm the area.";
  }
  document.getElementById("bathNote").textContent = `${q.home.baths} bathroom${q.home.baths > 1 ? "s" : ""} included. Each extra bathroom is $20.`;
}

function showAvailability() {
  document.getElementById("availability").hidden = false;
  document.getElementById("bookingFields").hidden = false;
  document.getElementById("confirmQuote").hidden = true;
  if (!document.getElementById("day").value) document.getElementById("day").value = nextWeekdays(1)[0];
  loadApple(document.getElementById("day").value).then(renderQuote);
  document.getElementById("availability").scrollIntoView({ behavior: "smooth" });
}
function init() {
  if (document.getElementById("standardBody")) renderTables();
  if (document.getElementById("addonList") || document.getElementById("addonChecks")) renderAddons();
  if (!document.getElementById("quoteForm")) return;
  document.getElementById("home").innerHTML = homes.map(h => `<option value="${h.id}" ${h.id === "32" ? "selected" : ""}>${h.name}</option>`).join("");
  document.getElementById("kind").innerHTML = kinds.map(k => `<option value="${k.id}">${k.name}</option>`).join("");
  document.getElementById("freq").innerHTML = freqs.map(f => `<option value="${f.id}" ${f.id === "biweekly" ? "selected" : ""}>${f.name}</option>`).join("");
  renderQuote();
  document.getElementById("zip")?.addEventListener("input", renderQuote);
  document.getElementById("week")?.addEventListener("click", async e => {
    const date = e.target.dataset.date;
    if (!date) return;
    document.getElementById("day").value = date;
    await loadApple(date);
    renderQuote();
  });
  document.getElementById("dayboard")?.addEventListener("click", e => {
    const slot = e.target.closest(".slot.open");
    if (!slot) return;
    document.getElementById("start").value = slot.dataset.start;
    renderQuote();
  });
  document.querySelectorAll("#quoteForm select, #quoteForm input").forEach(el => {
    if (el.id !== "day") el.addEventListener("change", renderQuote);
  });
  document.getElementById("addonChecks").addEventListener("change", e => {
    if (e.target.dataset.addon) state.addons[e.target.dataset.addon] = e.target.checked;
    renderQuote();
  });
  document.getElementById("bathPlus").onclick = () => { state.baths = Math.min(4, state.baths + 1); document.getElementById("baths").textContent = state.baths; renderQuote(); };
  document.getElementById("bathMinus").onclick = () => { state.baths = Math.max(0, state.baths - 1); document.getElementById("baths").textContent = state.baths; renderQuote(); };
  document.getElementById("quoteForm").onsubmit = async e => {
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
      extras: q.lines.map(l => l.name).join(", "),
      home: q.home.name,
      kind: kinds.find(k => k.id === q.kind).name,
      total: q.price
    };
    const all = bookings();
    all.push(booking);
    localStorage.setItem("mommy-bookings", JSON.stringify(all));
    let apple = "Download started for Apple Calendar.";
    try {
      const response = await fetch("/api/book", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(booking) });
      const data = await response.json();
      apple = data.saved ? "Added to her personal Apple Calendar." : data.error;
    } catch (err) {
      apple = "Apple write is not available until the server is connected.";
    }
    const file = new Blob([ics(booking)], { type: "text/calendar" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = "mommy-america-booking.ics";
    link.click();
    document.getElementById("confirm").textContent = `${booking.name}, ${booking.kind} at ${booking.address} on ${booking.date}, ${fmt(booking.start)} to ${fmt(booking.end)}. ${apple}`;
    document.getElementById("modal").classList.add("on");
  };
  document.getElementById("close").onclick = () => document.getElementById("modal").classList.remove("on");
}
init();
