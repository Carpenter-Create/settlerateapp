/**
 * ZIP-based estimation service for property taxes and insurance.
 * 
 * This is a placeholder implementation using national/state-level defaults.
 * Future versions will integrate a real ZIP/county API without changing
 * the interface or data structures.
 */

export interface ZipEstimate {
  propertyTaxRate: number; // Annual percentage of home value
  homeInsuranceMonthly: number; // Monthly amount in dollars
  pmiMonthly: number; // Monthly PMI estimate for <20% down
  state: string | null; // Inferred state if available
}

// Minimal state mapping from ZIP code prefix (first 3 digits)
// This covers common ranges; unknown ZIPs default to national average
const ZIP_TO_STATE: Record<string, string> = {
  // Northeast
  "010": "MA", "011": "MA", "012": "MA", "013": "MA", "014": "MA", "015": "MA",
  "016": "MA", "017": "MA", "018": "MA", "019": "MA", "020": "MA", "021": "MA",
  "022": "MA", "023": "MA", "024": "MA", "100": "NY", "101": "NY", "102": "NY",
  "103": "NY", "104": "NY", "105": "NY", "106": "NY", "107": "NY", "108": "NY",
  "109": "NY", "110": "NY", "111": "NY", "112": "NY", "113": "NY", "114": "NY",
  "115": "NY", "116": "NY", "117": "NY", "118": "NY", "119": "NY", "120": "NY",
  "121": "NY", "122": "NY", "123": "NY", "124": "NY", "125": "NY", "126": "NY",
  "127": "NY", "128": "NY", "129": "NY", "130": "NY", "131": "NY", "132": "NY",
  "133": "NY", "134": "NY", "135": "NY", "136": "NY", "137": "NY", "138": "NY",
  "139": "NY", "140": "NY", "141": "NY", "142": "NY", "143": "NY", "144": "NY",
  "145": "NY", "146": "NY", "147": "NY", "148": "NY", "149": "NY",
  "070": "NJ", "071": "NJ", "072": "NJ", "073": "NJ", "074": "NJ", "075": "NJ",
  "076": "NJ", "077": "NJ", "078": "NJ", "079": "NJ", "080": "NJ", "081": "NJ",
  "082": "NJ", "083": "NJ", "084": "NJ", "085": "NJ", "086": "NJ", "087": "NJ",
  "088": "NJ", "089": "NJ",
  // Mid-Atlantic
  "150": "PA", "151": "PA", "152": "PA", "153": "PA", "154": "PA", "155": "PA",
  "156": "PA", "157": "PA", "158": "PA", "159": "PA", "160": "PA", "161": "PA",
  "162": "PA", "163": "PA", "164": "PA", "165": "PA", "166": "PA", "167": "PA",
  "168": "PA", "169": "PA", "170": "PA", "171": "PA", "172": "PA", "173": "PA",
  "174": "PA", "175": "PA", "176": "PA", "177": "PA", "178": "PA", "179": "PA",
  "180": "PA", "181": "PA", "182": "PA", "183": "PA", "184": "PA", "185": "PA",
  "186": "PA", "187": "PA", "188": "PA", "189": "PA", "190": "PA", "191": "PA",
  // Southeast
  "200": "DC", "201": "VA", "202": "DC", "203": "DC", "204": "DC", "205": "DC",
  "220": "VA", "221": "VA", "222": "VA", "223": "VA", "224": "VA", "225": "VA",
  "226": "VA", "227": "VA", "228": "VA", "229": "VA", "230": "VA", "231": "VA",
  "232": "VA", "233": "VA", "234": "VA", "235": "VA", "236": "VA", "237": "VA",
  "238": "VA", "239": "VA", "240": "VA", "241": "VA", "242": "VA", "243": "VA",
  "244": "VA", "245": "VA", "246": "WV",
  "270": "NC", "271": "NC", "272": "NC", "273": "NC", "274": "NC", "275": "NC",
  "276": "NC", "277": "NC", "278": "NC", "279": "NC", "280": "NC", "281": "NC",
  "282": "NC", "283": "NC", "284": "NC", "285": "NC", "286": "NC", "287": "NC",
  "288": "NC", "289": "NC",
  "290": "SC", "291": "SC", "292": "SC", "293": "SC", "294": "SC", "295": "SC",
  "296": "SC", "297": "SC", "298": "SC", "299": "SC",
  "300": "GA", "301": "GA", "302": "GA", "303": "GA", "304": "GA", "305": "GA",
  "306": "GA", "307": "GA", "308": "GA", "309": "GA", "310": "GA", "311": "GA",
  "312": "GA", "313": "GA", "314": "GA", "315": "GA", "316": "GA", "317": "GA",
  "318": "GA", "319": "GA",
  "320": "FL", "321": "FL", "322": "FL", "323": "FL", "324": "FL", "325": "FL",
  "326": "FL", "327": "FL", "328": "FL", "329": "FL", "330": "FL", "331": "FL",
  "332": "FL", "333": "FL", "334": "FL", "335": "FL", "336": "FL", "337": "FL",
  "338": "FL", "339": "FL", "340": "FL", "341": "FL", "342": "FL", "344": "FL",
  "346": "FL", "347": "FL", "349": "FL",
  // Midwest
  "430": "OH", "431": "OH", "432": "OH", "433": "OH", "434": "OH", "435": "OH",
  "436": "OH", "437": "OH", "438": "OH", "439": "OH", "440": "OH", "441": "OH",
  "442": "OH", "443": "OH", "444": "OH", "445": "OH", "446": "OH", "447": "OH",
  "448": "OH", "449": "OH", "450": "OH", "451": "OH", "452": "OH", "453": "OH",
  "454": "OH", "455": "OH", "456": "OH", "457": "OH", "458": "OH",
  "480": "MI", "481": "MI", "482": "MI", "483": "MI", "484": "MI", "485": "MI",
  "486": "MI", "487": "MI", "488": "MI", "489": "MI", "490": "MI", "491": "MI",
  "492": "MI", "493": "MI", "494": "MI", "495": "MI", "496": "MI", "497": "MI",
  "498": "MI", "499": "MI",
  "600": "IL", "601": "IL", "602": "IL", "603": "IL", "604": "IL", "605": "IL",
  "606": "IL", "607": "IL", "608": "IL", "609": "IL", "610": "IL", "611": "IL",
  "612": "IL", "613": "IL", "614": "IL", "615": "IL", "616": "IL", "617": "IL",
  "618": "IL", "619": "IL", "620": "IL", "622": "IL", "623": "IL", "624": "IL",
  "625": "IL", "626": "IL", "627": "IL", "628": "IL", "629": "IL",
  // Texas
  "750": "TX", "751": "TX", "752": "TX", "753": "TX", "754": "TX", "755": "TX",
  "756": "TX", "757": "TX", "758": "TX", "759": "TX", "760": "TX", "761": "TX",
  "762": "TX", "763": "TX", "764": "TX", "765": "TX", "766": "TX", "767": "TX",
  "768": "TX", "769": "TX", "770": "TX", "772": "TX", "773": "TX", "774": "TX",
  "775": "TX", "776": "TX", "777": "TX", "778": "TX", "779": "TX", "780": "TX",
  "781": "TX", "782": "TX", "783": "TX", "784": "TX", "785": "TX", "786": "TX",
  "787": "TX", "788": "TX", "789": "TX", "790": "TX", "791": "TX", "792": "TX",
  "793": "TX", "794": "TX", "795": "TX", "796": "TX", "797": "TX", "798": "TX",
  "799": "TX",
  // West
  "850": "AZ", "851": "AZ", "852": "AZ", "853": "AZ", "854": "AZ", "855": "AZ",
  "856": "AZ", "857": "AZ", "858": "AZ", "859": "AZ", "860": "AZ", "863": "AZ",
  "864": "AZ", "865": "AZ",
  "890": "NV", "891": "NV", "893": "NV", "894": "NV", "895": "NV", "896": "NV",
  "897": "NV", "898": "NV",
  "800": "CO", "801": "CO", "802": "CO", "803": "CO", "804": "CO", "805": "CO",
  "806": "CO", "807": "CO", "808": "CO", "809": "CO", "810": "CO", "811": "CO",
  "812": "CO", "813": "CO", "814": "CO", "815": "CO", "816": "CO",
  "900": "CA", "901": "CA", "902": "CA", "903": "CA", "904": "CA", "905": "CA",
  "906": "CA", "907": "CA", "908": "CA", "909": "CA", "910": "CA", "911": "CA",
  "912": "CA", "913": "CA", "914": "CA", "915": "CA", "916": "CA", "917": "CA",
  "918": "CA", "919": "CA", "920": "CA", "921": "CA", "922": "CA", "923": "CA",
  "924": "CA", "925": "CA", "926": "CA", "927": "CA", "928": "CA", "930": "CA",
  "931": "CA", "932": "CA", "933": "CA", "934": "CA", "935": "CA", "936": "CA",
  "937": "CA", "938": "CA", "939": "CA", "940": "CA", "941": "CA", "942": "CA",
  "943": "CA", "944": "CA", "945": "CA", "946": "CA", "947": "CA", "948": "CA",
  "949": "CA", "950": "CA", "951": "CA", "952": "CA", "953": "CA", "954": "CA",
  "955": "CA", "956": "CA", "957": "CA", "958": "CA", "959": "CA", "960": "CA",
  "961": "CA",
  // Pacific Northwest
  "970": "OR", "971": "OR", "972": "OR", "973": "OR", "974": "OR", "975": "OR",
  "976": "OR", "977": "OR", "978": "OR", "979": "OR",
  "980": "WA", "981": "WA", "982": "WA", "983": "WA", "984": "WA", "985": "WA",
  "986": "WA", "987": "WA", "988": "WA", "989": "WA", "990": "WA", "991": "WA",
  "992": "WA", "993": "WA", "994": "WA",
};

