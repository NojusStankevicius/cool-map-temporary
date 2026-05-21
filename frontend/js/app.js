"use strict";

// ── Layer definitions ──────────────────────────────────────────────────────
const LAYER_DEFS = [
  { cat: "koelteplekken", label: "Koelteplekken",   color: "#1A3B8B", src: "/api/koelteplekken",           type: "geojson", radius: 8 },
  { cat: "water_taps",    label: "Water fountains",  color: "#0566C8", src: "/data/raw/water_taps.geojson", type: "geojson", radius: 4 },
  { cat: "parks",         label: "Parks",            color: "#147A37", src: "/data/raw/parks.json",         type: "polygon" },
];

const TYPE_LABEL    = { koelteplekken: "Koelteplek", water_taps: "Water fountain", parks: "Park" };
const TYPE_LABEL_NL = { koelteplekken: "Koelteplek", water_taps: "Drinkwaterkraan", parks: "Park" };

// ── Amenity label map (translatable) — new keys discovered in data auto-add ─
const AMENITY_LABELS = {
  ac:               { en: "A/C",           nl: "Airco" },
  free_water:       { en: "Free water",    nl: "Gratis water" },
  seating:          { en: "Seating",       nl: "Zitplaatsen" },
  toilets:          { en: "Toilets",       nl: "Toiletten" },
  wheelchair:       { en: "Accessible",    nl: "Toegankelijk" },
  pets_allowed:     { en: "Pets OK",       nl: "Huisdieren OK" },
  food_to_buy:      { en: "Food nearby",   nl: "Eten te koop" },
  free_fruit:       { en: "Free fruit",    nl: "Gratis fruit" },
  own_food_allowed: { en: "Own food OK",   nl: "Eigen eten OK" },
  supervisor:       { en: "Staff on-site", nl: "Begeleiding" },
  games:            { en: "Activities",    nl: "Activiteiten" },
};
// Fields that are boolean but NOT amenity tags
const NON_AMENITY = new Set([
  "id","name","type","municipality","district","neighborhood",
  "address","website_url","hours","hours_note","photo_url","active","notes",
]);
// Populated dynamically from data
let AMENITY_DEFS = [];

function initAmenities(features) {
  const keys = new Set();
  features.forEach(f => {
    Object.entries(f.properties || {}).forEach(([k, v]) => {
      if (typeof v === "boolean" && !NON_AMENITY.has(k)) keys.add(k);
    });
  });
  AMENITY_DEFS = [...keys].map(key => ({
    key,
    label_en: AMENITY_LABELS[key]?.en || key.replace(/_/g, " "),
    label_nl: AMENITY_LABELS[key]?.nl || key.replace(/_/g, " "),
    filterable: true,
  }));
  state.filters = Object.fromEntries(AMENITY_DEFS.map(d => [d.key, false]));
  rebuildFilterChips();
}

const CATEGORY_DEFS = [
  { key: null,           label_en: "All",          label_nl: "Alles" },
  { key: "library",      label_en: "Library",      label_nl: "Bibliotheek" },
  { key: "church",       label_en: "Church",       label_nl: "Kerk" },
  { key: "supermarket",  label_en: "Supermarket",  label_nl: "Supermarkt" },
  { key: "urban_farm",   label_en: "Urban farm",   label_nl: "Stadsboerderij" },
];

const TYPE_DISPLAY_NL = { library: "Bibliotheek", church: "Kerk", supermarket: "Supermarkt", urban_farm: "Stadsboerderij", community_center: "Buurtcentrum", sports: "Sport" };
const TYPE_DISPLAY_EN = { library: "Library", church: "Church", supermarket: "Supermarket", urban_farm: "Urban farm", community_center: "Community centre", sports: "Sports" };

const CATEGORY_COLORS = {
  library:          "#1D5EAD",
  church:           "#7B4EA6",
  supermarket:      "#0D8A7E",
  urban_farm:       "#2E7A30",
  community_center: "#B86520",
  sports:           "#B82030",
  default:          "#0D8A7E",
};

const DAY_SHORT_NL = ["Ma","Di","Wo","Do","Vr","Za","Zo"];
const DAY_SHORT_EN = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const DAY_LONG_NL  = ["maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag","zondag"];
const DAY_LONG_EN  = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

