// MV3 service worker: schedule periodic refresh and store results in chrome.storage.local
const ALARM_NAME = 'hn_refresh_alarm';
const DEFAULT_INTERVAL_MS = 1200000; // 20 minutes

async function getOptions() {
  return new Promise((resolve) => {
    chrome.storage.local.get({
      'HN.RequestInterval': DEFAULT_INTERVAL_MS,
    }, (items) => resolve(items));
  });
}

function scheduleAlarm(intervalMs) {
  const periodInMinutes = Math.max(1, Math.floor(intervalMs / 60000));
  chrome.alarms.clear(ALARM_NAME, () => {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes });
  });
}

async function fetchRss() {
  try {
    const res = await fetch('https://news.ycombinator.com/rss');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const links = parseHNLinks(text, 15);
    await saveLinks(links);
    await chrome.action.setBadgeText({ text: '' });
  } catch (e) {
    // On failure, we can set a small badge to hint an issue
    chrome.action.setBadgeText({ text: '!' });
  }
}

async function saveLinks(links) {
  const items = { 'HN.NumLinks': links.length };
  links.forEach((l, i) => {
    items[`HN.Link${i}`] = JSON.stringify(l);
  });
  items['HN.LastRefresh'] = Date.now();
  return new Promise((resolve) => chrome.storage.local.set(items, resolve));
}

function parseHNLinks(rawXmlStr, maxCount) {
  // Very lightweight parser for RSS/Atom items. Not fully compliant but sufficient here.
  const items = [];
  // Normalize whitespace
  const xml = rawXmlStr.replace(/\r\n?/g, '\n');
  // Try Atom <entry>, else RSS <item>
  const entryMatches = xml.match(/<entry[\s\S]*?<\/entry>/g) || xml.match(/<item[\s\S]*?<\/item>/g) || [];
  const count = Math.min(entryMatches.length, maxCount);
  for (let i = 0; i < count; i++) {
    const segment = entryMatches[i];
    const getTag = (tag) => {
      const m = segment.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return m ? decodeHtml(stripCdata(m[1]).trim()) : '';
    };
    const hn = {
      Title: getTag('title') || 'Unknown Title',
      Link: getTag('link') || getTag('comments') || '',
      CommentsLink: getTag('comments') || ''
    };
    items.push(hn);
  }
  return items;
}

function stripCdata(s) {
  return s.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
}

function decodeHtml(s) {
  // Decode common named entities and numeric character references (decimal and hex)
  let out = s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");
  // Decimal NCRs: &#NNNN;
  out = out.replace(/&#(\d+);/g, (_, d) => {
    try { return String.fromCodePoint(parseInt(d, 10)); } catch { return _; }
  });
  // Hex NCRs: &#xHHHH;
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
    try { return String.fromCodePoint(parseInt(h, 16)); } catch { return _; }
  });
  return out;
}

chrome.runtime.onInstalled.addListener(async () => {
  const { 'HN.RequestInterval': intervalMs } = await getOptions();
  scheduleAlarm(intervalMs);
  await fetchRss();
});

chrome.runtime.onStartup.addListener(async () => {
  const { 'HN.RequestInterval': intervalMs } = await getOptions();
  scheduleAlarm(intervalMs);
  // Don't aggressively fetch on startup to reduce load; alarm will trigger soon.
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    fetchRss();
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes['HN.RequestInterval']) {
    const newVal = changes['HN.RequestInterval'].newValue || DEFAULT_INTERVAL_MS;
    scheduleAlarm(newVal);
  }
});