// State-level property tax rates (approximate annual percentage)
// Source: Conservative estimates based on public data
const STATE_TAX_RATES: Record<string, number> = {
  // High tax states
  "NJ": 2.21, "IL": 2.08, "NH": 1.93, "CT": 1.79, "VT": 1.74,
  "WI": 1.61, "TX": 1.60, "NE": 1.54, "NY": 1.40, "PA": 1.36,
  "OH": 1.36, "IA": 1.29, "MI": 1.25, "KS": 1.29, "SD": 1.17,
  "ME": 1.09, "MN": 1.05, "MA": 1.04, "RI": 1.35,
  // Medium tax states
  "MD": 0.99, "AK": 0.98, "MO": 0.91, "OR": 0.87, "ND": 0.86,
  "GA": 0.83, "FL": 0.80, "NC": 0.77, "WA": 0.84, "VA": 0.80,
  "IN": 0.75, "MT": 0.74, "DE": 0.43, "KY": 0.72, "TN": 0.56,
  // Low tax states
  "AZ": 0.51, "SC": 0.53, "ID": 0.63, "NM": 0.55, "MS": 0.52,
  "WV": 0.49, "AR": 0.52, "UT": 0.52, "NV": 0.48, "WY": 0.51,
  "LA": 0.53, "AL": 0.37, "CO": 0.49, "CA": 0.71, "OK": 0.85,
  "HI": 0.31, "DC": 0.56,
};