// ── Translations ───────────────────────────────────────────────────────────
const TR = {
  nl: {
    weather_temp_label: "Actuele temperatuur",
    weather_humidity_label: "Luchtvochtigheid",
    weather_feels_label: "Gevoelstemperatuur",
    weather_credit_prefix: "Weergegevens via",
    weather_feels_info: "Gevoelstemperatuur is hoe warm het buiten aanvoelt, op basis van temperatuur, luchtvochtigheid en wind.",
    skip_to_list: "Sla de kaart over en ga naar de lijst met koelteplekken",
    org: "GGD Amsterdam",
    title: "Koeltekaart",
    search_placeholder: "Zoek straat, buurt of locatie…",
    near_me: "In mijn buurt",
    stay_cool: "Blijf koel",
    heat_advice_btn: "Hitteadvies",
    back: "Terug",
    categories: "Categorieën",
    layers: "Lagen",
    overlays: "Overlays",
    policy_map: "Beleidskaart",
    koelteplekken_label: "Koelteplekken",
    water_label: "Drinkwaterkranen",
    parks_label: "Parken",
    heat_label: "Interventieprioritering",
    heat_low: "Laag",
    heat_high: "Hoog",
    mode_user: "Bewoners",
    mode_policy: "Beleid",
    lp_headline: "Vind verkoeling in Amsterdam",
    lp_sub: "Drinkwaterkranen, parken en koelteplekken op één kaart",
    lp_enter: "Open de kaart",
    lp_on_map_title: "Wat vind je op de kaart?",
    lp_layer_koelte_title: "Koelteplekken",
    lp_layer_koelte_desc: "298 overdekte locaties — bibliotheken, buurtcentra en meer.",
    lp_layer_water_title: "Drinkwaterkranen",
    lp_layer_water_desc: "554 openbare drinkwaterkranen verspreid door de stad, 24/7 beschikbaar.",
    lp_layer_parks_title: "Parken",
    lp_layer_parks_desc: "Groene longen van Amsterdam.",
    lp_tips_title: "Blijf koel tijdens een hittegolf",
    contact: "Contact",
    contact_text: "Vragen over de koelteplekken of de kaart?",
    contact_emergency: "Noodgeval? Bel 112",
    tips_cta_title: "Tips om koel te blijven",
    tips_cta_sub: "Advies van GGD Amsterdam",
    banner_active: "Het Amsterdamse hitteplan is actief — koelteplekken zijn beschikbaar",
    banner_inactive: "Het Amsterdamse hitteplan is momenteel niet actief",
    banner_toggle: "Wijzig status",
    open_now: "Open",
    closed_now: "Gesloten",
    closes_at: "Sluit om",
    opens_at: "Opent om",
    opens_on: "Opent op",
    hours_unknown: "Openingstijden onbekend",
    get_directions: "Routebeschrijving",
    website_hours: "Website & openingstijden",
    near_you: "In jouw buurt",
    no_near_results: "Geen locaties gevonden, probeer het later opnieuw.",
    no_search_results: "Geen resultaten gevonden in Amsterdam",
    tips_page_title: "Blijf koel",
    tips_page_subtitle: "Tips voor warme dagen van GGD Amsterdam",
    heat_plan_what_title: "Wat is het Hitteplan?",
    heat_plan_what_body: "Het Hitteplan Amsterdam wordt geactiveerd wanneer het KNMI een hittewaarschuwing afgeeft. Tijdens het plan zijn koelteplekken in de stad beschikbaar voor iedereen die verkoeling zoekt — gratis en zonder afspraak.",
    tip1_title: "Drink voldoende water",
    tip1_body: "Drink minimaal 1,5 tot 2 liter water per dag tijdens een hittegolf, ook als je geen dorst hebt.",
    tip2_title: "Houd je woning koel",
    tip2_body: "Sluit overdag gordijnen en zonneschermen op zonnige ramen. Open ramen 's avonds als de buitenlucht afkoelt.",
    tip3_title: "Beperk activiteiten buitenshuis",
    tip3_body: "Vermijd inspannende activiteiten tussen 12:00 en 16:00 uur.",
    tip4_title: "Gebruik een koelteplek",
    tip4_body: "Vind de dichtstbijzijnde koelteplek op deze kaart.",
    tip5_title: "Houd kwetsbare mensen in de gaten",
    tip5_body: "Ouderen, jonge kinderen en mensen met chronische ziekten lopen het grootste risico.",
    tip6_title: "Verkoeling voor dieren",
    tip6_body: "Laat huisdieren nooit achter in auto's. Zorg voor schaduw en voldoende water.",
    tip_emergency_title: "Wanneer schakel je hulp in?",
    tip_emergency_body: "Hitteberoerte is een medisch noodgeval. Bel 112 als iemand in de war raakt, stopt met zweten of het bewustzijn verliest.",
    tips_disclaimer: "Dit advies is gebaseerd op aanbevelingen van het RIVM en GGD Amsterdam. Bij medische noodgevallen: bel 112.",
    contact_page_btn: "Contactgegevens & aanmelden",
    contact_page_title: "Contact",
    contact_page_hero_sub: "GGD Amsterdam — Koeltekaart",
    contact_ggd_title: "GGD Amsterdam",
    contact_ggd_phone_label: "Telefoon",
    contact_ggd_phone: "020 555 5911",
    contact_ggd_phone_hours: "Maandag t/m vrijdag, 09:00–17:00",
    contact_ggd_post_label: "Postadres",
    contact_ggd_post: "GGD Amsterdam\nPostbus 2200\n1000 CE Amsterdam",
    contact_ggd_visit_label: "Bezoekadres",
    contact_ggd_visit: "Nieuwe Achtergracht 100\n1018 WT Amsterdam",
    contact_ggd_web_label: "Website",
    contact_submit_title: "Koelteplek aanmelden",
    contact_submit_body: "Weet u een locatie die als koelteplek zou kunnen dienen? Neem dan contact op via onderstaande gegevens.",
    contact_submit_phone_label: "Telefoon",
    contact_submit_phone: "06 41812999",
    contact_submit_email_label: "E-mail",
    contact_submit_email: "e.coolen@amsterdam.nl",
    district: "Stadsdeel",
    neighborhood: "Buurt",
    area: "Oppervlakte",
    city_park: "Stadspark",
    yes: "Ja",
    no: "Nee",
    address: "Adres",
    status: "Status",
    owner: "Eigenaar",
    type_label: "Type",
    installed: "Aangelegd",
    intervention_priority: "Interventieprioritering",
    heat_risk: "Hitterisico",
    elderly: "Ouderen",
    benefits: "Uitkeringen",
    cool_500m: "Koel <500m",
    cool_1km: "Koel <1km",
    amsterdam_avg: "Amsterdam gem.",
    view_map: "Kaart",
    view_list: "Lijst",
    lv_title: "Koellocaties",
    lv_found: "locaties",
    lv_no_results: "Geen resultaten",
    lv_no_results_sub: "Pas de filters aan om locaties te zien.",
    lv_always_open: "24/7",
    lv_unknown: "Onbekend",
  },
  en: {
    weather_temp_label: "Current temperature",
    weather_humidity_label: "Humidity",
    weather_feels_label: "Feels-like temperature",
    weather_credit_prefix: "Weather data via",
    weather_feels_info: "Feels-like temperature is how warm it feels outside, based on temperature, humidity and wind.",
    skip_to_list: "Skip the map and go to the list of cooling locations",
    org: "GGD Amsterdam",
    title: "Cool Map",
    search_placeholder: "Search street, neighbourhood or place…",
    near_me: "Near me",
    stay_cool: "Stay cool",
    heat_advice_btn: "Heat advice",
    back: "Back",
    categories: "Categories",
    layers: "Layers",
    overlays: "Overlays",
    policy_map: "Policy map",
    koelteplekken_label: "Cooling shelters",
    water_label: "Water fountains",
    parks_label: "Parks",
    heat_label: "Intervention priority",
    heat_low: "Low",
    heat_high: "High",
    mode_user: "Residents",
    mode_policy: "Policy",
    lp_headline: "Find cooling spots in Amsterdam",
    lp_sub: "Water fountains, parks and cooling shelters on one map",
    lp_enter: "Open the map",
    lp_on_map_title: "What's on the map?",
    lp_layer_koelte_title: "Cooling shelters",
    lp_layer_koelte_desc: "298 indoor spaces — libraries, community centres and more.",
    lp_layer_water_title: "Water fountains",
    lp_layer_water_desc: "554 public drinking taps across the city, available 24/7.",
    lp_layer_parks_title: "Parks",
    lp_layer_parks_desc: "Green spaces across Amsterdam.",
    lp_tips_title: "Stay cool during a heatwave",
    contact: "Contact",
    contact_text: "Questions about the cooling shelters or this map?",
    contact_emergency: "Emergency? Call 112",
    tips_cta_title: "Stay cool tips",
    tips_cta_sub: "Advice from GGD Amsterdam",
    banner_active: "The Amsterdam Heat Plan is active — cooling shelters are open",
    banner_inactive: "The Amsterdam Heat Plan is currently not active",
    banner_toggle: "Toggle status",
    open_now: "Open now",
    closed_now: "Closed",
    closes_at: "Closes at",
    opens_at: "Opens at",
    opens_on: "Opens on",
    hours_unknown: "Opening hours unknown",
    get_directions: "Get directions",
    website_hours: "Website & opening hours",
    near_you: "Near you",
    no_near_results: "No locations found — wait a moment and try again.",
    no_search_results: "No results found in Amsterdam",
    tips_page_title: "Stay cool",
    tips_page_subtitle: "Heat safety tips from GGD Amsterdam",
    heat_plan_what_title: "What is the Heat Plan?",
    heat_plan_what_body: "The Amsterdam Heat Plan is activated when the KNMI issues a heat warning. During the plan, cooling shelters across the city are available to everyone — free of charge, no appointment needed.",
    tip1_title: "Stay hydrated",
    tip1_body: "Drink water regularly — at least 1.5–2 litres per day during a heatwave.",
    tip2_title: "Keep your home cool",
    tip2_body: "Close curtains and blinds on sun-facing windows during the day.",
    tip3_title: "Limit outdoor activity",
    tip3_body: "Avoid strenuous activity between 12:00 and 16:00 when temperatures peak.",
    tip4_title: "Use a cooling shelter",
    tip4_body: "Find the nearest cooling shelter using this map.",
    tip5_title: "Look out for others",
    tip5_body: "Elderly people, young children, and those with chronic illness are most at risk.",
    tip6_title: "Keeping pets cool",
    tip6_body: "Never leave pets in parked cars. Provide shade and plenty of water.",
    tip_emergency_title: "When to call for help",
    tip_emergency_body: "Heat stroke is a medical emergency. If someone is confused, stops sweating, or loses consciousness, call 112 immediately.",
    tips_disclaimer: "This guidance is based on RIVM and GGD Amsterdam heat-safety recommendations. For medical emergencies call 112.",
    contact_page_btn: "Contact details & register a spot",
    contact_page_title: "Contact",
    contact_page_hero_sub: "GGD Amsterdam — Cool Map",
    contact_ggd_title: "GGD Amsterdam",
    contact_ggd_phone_label: "Phone",
    contact_ggd_phone: "020 555 5911",
    contact_ggd_phone_hours: "Monday to Friday, 09:00–17:00",
    contact_ggd_post_label: "Postal address",
    contact_ggd_post: "GGD Amsterdam\nP.O. Box 2200\n1000 CE Amsterdam",
    contact_ggd_visit_label: "Visiting address",
    contact_ggd_visit: "Nieuwe Achtergracht 100\n1018 WT Amsterdam",
    contact_ggd_web_label: "Website",
    contact_submit_title: "Register a cooling spot",
    contact_submit_body: "Do you know a location that could serve as a cooling spot? Get in touch using the details below.",
    contact_submit_phone_label: "Phone",
    contact_submit_phone: "06 41812999",
    contact_submit_email_label: "Email",
    contact_submit_email: "e.coolen@amsterdam.nl",
    district: "District",
    neighborhood: "Neighbourhood",
    area: "Area",
    city_park: "City park",
    yes: "Yes",
    no: "No",
    address: "Address",
    status: "Status",
    owner: "Owner",
    type_label: "Type",
    installed: "Installed",
    intervention_priority: "Intervention priority",
    heat_risk: "Heat risk",
    elderly: "Elderly",
    benefits: "Benefits",
    cool_500m: "Cool <500m",
    cool_1km: "Cool <1km",
    amsterdam_avg: "Amsterdam avg.",
    view_map: "Map",
    view_list: "List",
    lv_title: "Cooling locations",
    lv_found: "locations",
    lv_no_results: "No results",
    lv_no_results_sub: "Adjust the filters to see locations.",
    lv_always_open: "24/7",
    lv_unknown: "Unknown",
  }
};

function t(key) { return TR[state.lang]?.[key] ?? TR.en[key] ?? key; }

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  map: null,
  layers: {},
  on: { koelteplekken: true, water_taps: true, parks: true },
  features: { koelteplekken: [], water_taps: [], parks: [] },
  userMarker: null,
  userPos: null,
  rings: [],
  heatLayer: null,
  heatOn: false,
  activeChart: null,
  buurtData: null,
  filters: {},
  search: "",
  lang: localStorage.getItem("koeltekaart_lang") || "nl",
  activeCategory: null,
  heatPlanActive: true,
  panelMode: "list",   // "list" | "detail"
};

function isDesktop() { return window.innerWidth > 768; }

// ── Loader ─────────────────────────────────────────────────────────────────
let _pending = 0;
function setLoading(on) {
  _pending = Math.max(0, _pending + (on ? 1 : -1));
  document.getElementById("loader").classList.toggle("on", _pending > 0);
}

// ── Language ───────────────────────────────────────────────────────────────
function applyLanguage() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll("[data-tooltip-i18n]").forEach(el => {
    const key = el.dataset.tooltipI18n;
    if (key) { el.setAttribute("data-tooltip", t(key)); el.setAttribute("aria-label", t(key)); }
  });
  const si = document.getElementById("search-input");
  if (si) si.placeholder = t("search_placeholder");
  const ks = document.getElementById("koelte-search");
  if (ks) ks.placeholder = state.lang === "nl" ? "Zoek op naam of buurt…" : "Search by name or neighbourhood…";
  const langBtn = document.getElementById("btn-lang");
  if (langBtn) langBtn.textContent = state.lang === "nl" ? "EN" : "NL";
  setupCategoryFilter();
  document.querySelectorAll(".filter-chip[data-filter]").forEach(btn => {
    const key = btn.dataset.filter;
    const def = AMENITY_DEFS.find(d => d.key === key);
    if (def) btn.textContent = state.lang === "nl" ? def.label_nl : def.label_en;
  });
  updateBannerText();
  rebuildFilterChips();
  // Update panel title if in list mode
  updatePanelTitle();
}

function setupLang() {
  document.getElementById("btn-lang").addEventListener("click", () => {
    state.lang = state.lang === "nl" ? "en" : "nl";
    localStorage.setItem("koeltekaart_lang", state.lang);
    applyLanguage();
    const tp = document.getElementById("tips-page");
    if (tp && tp.classList.contains("open")) renderTipsPage();
  });
}

// ── Heat plan banner ───────────────────────────────────────────────────────
function updateBannerText() {
  const banner = document.getElementById("heat-banner");
  const text   = document.getElementById("banner-text");
  if (!banner) return;
  banner.classList.toggle("heat-banner--active",   state.heatPlanActive);
  banner.classList.toggle("heat-banner--inactive", !state.heatPlanActive);
  if (text) text.textContent = t(state.heatPlanActive ? "banner_active" : "banner_inactive");
}

function setupBanner() {
  updateBannerText();
  const toggle = document.getElementById("banner-toggle");
  if (toggle) toggle.addEventListener("click", () => { state.heatPlanActive = !state.heatPlanActive; updateBannerText(); });
}

// ── Hover card ─────────────────────────────────────────────────────────────
const HC = (() => {
  let el;
  function init() { el = document.getElementById("hover-card"); }
  function _pos(x, y) {
    const W = window.innerWidth, H = window.innerHeight;
    const cw = 240, ch = 76;
    let left = x + 14, top = y - 40;
    if (left + cw > W - 8) left = x - cw - 14;
    if (left < 8) left = 8;
    if (top < 58) top = y + 14;
    if (top + ch > H - 8) top = y - ch - 14;
    el.style.left = left + "px";
    el.style.top  = top  + "px";
  }
  function show(clientX, clientY, name, sub, color) {
    el.innerHTML = "";
    const bar = document.createElement("div"); bar.className = "hc-accent"; bar.style.background = color;
    const nm  = document.createElement("div"); nm.className  = "hc-name";  nm.textContent = name;
    const sb  = document.createElement("div"); sb.className  = "hc-sub";   sb.textContent = sub;
    el.append(bar, nm, sb);
    _pos(clientX, clientY);
    el.classList.add("visible");
  }
  function hide()  { el.classList.remove("visible"); }
  function move(x, y) { if (el.classList.contains("visible")) _pos(x, y); }
  return { init, show, hide, move };
})();

// ── Geo helpers ────────────────────────────────────────────────────────────
function haversine(la1, lo1, la2, lo2) {
  const R = 6371, rad = d => (d * Math.PI) / 180;
  const a = Math.sin(rad(la2 - la1) / 2) ** 2 +
            Math.cos(rad(la1)) * Math.cos(rad(la2)) * Math.sin(rad(lo2 - lo1) / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function fmtDist(km) {
  return km < 0.1 ? Math.round(km * 1000) + " m"
       : km < 1   ? (km * 1000).toFixed(0) + " m"
                  : km.toFixed(1) + " km";
}
function polygonCentroid(coordinates) {
  const ring = coordinates[0];
  return [ring.reduce((s,c) => s+c[1],0)/ring.length, ring.reduce((s,c) => s+c[0],0)/ring.length];
}

// ── Opening hours ──────────────────────────────────────────────────────────
function parseMinutes(str) { const [h,m] = str.split(":").map(Number); return h*60+m; }

function getOpenStatus(hours) {
  if (!hours || !Array.isArray(hours)) return { status: "unknown" };
  const now = new Date(), dow = (now.getDay()+6)%7;
  const today = hours[dow], nowM = now.getHours()*60+now.getMinutes();
  if (!today) {
    let nextDay = null;
    for (let i=1;i<=7;i++) { const d=(dow+i)%7; if(hours[d]){nextDay=d;break;} }
    return { status:"closed", today:null, nextDay };
  }
  const [openStr,closeStr] = today.split("-");
  const openM = parseMinutes(openStr), closeM = parseMinutes(closeStr);
  if (nowM < openM) return { status:"closed", opensAt:openStr, today };
  if (nowM >= closeM) {
    let nextDay = null;
    for (let i=1;i<=7;i++) { const d=(dow+i)%7; if(hours[d]){nextDay=d;break;} }
    return { status:"closed", today, nextDay };
  }
  return { status:"open", closesAt:closeStr, today };
}

function renderHoursBlock(hours) {
  const status   = getOpenStatus(hours);
  const dayShort = state.lang === "nl" ? DAY_SHORT_NL : DAY_SHORT_EN;
  const dayLong  = state.lang === "nl" ? DAY_LONG_NL  : DAY_LONG_EN;
  const closed   = state.lang === "nl" ? "Gesloten" : "Closed";
  const now      = new Date(), todayIdx = (now.getDay()+6)%7;
  const wrap = document.createElement("div"); wrap.className = "hours-wrap";
  if (status.status !== "unknown") {
    const badge = document.createElement("div");
    badge.className = "hours-status hours-status--" + status.status;
    const dot = document.createElement("span"); dot.className = "hours-dot";
    const msg = document.createElement("span");
    if (status.status === "open") {
      msg.innerHTML = `<strong>${t("open_now")}</strong> &mdash; ${t("closes_at")} ${status.closesAt}`;
    } else {
      let text = t("closed_now");
      if (status.opensAt) text += ` &mdash; ${t("opens_at")} ${status.opensAt}`;
      else if (status.nextDay != null) text += ` &mdash; ${t("opens_on")} ${dayLong[status.nextDay]} ${hours[status.nextDay].split("-")[0]}`;
      msg.innerHTML = text;
    }
    badge.append(dot, msg);
    wrap.appendChild(badge);
  } else {
    const badge = document.createElement("div"); badge.className = "hours-status hours-status--unknown";
    badge.textContent = t("hours_unknown");
    wrap.appendChild(badge);
  }
  if (hours && Array.isArray(hours)) {
    const table = document.createElement("div"); table.className = "hours-table";
    hours.forEach((slot, i) => {
      const row  = document.createElement("div");
      row.className = "hours-row" + (i===todayIdx ? " hours-row--today" : "");
      const day  = document.createElement("span"); day.className = "hours-day"; day.textContent = dayShort[i];
      const time = document.createElement("span"); time.className = "hours-time" + (!slot ? " hours-time--closed" : "");
      time.textContent = slot ? slot.replace("-"," – ") : closed;
      row.append(day, time); table.appendChild(row);
    });
    wrap.appendChild(table);
  }
  return wrap;
}

// ── Map init ───────────────────────────────────────────────────────────────
function initMap() {
  state.map = L.map("map", { zoomControl: false }).setView([52.368, 4.827], 13);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd", maxZoom: 19,
  }).addTo(state.map);
  L.control.zoom({ position: "bottomright" }).addTo(state.map);
  state.map.on("click", () => { closeSheet(); closeSidebarMobile(); });
  state.map.on("mousemove", e => HC.move(e.originalEvent.clientX, e.originalEvent.clientY));
  setTimeout(() => state.map.invalidateSize(), 150);
}

// ── Priority overlay ───────────────────────────────────────────────────────
function priorityColor(value) {
  const stops = [[0,[78,184,122]],[0.35,[168,201,109]],[0.55,[240,192,64]],[0.75,[240,112,48]],[1,[200,16,46]]];
  for (let i=1;i<stops.length;i++) {
    const [t0,c0]=stops[i-1],[t1,c1]=stops[i];
    if (value<=t1) { const f=(value-t0)/(t1-t0); return `rgb(${Math.round(c0[0]+(c1[0]-c0[0])*f)},${Math.round(c0[1]+(c1[1]-c0[1])*f)},${Math.round(c0[2]+(c1[2]-c0[2])*f)})`; }
  }
  return "#C8102E";
}

function loadHeatLayer() {
  setLoading(true);
  fetch("/data/processed/heat_risk_buurt.geojson")
    .then(r => r.json())
    .then(data => {
      state.buurtData = data;
      state.heatLayer = L.geoJSON(data, {
        style: f => { const val=f.properties?.priority_score??0,col=priorityColor(val); return {color:col,weight:0.7,opacity:0.5,fillColor:col,fillOpacity:0.28}; },
        onEachFeature: (f,l) => {
          const p=f.properties||{}, name=p.buurt_naam||"Buurt", pct=p.priority_score!=null?Math.round(p.priority_score*100):"—", col=priorityColor(p.priority_score??0);
          const sub=[p.HI_TOTAAL_S!=null?`Heat ${p.HI_TOTAAL_S.toFixed(1)}/5`:null,p.pct_elderly_cbs!=null?`${Math.round(p.pct_elderly_cbs*100)}% elderly`:null,p.cool_500m!=null?`${p.cool_500m} cool spots <500m`:null].filter(Boolean).join(" · ");
          l.on("mouseover",e=>HC.show(e.originalEvent.clientX,e.originalEvent.clientY,`${name} — Priority ${pct}%`,sub,col));
          l.on("mouseout",()=>HC.hide());
          l.on("mousemove",e=>HC.move(e.originalEvent.clientX,e.originalEvent.clientY));
          l.on("click",e=>{L.DomEvent.stopPropagation(e);HC.hide();showBuurtDetail(f);});
        },
      });
      if (state.heatOn) state.heatLayer.addTo(state.map);
    })
    .catch(e => console.warn("heat layer not available:", e))
    .finally(() => setLoading(false));
}

function setupHeatToggle() {
  const row=document.getElementById("heat-row"), legend=document.getElementById("heat-legend");
  if (!row) return;
  row.addEventListener("click", () => {
    const on=row.classList.toggle("on");
    row.setAttribute("aria-checked",String(on));
    legend.toggleAttribute("hidden",!on);
    state.heatOn=on;
    if (!state.heatLayer) return;
    if (on) state.heatLayer.addTo(state.map);
    else    state.map.removeLayer(state.heatLayer);
  });
}

// ── Buurt detail ───────────────────────────────────────────────────────────
const RADAR_LABELS = ["Heat\nexposure","Heat\nsensitivity","Elderly\nshare","Benefits\nshare","Cool spot\ngap"];
const RADAR_KEYS   = ["r_heat_exposure","r_heat_sensitivity","r_elderly_share","r_benefits_share","r_cool_spot_gap"];