// State-level home insurance estimates (monthly)
// These are conservative estimates
const STATE_INSURANCE: Record<string, number> = {
  // High insurance states (hurricane, tornado, etc.)
  "FL": 250, "LA": 225, "TX": 200, "OK": 195, "KS": 180,
  "MS": 185, "AL": 175, "NE": 165, "CO": 160, "MO": 155,
  // Medium insurance states
  "AR": 145, "GA": 145, "SC": 140, "TN": 135, "KY": 130,
  "NC": 135, "MI": 130, "IN": 125, "OH": 120, "PA": 115,
  "NY": 135, "NJ": 125, "CT": 130, "MA": 135, "MD": 115,
  "VA": 110, "IL": 120, "MN": 140, "IA": 130, "WI": 115,
  // Lower insurance states
  "CA": 145, "AZ": 110, "NV": 100, "UT": 95, "ID": 90,
  "OR": 85, "WA": 90, "MT": 120, "WY": 115, "NM": 105,
  "NH": 100, "VT": 95, "ME": 95, "RI": 115, "DE": 90,
  "WV": 105, "ND": 125, "SD": 130, "AK": 105, "HI": 95,
  "DC": 100,
};

// National defaults (conservative)
const NATIONAL_DEFAULTS: ZipEstimate = {
  propertyTaxRate: 1.25, // National average ~1.1%, using slightly higher for safety
  homeInsuranceMonthly: 175,
  pmiMonthly: 150,
  state: null,
};

/**
 * Infer state from ZIP code using the first 3 digits
 */
export function inferStateFromZip(zipCode: string): string | null {
  const prefix = zipCode.substring(0, 3);
  return ZIP_TO_STATE[prefix] ?? null;
}

/**
 * Get ZIP-based estimates for property taxes and insurance.
 * 
 * @param zipCode - 5-digit ZIP code (optional)
 * @returns ZipEstimate with conservative defaults
 */
export function getZipEstimate(zipCode?: string | null): ZipEstimate {
  if (!zipCode || zipCode.length < 3) {
    return NATIONAL_DEFAULTS;
  }

  const state = inferStateFromZip(zipCode);
  
  if (!state) {
    return NATIONAL_DEFAULTS;
  }

  return {
    propertyTaxRate: STATE_TAX_RATES[state] ?? NATIONAL_DEFAULTS.propertyTaxRate,
    homeInsuranceMonthly: STATE_INSURANCE[state] ?? NATIONAL_DEFAULTS.homeInsuranceMonthly,
    pmiMonthly: NATIONAL_DEFAULTS.pmiMonthly,
    state,
  };
}

/**
 * Calculate annual property tax from rate and home value
 */
export function calculateAnnualTaxFromRate(homeValue: number, rate: number): number {
  return homeValue * (rate / 100);
}

/**
 * Calculate monthly property tax from annual amount
 */
export function calculateMonthlyTax(annualTax: number): number {
  return annualTax / 12;
}

/**
 * Validate ZIP code format
 */
export function isValidZipCode(zipCode: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(zipCode);
}