function showBuurtDetail(feature) {
  const p=feature.properties||{}, avg=state.buurtData?.amsterdam_avg||{};
  const head=document.getElementById("sheet-head-area"), body=document.getElementById("sheet-body");
  head.innerHTML="";
  const badge=document.createElement("div"); badge.className="sheet-badge";
  badge.textContent="Buurt"; badge.style.cssText="background:#C8102E18;color:#C8102E;border:1px solid #C8102E40;";
  const title=document.createElement("div"); title.className="sheet-name"; title.textContent=p.buurt_naam||"Buurt";
  head.append(badge,title);
  body.innerHTML="";
  const pct=p.priority_score!=null?Math.round(p.priority_score*100):null;
  if (pct!=null) {
    const scoreRow=document.createElement("div"); scoreRow.className="buurt-score-row";
    const label=document.createElement("span"); label.className="buurt-score-label"; label.textContent=t("intervention_priority");
    const val=document.createElement("span"); val.className="buurt-score-val"; val.style.color=priorityColor(p.priority_score); val.textContent=`${pct}%`;
    scoreRow.append(label,val); body.appendChild(scoreRow);
  }
  const pills=document.createElement("div"); pills.className="buurt-pills";
  [{key:"heat_risk",val:p.HI_TOTAAL_S!=null?`${p.HI_TOTAAL_S.toFixed(1)}/5`:"—"},{key:"elderly",val:p.pct_elderly_cbs!=null?`${Math.round(p.pct_elderly_cbs*100)}%`:"—"},{key:"benefits",val:p.pct_benefits_cbs!=null?`${Math.round(p.pct_benefits_cbs*100)}%`:"—"},{key:"cool_500m",val:p.cool_500m!=null?String(p.cool_500m):"—"},{key:"cool_1km",val:p.cool_1km!=null?String(p.cool_1km):"—"}].forEach(({key,val})=>{
    const pill=document.createElement("div"); pill.className="buurt-pill";
    const l=document.createElement("div"); l.className="bp-label"; l.textContent=t(key);
    const v=document.createElement("div"); v.className="bp-val";   v.textContent=val;
    pill.append(l,v); pills.appendChild(pill);
  });
  body.appendChild(pills);
  const chartWrap=document.createElement("div"); chartWrap.className="radar-wrap";
  const canvas=document.createElement("canvas"); canvas.id="buurt-radar"; canvas.style.cssText="width:100%;max-width:260px;margin:0 auto;display:block;";
  chartWrap.appendChild(canvas); body.appendChild(chartWrap);
  if (state.activeChart){state.activeChart.destroy();state.activeChart=null;}
  state.activeChart=new Chart(canvas,{type:"radar",data:{labels:RADAR_LABELS,datasets:[{label:p.buurt_naam||"Buurt",data:RADAR_KEYS.map(k=>p[k]??0),fill:true,backgroundColor:"rgba(200,16,46,0.15)",borderColor:"rgba(200,16,46,0.85)",pointBackgroundColor:"rgba(200,16,46,0.9)",pointRadius:3,borderWidth:2},{label:t("amsterdam_avg"),data:RADAR_KEYS.map(k=>avg[k]??0.5),fill:false,backgroundColor:"transparent",borderColor:"rgba(100,100,100,0.45)",pointBackgroundColor:"rgba(100,100,100,0.45)",pointRadius:2,borderWidth:1.5,borderDash:[4,4]}]},options:{animation:{duration:350},scales:{r:{min:0,max:1,ticks:{display:false,stepSize:0.25},grid:{color:"rgba(0,0,0,0.07)"},angleLines:{color:"rgba(0,0,0,0.07)"},pointLabels:{font:{size:9.5},color:"#555"}}},plugins:{legend:{position:"bottom",labels:{font:{size:10},boxWidth:12,padding:10}},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${Math.round(ctx.raw*100)}%`}}}}});
  openSheet(); closeSidebarMobile();
}

// ── Layer loading ──────────────────────────────────────────────────────────
function loadAllLayers() {
  LAYER_DEFS.forEach(def => {
    setLoading(true);
    fetch(def.src)
      .then(r => r.json())
      .then(data => {
        if (def.cat === "koelteplekken") buildKoelteplekkenLayer(def, data);
        else                             buildStaticLayer(def, data);
      })
      .catch(e => console.error(def.cat, e))
      .finally(() => setLoading(false));
  });
}

// ── Koelteplekken layer ────────────────────────────────────────────────────
function koelteplekPassesFilters(p) {
  if (state.activeCategory && p.type !== state.activeCategory) return false;
  for (const def of AMENITY_DEFS) {
    if (def.filterable && state.filters[def.key] && p[def.key] !== true) return false;
  }
  if (state.search) {
    const q = state.search.toLowerCase();
    if (!(p.name||"").toLowerCase().includes(q) && !(p.neighborhood||"").toLowerCase().includes(q)) return false;
  }
  return true;
}

function buildKoelteplekkenLayer(def, data) {
  const features = data.features || [];
  state.features.koelteplekken = features;
  animateCount("koelteplekken", features.length);
  initAmenities(features);
  _renderKoelteplekkenLayer(def, features);
}

function _renderKoelteplekkenLayer(def, features) {
  if (state.layers.koelteplekken) state.map.removeLayer(state.layers.koelteplekken);
  const filtered = features.filter(f => koelteplekPassesFilters(f.properties||{}));
  const fc = { type:"FeatureCollection", features: filtered };
  state.layers.koelteplekken = L.geoJSON(fc, {
    pointToLayer: (_f, ll) => {
      const isActive = _f.properties?.active !== false;
      const typeColor = CATEGORY_COLORS[_f.properties?.type] || def.color;
      return L.circleMarker(ll, {
        radius: def.radius,
        fillColor: isActive ? typeColor : "#9CA3AF",
        color: "rgba(255,255,255,0.9)",
        weight: 1.5,
        opacity: 1,
        fillOpacity: isActive ? 0.88 : 0.45,
      });
    },
    onEachFeature: (f, l) => {
      const p = f.properties || {};
      const isActive = p.active !== false;
      const col = isActive ? (CATEGORY_COLORS[p.type] || def.color) : "#9CA3AF";
      const sub = [p.neighborhood, p.district].filter(Boolean).join(" · ");
      l.on("mouseover", e => HC.show(e.originalEvent.clientX, e.originalEvent.clientY, p.name, sub, col));
      l.on("mouseout",  () => HC.hide());
      l.on("mousemove", e => HC.move(e.originalEvent.clientX, e.originalEvent.clientY));
      l.on("click",     e => { L.DomEvent.stopPropagation(e); showKoelteplaatsDetail(f); });
    },
  });
  if (state.on.koelteplekken) state.layers.koelteplekken.addTo(state.map);
  const countEl = document.getElementById("cnt-koelteplekken");
  if (countEl) countEl.textContent = filtered.length.toLocaleString();
}

function rebuildKoelteplekkenLayer() {
  const def = LAYER_DEFS.find(d => d.cat === "koelteplekken");
  _renderKoelteplekkenLayer(def, state.features.koelteplekken);
  refreshListIfActive();
}

// ── Static layers ──────────────────────────────────────────────────────────
function buildStaticLayer(def, data) {
  const features = data.features || [];
  state.features[def.cat] = features;
  animateCount(def.cat, features.length);
  const fc = { type:"FeatureCollection", features };
  if (def.type === "polygon") {
    const parkGroups = {};
    state.layers[def.cat] = L.geoJSON(fc, {
      style: { color:def.color, weight:1.5, opacity:0.85, fillColor:def.color, fillOpacity:0.12 },
      onEachFeature: (f,l) => {
        const name=f.properties?.Naam||"Park", sub=(f.properties?.Stadsdeel||"")+" · Park";
        if (!parkGroups[name]) parkGroups[name]=[];
        parkGroups[name].push(l);
        l.on("mouseover",e=>{parkGroups[name].forEach(pl=>pl.setStyle({fillOpacity:0.28,weight:2.5}));HC.show(e.originalEvent.clientX,e.originalEvent.clientY,name,sub,def.color);});
        l.on("mouseout",()=>{parkGroups[name].forEach(pl=>pl.setStyle({fillOpacity:0.12,weight:1.5}));HC.hide();});
        l.on("mousemove",e=>HC.move(e.originalEvent.clientX,e.originalEvent.clientY));
        l.on("click",e=>{L.DomEvent.stopPropagation(e);showParkDetail(f);});
      },
    });
  } else {
    state.layers[def.cat] = L.geoJSON(fc, {
      pointToLayer: (_f,ll) => L.circleMarker(ll,{radius:def.radius,fillColor:def.color,color:"rgba(255,255,255,0.9)",weight:1.5,opacity:1,fillOpacity:0.88}),
      onEachFeature: (f,l) => {
        const name=f.properties?.["Dichtstbijzijnde adres binnen 100 meter"]||"Drinking water";
        const sub=(f.properties?.Eigenaar||"Waternet")+" · Drinking water";
        l.on("mouseover",e=>HC.show(e.originalEvent.clientX,e.originalEvent.clientY,name,sub,def.color));
        l.on("mouseout",()=>HC.hide());
        l.on("mousemove",e=>HC.move(e.originalEvent.clientX,e.originalEvent.clientY));
        l.on("click",e=>{L.DomEvent.stopPropagation(e);showTapDetail(f);});
      },
    });
  }
  if (state.on[def.cat]) state.layers[def.cat].addTo(state.map);
}

// ── Count-up animation ─────────────────────────────────────────────────────
function animateCount(cat, target) {
  const el=document.getElementById("cnt-"+cat);
  if (!el) return;
  const duration=900, start=performance.now();
  function tick(now) {
    const t=Math.min((now-start)/duration,1);
    el.textContent=Math.round(target*(1-Math.pow(1-t,3))).toLocaleString();
    if (t<1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ── Mode toggle ────────────────────────────────────────────────────────────
function setupModeToggle() {
  document.body.classList.add("mode-user");
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.body.classList.toggle("mode-user", btn.dataset.mode==="user");
    });
  });
}

// ── Layer toggles ──────────────────────────────────────────────────────────
function setupToggles() {
  document.querySelectorAll(".layer-row[data-cat]").forEach(row => {
    row.addEventListener("click", () => {
      const cat=row.dataset.cat, on=row.classList.toggle("on");
      row.setAttribute("aria-checked",String(on));
      state.on[cat]=on;
      refreshListIfActive();
      if (!state.layers[cat]) return;
      if (on) state.map.addLayer(state.layers[cat]);
      else    state.map.removeLayer(state.layers[cat]);
    });
  });
}

// ── Category filter ────────────────────────────────────────────────────────
function setupCategoryFilter() {
  const container = document.getElementById("category-chips");
  if (!container) return;
  container.innerHTML = "";
  CATEGORY_DEFS.forEach(def => {
    const btn = document.createElement("button");
    btn.className = "cat-chip" + (state.activeCategory===def.key ? " active" : "");
    btn.dataset.cat = String(def.key);
    btn.setAttribute("aria-pressed", String(state.activeCategory===def.key));
    if (def.key !== null) {
      const dot = document.createElement("span"); dot.className="cat-chip-dot";
      dot.style.background = CATEGORY_COLORS[def.key]||CATEGORY_COLORS.default;
      btn.appendChild(dot);
    }
    const label = document.createElement("span");
    label.textContent = state.lang==="nl" ? def.label_nl : def.label_en;
    btn.appendChild(label);
    if (def.key !== null) btn.style.setProperty("--cat-color", CATEGORY_COLORS[def.key]||CATEGORY_COLORS.default);
    btn.addEventListener("click", () => {
      state.activeCategory = def.key;
      container.querySelectorAll(".cat-chip").forEach(c => {
        const isThis = (c.dataset.cat===String(def.key));
        c.classList.toggle("active",isThis);
        c.setAttribute("aria-pressed",String(isThis));
      });
      rebuildKoelteplekkenLayer();
    });
    container.appendChild(btn);
  });
}

// ── Amenity filter chips ───────────────────────────────────────────────────
function rebuildFilterChips() {
  const container = document.getElementById("filter-chips");
  if (!container) return;
  container.innerHTML = "";
  AMENITY_DEFS.filter(d => d.filterable).forEach(def => {
    const btn = document.createElement("button");
    btn.className = "filter-chip" + (state.filters[def.key] ? " active" : "");
    btn.dataset.filter = def.key;
    btn.setAttribute("aria-pressed", String(!!state.filters[def.key]));
    btn.textContent = state.lang==="nl" ? def.label_nl : def.label_en;
    btn.addEventListener("click", () => toggleFilter(def.key, btn));
    container.appendChild(btn);
  });
}

function setupFilters() {
  rebuildFilterChips();
}

function toggleFilter(key, btn) {
  state.filters[key] = !state.filters[key];
  document.querySelectorAll(`.filter-chip[data-filter="${key}"]`).forEach(c => {
    c.classList.toggle("active", state.filters[key]);
    c.setAttribute("aria-pressed", String(state.filters[key]));
  });
  rebuildKoelteplekkenLayer();
}

// ── Mobile sidebar ─────────────────────────────────────────────────────────
function setupSidebarToggle() {
  const btn=document.getElementById("btn-sidebar-toggle"), backdrop=document.getElementById("sidebar-backdrop");
  if (btn) btn.addEventListener("click",e=>{e.stopPropagation();const open=document.body.classList.toggle("sidebar-open");btn.setAttribute("aria-expanded",String(open));});
  if (backdrop) backdrop.addEventListener("click",closeSidebarMobile);
}
function closeSidebarMobile() {
  document.body.classList.remove("sidebar-open");
  const btn=document.getElementById("btn-sidebar-toggle");
  if (btn) btn.setAttribute("aria-expanded","false");
}

// ── User location + Near me ────────────────────────────────────────────────
function setupNearBtn() {
  const btn=document.getElementById("btn-near");
  const clearBtn=document.getElementById("btn-near-clear");
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (state.userPos) { clearNearMe(); return; }
    if (!navigator.geolocation) { alert("Geolocation not supported."); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLoading(false);
        placeUserMarker(pos.coords.latitude, pos.coords.longitude);
        state.map.setView([pos.coords.latitude, pos.coords.longitude], 15);
        btn.classList.add("active");
        if (clearBtn) clearBtn.removeAttribute("hidden");
        if (isDesktop() && state.panelMode === "detail") exitDetailMode();
        else refreshListIfActive();
      },
      () => { setLoading(false); alert("Could not retrieve your location. Check browser permissions."); }
    );
  });
}

function clearNearMe() {
  if (state.userMarker) state.userMarker.remove();
  clearRings();
  state.userPos=null; state.userMarker=null;
  const btn=document.getElementById("btn-near");
  const clearBtn=document.getElementById("btn-near-clear");
  if (btn) btn.classList.remove("active");
  if (clearBtn) clearBtn.setAttribute("hidden","");
  refreshListIfActive();
}

function placeUserMarker(lat, lon) {
  if (state.userMarker) state.userMarker.remove();
  clearRings();
  state.userPos = { lat, lon };
  state.userMarker = L.marker([lat,lon],{
    icon: L.divIcon({className:"user-marker-icon",html:'<div class="user-dot"></div><div class="user-pulse"></div>',iconSize:[28,28],iconAnchor:[14,14]}),
    interactive:false, zIndexOffset:1000,
  }).addTo(state.map);
  placeDistanceRings(lat,lon);
}
function clearRings() { state.rings.forEach(r=>r.remove()); state.rings=[]; }
function placeDistanceRings(lat,lon) {
  [500,1000,2000].forEach((m,i) => {
    const r=L.circle([lat,lon],{radius:m,color:"#1A3B8B",weight:i===0?2.5:1.8,opacity:0.75-i*0.18,fillColor:"#1A3B8B",fillOpacity:0.07-i*0.02,dashArray:i===0?null:"6 10",interactive:false}).addTo(state.map);
    state.rings.push(r);
  });
}

// ── Bottom sheet ───────────────────────────────────────────────────────────
function openSheet()  { document.getElementById("sheet").classList.add("open"); }
function closeSheet() { document.getElementById("sheet").classList.remove("open"); }

// ── Panel navigation ───────────────────────────────────────────────────────
function updatePanelTitle() {
  const titleEl = document.getElementById("panel-hdr-title");
  if (titleEl && state.panelMode === "list") {
    titleEl.textContent = state.userPos ? t("near_you") : t("lv_title");
  }
}

function enterDetailMode(feature) {
  state.panelMode = "detail";
  const hdrList = document.getElementById("panel-hdr-list");
  const hdrBack = document.getElementById("panel-hdr-back");
  if (hdrList) hdrList.hidden = true;
  if (hdrBack) hdrBack.hidden = false;
  const inner = document.getElementById("list-view-inner");
  if (!inner) return;
  inner.innerHTML = "";
  inner.scrollTop = 0;
  renderKoelteDetailContent(feature, inner);
  closeSheet();
}

function exitDetailMode() {
  if (!isDesktop()) return;
  state.panelMode = "list";
  const hdrList = document.getElementById("panel-hdr-list");
  const hdrBack = document.getElementById("panel-hdr-back");
  if (hdrList) hdrList.hidden = false;
  if (hdrBack) hdrBack.hidden = true;
  renderListView();
}

// ── Koelteplek detail — right panel (desktop) ──────────────────────────────
function renderKoelteDetailContent(feature, container) {
  const p = feature.properties || {};
  const col = CATEGORY_COLORS[p.type] || "#1A3B8B";
  const typeLabels = state.lang === "nl" ? TYPE_DISPLAY_NL : TYPE_DISPLAY_EN;
  const catLabel = typeLabels[p.type] || p.type || "Koelteplek";
  const locationLabel = [p.neighborhood, p.district].filter(Boolean).join(" · ");

  // Full-width photo
  if (p.photo_url) {
    const imgWrap = document.createElement("div"); imgWrap.className = "detail-img-full";
    const img = document.createElement("img");
    img.src = p.photo_url; img.alt = p.name || ""; img.loading = "lazy";
    imgWrap.appendChild(img);
    container.appendChild(imgWrap);
  }

  const body = document.createElement("div"); body.className = "detail-panel-body";

  // Name section
  const nameSec = document.createElement("div"); nameSec.className = "detail-panel-namesec";
  if (locationLabel) {
    const badge = document.createElement("div"); badge.className = "sheet-badge";
    badge.style.cssText = `background:${col}18;color:${col};border:1px solid ${col}40;`;
    badge.textContent = locationLabel;
    nameSec.appendChild(badge);
  }
  const nameEl = document.createElement("div"); nameEl.className = "sheet-name";
  nameEl.textContent = p.name || "Koelteplek";
  nameSec.appendChild(nameEl);

  const tagRow = document.createElement("div"); tagRow.className = "tag-row";
  const catTag = document.createElement("div"); catTag.className = "tag tag--category";
  catTag.style.cssText = `background:${col}10;color:${col};border-color:${col}30;`;
  catTag.textContent = catLabel;
  tagRow.appendChild(catTag);
  if (p.active === false) {
    const inact = document.createElement("div"); inact.className = "tag tag--inactive";
    inact.textContent = state.lang === "nl" ? "Tijdelijk gesloten" : "Temporarily unavailable";
    tagRow.appendChild(inact);
  }
  nameSec.appendChild(tagRow);
  body.appendChild(nameSec);

  // Hours
  body.appendChild(renderHoursBlock(p.hours));
  if (p.hours_note) {
    const noteEl = document.createElement("div"); noteEl.className = "hours-note";
    noteEl.textContent = p.hours_note;
    body.appendChild(noteEl);
  }

  // Amenity chips (dynamic — all boolean fields from data)
  const chipsWrap = document.createElement("div"); chipsWrap.className = "filter-chips detail-chips";
  AMENITY_DEFS.forEach(def => {
    const val = p[def.key];
    if (val === null || val === undefined) return;
    const label = state.lang === "nl" ? def.label_nl : def.label_en;
    const chip = document.createElement("button");
    chip.className = "filter-chip" + (val ? " on" : " off");
    chip.textContent = val
      ? label
      : (state.lang === "nl" ? `Geen ${label.toLowerCase()}` : `No ${label.toLowerCase()}`);
    chip.setAttribute("aria-pressed", String(!!state.filters[def.key]));
    if (val) chip.addEventListener("click", () => toggleFilter(def.key, chip));
    else     chip.disabled = true;
    chipsWrap.appendChild(chip);
  });
  body.appendChild(chipsWrap);

  // Notes
  if (p.notes) {
    const notesBox = document.createElement("div"); notesBox.className = "detail-notes";
    notesBox.textContent = p.notes;
    body.appendChild(notesBox);
  }

  // Actions
  const actions = document.createElement("div"); actions.className = "detail-actions";
  if (p.website_url) {
    const a = document.createElement("a");
    a.className = "btn-website"; a.href = p.website_url; a.target = "_blank"; a.rel = "noopener noreferrer";
    a.innerHTML = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><circle cx="6.5" cy="6.5" r="5.5" stroke="white" stroke-width="1.5"/><path d="M6.5 1S4.5 3 4.5 6.5 6.5 12 6.5 12" stroke="white" stroke-width="1.2"/><path d="M6.5 1S8.5 3 8.5 6.5 6.5 12 6.5 12" stroke="white" stroke-width="1.2"/><line x1="1" y1="6.5" x2="12" y2="6.5" stroke="white" stroke-width="1.2"/></svg>${t("website_hours")}`;
    actions.appendChild(a);
  }
  const [lon, lat] = feature.geometry.coordinates;
  actions.appendChild(makeDirectionsBtn(lat, lon));
  body.appendChild(actions);
  container.appendChild(body);
}

// ── Detail sheets ──────────────────────────────────────────────────────────
function _openDetailHead(color, badgeText, name) {
  const head = document.getElementById("sheet-head-area");
  head.innerHTML = "";
  const badge = document.createElement("div"); badge.className = "sheet-badge";
  badge.textContent = badgeText;
  badge.style.cssText = `background:${color}18;color:${color};border:1px solid ${color}40;`;
  const title = document.createElement("div"); title.className = "sheet-name"; title.textContent = name;
  head.append(badge, title);
  return head;
}

function cell(label, value, full=false) {
  const d=document.createElement("div"); d.className="prop-cell"+(full?" full":"");
  const l=document.createElement("div"); l.className="prop-label"; l.textContent=label;
  const v=document.createElement("div"); v.className="prop-value"; v.textContent=value||"—";
  d.append(l,v); return d;
}

function showKoelteplaatsDetail(feature) {
  // Desktop: show in right panel (replaces list)
  if (isDesktop()) {
    enterDetailMode(feature);
    return;
  }

  // Mobile: use bottom sheet (original behavior)
  const p = feature.properties || {};
  const col = "#1A3B8B";
  const typeLabels = state.lang === "nl" ? TYPE_DISPLAY_NL : TYPE_DISPLAY_EN;
  const catLabel = typeLabels[p.type] || p.type || "Koelteplek";
  const locationLabel = [p.neighborhood, p.district].filter(Boolean).join(" · ") || "Koelteplek";

  const head = _openDetailHead(col, locationLabel, p.name || "Koelteplek");
  const tagRow = document.createElement("div"); tagRow.className = "tag-row";
  const catTag = document.createElement("div"); catTag.className = "tag tag--category";
  catTag.style.cssText = `background:${col}10;color:${col};border-color:${col}30;`;
  catTag.textContent = catLabel;
  tagRow.appendChild(catTag);
  if (p.active === false) {
    const inact = document.createElement("div"); inact.className = "tag tag--inactive";
    inact.textContent = state.lang === "nl" ? "Tijdelijk gesloten" : "Temporarily unavailable";
    tagRow.appendChild(inact);
  }
  head.appendChild(tagRow);

  const body = document.getElementById("sheet-body");
  body.innerHTML = "";

  // Photo + hours side by side
  const mediaRow = document.createElement("div"); mediaRow.className = "detail-media-row";
  const hoursCol = document.createElement("div"); hoursCol.className = "detail-hours-col";
  hoursCol.appendChild(renderHoursBlock(p.hours));
  if (p.hours_note) {
    const noteEl = document.createElement("div"); noteEl.className = "hours-note";
    noteEl.textContent = p.hours_note; hoursCol.appendChild(noteEl);
  }
  mediaRow.appendChild(hoursCol);
  if (p.photo_url) {
    const photoWrap = document.createElement("div"); photoWrap.className = "detail-photo-wrap";
    const img = document.createElement("img"); img.className = "detail-photo";
    img.src = p.photo_url; img.alt = p.name||""; img.loading = "lazy";
    photoWrap.appendChild(img); mediaRow.appendChild(photoWrap);
  }
  body.appendChild(mediaRow);

  // Amenity chips
  const chipsWrap = document.createElement("div"); chipsWrap.className = "filter-chips detail-chips";
  AMENITY_DEFS.forEach(def => {
    const val = p[def.key];
    if (val === null || val === undefined) return;
    const label = state.lang === "nl" ? def.label_nl : def.label_en;
    const chip = document.createElement("button");
    chip.className = "filter-chip" + (val ? " on" : " off");
    chip.textContent = val ? label : (state.lang==="nl" ? `Geen ${label.toLowerCase()}` : `No ${label.toLowerCase()}`);
    chip.setAttribute("aria-pressed", String(!!state.filters[def.key]));
    if (val) chip.addEventListener("click", () => toggleFilter(def.key, chip));
    else     chip.disabled = true;
    chipsWrap.appendChild(chip);
  });
  body.appendChild(chipsWrap);

  if (p.notes) {
    const notesBox = document.createElement("div"); notesBox.className = "detail-notes";
    notesBox.textContent = p.notes; body.appendChild(notesBox);
  }

  const actions = document.createElement("div"); actions.className = "detail-actions";
  if (p.website_url) {
    const a = document.createElement("a");
    a.className = "btn-website"; a.href = p.website_url; a.target = "_blank"; a.rel = "noopener noreferrer";
    a.innerHTML = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><circle cx="6.5" cy="6.5" r="5.5" stroke="white" stroke-width="1.5"/><path d="M6.5 1S4.5 3 4.5 6.5 6.5 12 6.5 12" stroke="white" stroke-width="1.2"/><path d="M6.5 1S8.5 3 8.5 6.5 6.5 12 6.5 12" stroke="white" stroke-width="1.2"/><line x1="1" y1="6.5" x2="12" y2="6.5" stroke="white" stroke-width="1.2"/></svg>${t("website_hours")}`;
    actions.appendChild(a);
  }
  const [lon, lat] = feature.geometry.coordinates;
  actions.appendChild(makeDirectionsBtn(lat, lon));
  body.appendChild(actions);

  openSheet();
  closeSidebarMobile();
}

function showTapDetail(feature) {
  const p=feature.properties||{}, col="#0566C8";
  _openDetailHead(col, t("water_label"), p["Dichtstbijzijnde adres binnen 100 meter"]||"Drinking water");
  const body=document.getElementById("sheet-body"); body.innerHTML="";
  const grid=document.createElement("div"); grid.className="prop-grid";
  grid.append(cell(t("address"),p["Dichtstbijzijnde adres binnen 100 meter"],true),cell(t("status"),p.Status),cell(t("owner"),p.Eigenaar),cell(t("type_label"),p["Subtype afnamepunt"]),cell(t("district"),p.District));
  if (p.Aanlegjaar) grid.appendChild(cell(t("installed"),String(p.Aanlegjaar).replace(".0","")));
  body.appendChild(grid);
  if (feature.geometry?.type==="Point") { const [lon,lat]=feature.geometry.coordinates; body.appendChild(makeDirectionsBtn(lat,lon)); }
  openSheet(); closeSidebarMobile();
}

function showParkDetail(feature) {
  const p=feature.properties||{}, col="#147A37";
  _openDetailHead(col, p.Stadsdeel||t("parks_label"), p.Naam||"Park");
  const body=document.getElementById("sheet-body"); body.innerHTML="";
  const grid=document.createElement("div"); grid.className="prop-grid";
  const area=p.Oppervlakte_m2?(p.Oppervlakte_m2>=10000?(p.Oppervlakte_m2/10000).toFixed(1)+" ha":p.Oppervlakte_m2.toLocaleString()+" m²"):null;
  grid.append(cell(t("district"),p.Stadsdeel),cell(t("area"),area),cell(t("city_park"),p.Stadspark==="J"?t("yes"):t("no")));
  body.appendChild(grid); openSheet(); closeSidebarMobile();
}

function makeDirectionsBtn(lat, lon) {
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent);
  const href=isIOS?`maps://?daddr=${lat},${lon}`:`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
  const a=document.createElement("a");
  a.className="btn-directions"; a.href=href; a.target="_blank"; a.rel="noopener noreferrer";
  a.innerHTML=`<svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M1.5 11.5L11.5 1.5M11.5 1.5H4.5M11.5 1.5V8.5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>${t("get_directions")}`;
  return a;
}

// ── Search ─────────────────────────────────────────────────────────────────
function setupSearch() {
  const input=document.getElementById("search-input"), results=document.getElementById("search-results");
  if (!input) return;
  input.placeholder=t("search_placeholder");
  let timer;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    const q=input.value.trim();
    if (q.length<2){results.setAttribute("hidden","");return;}
    timer=setTimeout(()=>doSearch(q),320);
  });
  input.addEventListener("keydown",e=>{if(e.key==="Escape"){results.setAttribute("hidden","");input.blur();}});
  document.addEventListener("click",e=>{if(!e.target.closest("#search-wrap"))results.setAttribute("hidden","");});
}

function doSearch(query) {
  const results=document.getElementById("search-results");
  results.innerHTML="";
  const q=query.toLowerCase();
  const localMatches=state.features.koelteplekken.filter(f=>{const p=f.properties||{};return(p.name||"").toLowerCase().includes(q)||(p.neighborhood||"").toLowerCase().includes(q)||(p.address||"").toLowerCase().includes(q);}).slice(0,3);
  localMatches.forEach(f=>{
    const p=f.properties||{};
    const el=document.createElement("div"); el.className="sr-item sr-item--local";
    el.innerHTML=`<div class="sr-name">${p.name}</div><div class="sr-sub">${[p.neighborhood,p.district].filter(Boolean).join(" · ")} · Koelteplaats</div>`;
    el.addEventListener("click",()=>{state.map.setView([f.geometry.coordinates[1],f.geometry.coordinates[0]],17);results.setAttribute("hidden","");document.getElementById("search-input").value=p.name;showKoelteplaatsDetail(f);closeSidebarMobile();});
    results.appendChild(el);
  });
  const url=`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query+" Amsterdam")}&format=json&countrycodes=nl&limit=4&viewbox=4.72,52.26,5.08,52.48&bounded=1`;
  fetch(url,{headers:{"Accept-Language":state.lang==="nl"?"nl":"en"}})
    .then(r=>r.json())
    .then(items=>{
      if (!items.length&&!localMatches.length){const el=document.createElement("div");el.className="sr-item";el.innerHTML=`<div class="sr-name">${t("no_search_results")}</div>`;results.appendChild(el);}
      else{items.forEach(item=>{const parts=item.display_name.split(", ");const el=document.createElement("div");el.className="sr-item";el.innerHTML=`<div class="sr-name">${parts[0]}</div><div class="sr-sub">${parts.slice(1,3).join(", ")}</div>`;el.addEventListener("click",()=>{state.map.setView([parseFloat(item.lat),parseFloat(item.lon)],16);results.setAttribute("hidden","");document.getElementById("search-input").value=parts[0];closeSidebarMobile();});results.appendChild(el);});}
      results.removeAttribute("hidden");
    }).catch(e=>console.error("search:",e));
}

// ── Tips / Contact ─────────────────────────────────────────────────────────
function setupTipsBtn() {
  const btnContact=document.getElementById("btn-contact");
  if (btnContact) btnContact.addEventListener("click",e=>{e.stopPropagation();showContactPage();});
  const contactBack=document.getElementById("contact-back");
  if (contactBack) contactBack.addEventListener("click",closeContactPage);
}
function showContactPage()  { renderContactPage(); document.getElementById("contact-page").classList.add("open"); closeSidebarMobile(); }
function closeContactPage() { document.getElementById("contact-page").classList.remove("open"); }

function renderContactPage() {
  const body=document.getElementById("contact-page-body"); body.innerHTML="";
  const hero=document.createElement("div"); hero.className="tp-hero";
  const heroTitle=document.createElement("div"); heroTitle.className="tp-hero-title"; heroTitle.textContent=t("contact_page_title");
  const heroSub=document.createElement("div"); heroSub.className="tp-hero-sub"; heroSub.textContent=t("contact_page_hero_sub");
  hero.append(heroTitle,heroSub); body.appendChild(hero);
  const ggdCard=document.createElement("div"); ggdCard.className="cp-card";
  const ggdHeading=document.createElement("div"); ggdHeading.className="cp-card-heading";
  const ggdTitle=document.createElement("span"); ggdTitle.className="cp-card-title"; ggdTitle.textContent=t("contact_ggd_title");
  ggdHeading.append(ggdTitle); ggdCard.appendChild(ggdHeading);
  const phoneRow=_cpRow(t("contact_ggd_phone_label"));
  const phoneLink=document.createElement("a"); phoneLink.href="tel:+31205555911"; phoneLink.className="cp-link"; phoneLink.textContent=t("contact_ggd_phone");
  const phoneHours=document.createElement("span"); phoneHours.className="cp-sub"; phoneHours.textContent=t("contact_ggd_phone_hours");
  phoneRow.valueEl.appendChild(phoneLink); phoneRow.valueEl.appendChild(phoneHours); ggdCard.appendChild(phoneRow.el);
  const postRow=_cpRow(t("contact_ggd_post_label")); postRow.valueEl.style.whiteSpace="pre-line"; postRow.valueEl.textContent=t("contact_ggd_post"); ggdCard.appendChild(postRow.el);
  const visitRow=_cpRow(t("contact_ggd_visit_label")); visitRow.valueEl.style.whiteSpace="pre-line"; visitRow.valueEl.textContent=t("contact_ggd_visit"); ggdCard.appendChild(visitRow.el);
  const webRow=_cpRow(t("contact_ggd_web_label"));
  const webLink=document.createElement("a"); webLink.href="https://www.ggd.amsterdam.nl"; webLink.target="_blank"; webLink.rel="noopener noreferrer"; webLink.className="cp-link"; webLink.textContent="ggd.amsterdam.nl";
  webRow.valueEl.appendChild(webLink); ggdCard.appendChild(webRow.el);
  body.appendChild(ggdCard);
  const submitCard=document.createElement("div"); submitCard.className="cp-card cp-card--highlight";
  const submitHeading=document.createElement("div"); submitHeading.className="cp-card-heading";
  const submitTitle=document.createElement("span"); submitTitle.className="cp-card-title"; submitTitle.textContent=t("contact_submit_title");
  submitHeading.append(submitTitle); submitCard.appendChild(submitHeading);
  const submitBody=document.createElement("p"); submitBody.className="cp-card-body"; submitBody.textContent=t("contact_submit_body"); submitCard.appendChild(submitBody);
  const sPhoneRow=_cpRow(t("contact_submit_phone_label"));
  const sPhoneLink=document.createElement("a"); sPhoneLink.href="tel:+31641812999"; sPhoneLink.className="cp-link"; sPhoneLink.textContent=t("contact_submit_phone");
  sPhoneRow.valueEl.appendChild(sPhoneLink); submitCard.appendChild(sPhoneRow.el);
  const sEmailRow=_cpRow(t("contact_submit_email_label"));
  const sEmailLink=document.createElement("a"); sEmailLink.href="mailto:e.coolen@amsterdam.nl"; sEmailLink.className="cp-link"; sEmailLink.textContent=t("contact_submit_email");
  sEmailRow.valueEl.appendChild(sEmailLink); submitCard.appendChild(sEmailRow.el);
  body.appendChild(submitCard);
}
function _cpRow(label) {
  const el=document.createElement("div"); el.className="cp-row";
  const labelEl=document.createElement("div"); labelEl.className="cp-row-label";
  const labelText=document.createElement("span"); labelText.textContent=label;
  labelEl.append(labelText);
  const valueEl=document.createElement("div"); valueEl.className="cp-row-value";
  el.append(labelEl,valueEl);
  return {el,valueEl};
}

function renderTipsPage() {
  const body=document.getElementById("tips-page-body");
  if (!body) return;
  body.innerHTML="";
  const hero=document.createElement("div"); hero.className="tp-hero";
  const heroTitle=document.createElement("div"); heroTitle.className="tp-hero-title"; heroTitle.textContent=t("tips_page_title");
  const heroSub=document.createElement("div"); heroSub.className="tp-hero-sub"; heroSub.textContent=t("tips_page_subtitle");
  hero.append(heroTitle,heroSub); body.appendChild(hero);
  const hpBox=document.createElement("div"); hpBox.className="tp-heatplan-box";
  const hpTitle=document.createElement("div"); hpTitle.className="tp-heatplan-title"; hpTitle.textContent=t("heat_plan_what_title");
  const hpBody=document.createElement("div"); hpBody.className="tp-heatplan-body"; hpBody.textContent=t("heat_plan_what_body");
  hpBox.append(hpTitle,hpBody); body.appendChild(hpBox);
  const grid=document.createElement("div"); grid.className="tp-grid";
  for (let i=1;i<=6;i++){const card=document.createElement("div");card.className="tp-card";const title=document.createElement("div");title.className="tp-card-title";title.textContent=t(`tip${i}_title`);const bodyTxt=document.createElement("div");bodyTxt.className="tp-card-body";bodyTxt.textContent=t(`tip${i}_body`);card.append(title,bodyTxt);grid.appendChild(card);}
  body.appendChild(grid);
  const emergency=document.createElement("div"); emergency.className="tp-emergency";
  const eTitle=document.createElement("div"); eTitle.className="tp-emergency-title"; eTitle.textContent=t("tip_emergency_title");
  const eBody=document.createElement("div"); eBody.className="tp-emergency-body"; eBody.textContent=t("tip_emergency_body");
  emergency.append(eTitle,eBody); body.appendChild(emergency);
  const disc=document.createElement("div"); disc.className="tp-disclaimer"; disc.textContent=t("tips_disclaimer"); body.appendChild(disc);
}

// ── List view ──────────────────────────────────────────────────────────────
function getListItems() {
  // Koelteplekken only (water taps excluded from list)
  let items = state.features.koelteplekken
    .filter(f => koelteplekPassesFilters(f.properties || {}))
    .map(f => ({ feature: f, cat: "koelteplekken" }));

  if (state.userPos) {
    // Sort by distance
    items.sort((a, b) => {
      const getD = f => {
        const [lo, la] = f.geometry.coordinates;
        return haversine(state.userPos.lat, state.userPos.lon, la, lo);
      };
      return getD(a.feature) - getD(b.feature);
    });
  } else {
    // Sort by open status
    const ord = { open: 0, unknown: 1, closed: 2 };
    items.sort((a, b) => {
      const getOrd = f => {
        if (f.properties?.active === false) return 2;
        return ord[getOpenStatus(f.properties?.hours).status] ?? 1;
      };
      return getOrd(a.feature) - getOrd(b.feature);
    });
  }
  return items;
}

function renderListView() {
  const inner = document.getElementById("list-view-inner");
  if (!inner) return;
  inner.innerHTML = "";

  const items = getListItems();

  // Update panel header
  const titleEl = document.getElementById("panel-hdr-title");
  const countEl = document.getElementById("panel-hdr-count");
  if (titleEl) titleEl.textContent = state.userPos ? t("near_you") : t("lv_title");
  if (countEl) countEl.textContent = `${items.length} ${t("lv_found")}`;

  const statusEl = document.getElementById("a11y-status");
  if (statusEl) statusEl.textContent = `${items.length} ${t("lv_found")}`;

  if (items.length === 0) {
    const empty = document.createElement("div"); empty.className = "lv-empty";
    const et = document.createElement("div"); et.className = "lv-empty-title"; et.textContent = t("lv_no_results");
    const es = document.createElement("div"); es.className = "lv-empty-sub";   es.textContent = t("lv_no_results_sub");
    empty.append(et, es); inner.appendChild(empty);
    return;
  }

  const list = document.createElement("ul"); list.className = "lv-list";

  items.forEach(({ feature }) => {
    const p = feature.properties || {};
    const color = CATEGORY_COLORS[p.type] || CATEGORY_COLORS.default;
    const typeLabels = state.lang === "nl" ? TYPE_DISPLAY_NL : TYPE_DISPLAY_EN;
    const typeLabel = typeLabels[p.type] || p.type || "";

    const li = document.createElement("li");
    li.className = "lv-item";
    li.setAttribute("role", "button");
    li.setAttribute("tabindex", "0");
    li.setAttribute("aria-label", `${p.name || "Koelteplek"}, ${[typeLabel, p.neighborhood].filter(Boolean).join(", ")}`);

    // Photo thumbnail
    const photoEl = document.createElement("div"); photoEl.className = "lv-photo";
    if (p.photo_url) {
      const img = document.createElement("img");
      img.src = p.photo_url; img.alt = ""; img.loading = "lazy";
      photoEl.appendChild(img);
    } else {
      photoEl.classList.add("lv-photo--placeholder");
      photoEl.style.background = color + "14";
      photoEl.style.borderColor = color + "28";
      const initial = document.createElement("span");
      initial.textContent = (typeLabel || "K")[0].toUpperCase();
      initial.style.color = color;
      photoEl.appendChild(initial);
    }

    const content = document.createElement("div"); content.className = "lv-content";

    // Name + status badge
    const topRow = document.createElement("div"); topRow.className = "lv-top-row";
    const nameEl = document.createElement("span"); nameEl.className = "lv-name";
    nameEl.textContent = p.name || "Koelteplek";
    const badge = document.createElement("span"); badge.className = "lv-status-badge";
    if (p.active === false) {
      badge.textContent = state.lang === "nl" ? "Gesloten" : "Closed";
      badge.classList.add("lv-status-badge--closed");
    } else {
      const s = getOpenStatus(p.hours);
      if (s.status === "open")        { badge.textContent = t("open_now");   badge.classList.add("lv-status-badge--open"); }
      else if (s.status === "closed") { badge.textContent = t("closed_now"); badge.classList.add("lv-status-badge--closed"); }
      else                            { badge.textContent = t("lv_unknown"); badge.classList.add("lv-status-badge--unknown"); }
    }
    topRow.append(nameEl, badge);

    // Meta: type + neighbourhood
    const meta = document.createElement("div"); meta.className = "lv-meta";
    meta.textContent = [typeLabel, p.neighborhood].filter(Boolean).join(" · ");

    // Footer: distance (if near-me) + amenity pills
    const footer = document.createElement("div"); footer.className = "lv-footer";
    if (state.userPos && feature.geometry?.type === "Point") {
      const [lo, la] = feature.geometry.coordinates;
      const dist = haversine(state.userPos.lat, state.userPos.lon, la, lo);
      const distEl = document.createElement("span"); distEl.className = "lv-dist";
      distEl.textContent = fmtDist(dist);
      footer.appendChild(distEl);
    }
    const trueAmenities = AMENITY_DEFS.filter(d => p[d.key] === true);
    trueAmenities.slice(0, 3).forEach(def => {
      const pill = document.createElement("span"); pill.className = "lv-amenity";
      pill.textContent = state.lang === "nl" ? def.label_nl : def.label_en;
      footer.appendChild(pill);
    });
    if (trueAmenities.length > 3) {
      const more = document.createElement("span"); more.className = "lv-amenity lv-amenity--more";
      more.textContent = `+${trueAmenities.length - 3}`;
      footer.appendChild(more);
    }

    content.append(topRow, meta, footer);
    li.append(photoEl, content);
    li.addEventListener("click", () => showKoelteplaatsDetail(feature));
    li.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); li.click(); } });
    list.appendChild(li);
  });

  inner.appendChild(list);
}

function isListViewActive() {
  if (isDesktop()) return state.panelMode === "list";
  const el = document.getElementById("list-view");
  return el && !el.hidden;
}
function refreshListIfActive() { if (isListViewActive()) renderListView(); }

// ── View toggle (mobile only) ──────────────────────────────────────────────
function setupViewToggle() {
  document.querySelectorAll(".view-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".view-btn").forEach(b => {
        b.classList.toggle("active", b === btn);
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
      if (isDesktop()) return; // right panel always visible on desktop
      const mapEl = document.getElementById("map");
      const listEl = document.getElementById("list-view");
      if (btn.dataset.view === "list") {
        listEl.hidden = false;
        mapEl.style.display = "none";
        renderListView();
      } else {
        listEl.hidden = true;
        mapEl.style.display = "";
        if (state.map) state.map.invalidateSize();
      }
    });
  });
}

function setupSkipLink() {
  const skip = document.querySelector(".skip-link");
  if (!skip) return;
  skip.addEventListener("click", event => {
    event.preventDefault();
    const mapEl=document.getElementById("map"), listEl=document.getElementById("list-view"), listInner=document.getElementById("list-view-inner");
    document.querySelectorAll(".view-btn").forEach(btn=>{const isList=btn.dataset.view==="list";btn.classList.toggle("active",isList);btn.setAttribute("aria-pressed",isList?"true":"false");});
    if (mapEl) mapEl.style.display="none";
    if (listEl) listEl.hidden=false;
    renderListView();
    if (listInner){listInner.focus();listInner.scrollIntoView({behavior:"smooth",block:"start"});}
  });
}

// ── Keyboard shortcuts ─────────────────────────────────────────────────────
function setupKeyboard() {
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeContactPage(); closeSheet(); closeSidebarMobile();
      if (isDesktop() && state.panelMode === "detail") exitDetailMode();
    }
  });
}

// ── Landing intro ───────────────────────────────────────────────────────────
function setupLandingIntro() {
  document.querySelectorAll(".btn-li-enter").forEach(btn => {
    btn.addEventListener("click", () => {
      const mapSection=document.getElementById("map-section");
      if (mapSection) mapSection.scrollIntoView({behavior:"smooth"});
      setTimeout(()=>{ if(state.map) state.map.invalidateSize(); },250);
      setTimeout(()=>{ if(state.map) state.map.invalidateSize(); },800);
    });
  });
  const obs=new IntersectionObserver(entries=>{if(entries[0].isIntersecting&&state.map){setTimeout(()=>{state.map.invalidateSize();refreshListIfActive();},100);setTimeout(()=>{state.map.invalidateSize();refreshListIfActive();},500);}},{threshold:0.1});
  const ms=document.getElementById("map-section"); if(ms) obs.observe(ms);
}

// ── Live weather strip ─────────────────────────────────────────────────────
function formatDutchNumber(value, decimals=1) {
  const number=Number(String(value).replace(",","."));
  if (!Number.isFinite(number)) return "--";
  return number.toLocaleString("nl-NL",{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
}

async function loadWeatherBar() {
  const strip=document.getElementById("weather-strip");
  if (!strip) return;
  try {
    const response=await fetch("/api/weather?locatie=Amsterdam");
    if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);
    const data=await response.json();
    const tempEl=document.getElementById("weather-temp"), humidityEl=document.getElementById("weather-humidity"), feelsEl=document.getElementById("weather-feels"), sourceEl=document.getElementById("weather-source");
    if (sourceEl){sourceEl.textContent=data.source||"Open-Meteo";sourceEl.href=data.source_url||"https://open-meteo.com/";sourceEl.target="_blank";sourceEl.rel="noopener noreferrer";}
    if (tempEl){const value=`${formatDutchNumber(data.temperature,1)}°`;tempEl.textContent=value;tempEl.setAttribute("aria-label",`${t("weather_temp_label")}: ${value}`);}
    if (humidityEl){const humidity=Number(String(data.humidity).replace(",","."));const value=Number.isFinite(humidity)?`${Math.round(humidity)}%`:"--%";humidityEl.textContent=value;humidityEl.setAttribute("aria-label",`${t("weather_humidity_label")}: ${value}`);}
    if (feelsEl){const value=`${formatDutchNumber(data.feels_like,0)}°`;feelsEl.textContent=value;feelsEl.setAttribute("aria-label",`${t("weather_feels_label")}: ${value}`);}
  } catch(error) {
    console.warn("Could not load weather data:",error);
    const tempEl=document.getElementById("weather-temp"), humidityEl=document.getElementById("weather-humidity"), feelsEl=document.getElementById("weather-feels");
    if(tempEl) tempEl.textContent="--°";
    if(humidityEl) humidityEl.textContent="--%";
    if(feelsEl) feelsEl.textContent="--°";
  }
}

// ── Boot ───────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  HC.init();
  setupLandingIntro();
  initMap();
  loadAllLayers();
  loadHeatLayer();
  setupBanner();
  setupLang();
  setupModeToggle();
  setupToggles();
  setupCategoryFilter();
  setupFilters();
  setupHeatToggle();
  setupNearBtn();
  setupTipsBtn();
  setupSearch();
  setupSidebarToggle();
  setupKeyboard();
  setupViewToggle();
  setupSkipLink();
  applyLanguage();
  loadWeatherBar();
  setInterval(loadWeatherBar, 10 * 60 * 1000);

  document.getElementById("sheet-close").addEventListener("click", e => { e.stopPropagation(); closeSheet(); });

  // Panel back button
  const panelBack = document.getElementById("panel-hdr-back");
  if (panelBack) panelBack.addEventListener("click", exitDetailMode);

  // On desktop, show right panel immediately with empty state (will fill when data loads)
  if (isDesktop()) {
    document.getElementById("list-view").removeAttribute("hidden");
    renderListView();
  }
});
