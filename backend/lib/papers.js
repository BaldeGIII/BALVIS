// Finding papers (arXiv, Semantic Scholar, OpenAlex, IEEE) and downloading + reading their full text.
const dns = require('node:dns/promises');
const net = require('node:net');
const path = require('node:path');
const fs = require('node:fs');
const axios = require('axios');
const pdfParse = require('pdf-parse');
const workspace = require('./workspace');

const UA = 'BALVIS/1.0 (research assistant)';
const SEARCH_TIMEOUT = 8000; // per source: a dead one must not hold up the rest

const xmlTag = (xml, tag) =>
  (xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [])[1]?.replace(/\s+/g, ' ').trim() || '';

const arxivId = (text) => String(text || '').match(/arxiv\.org\/(?:abs|pdf)\/([^?#\s]+?)(?:\.pdf)?(?:[?#].*)?$/i)?.[1] || '';
const arxivPdf = (id) => `https://arxiv.org/pdf/${id}`;

async function searchArxiv(q) {
  const { data } = await axios.get('https://export.arxiv.org/api/query', {
    params: { search_query: `all:${q}`, max_results: 8, sortBy: 'relevance' },
    timeout: SEARCH_TIMEOUT,
    headers: { 'User-Agent': UA },
  });
  return String(data)
    .split('<entry>')
    .slice(1)
    .map((entry) => {
      const url = xmlTag(entry, 'id');
      return {
        title: xmlTag(entry, 'title'),
        authors: [...entry.matchAll(/<name>([^<]+)<\/name>/g)].map((m) => m[1].trim()),
        date: xmlTag(entry, 'published').slice(0, 10),
        abstract: xmlTag(entry, 'summary'),
        url,
        pdf: arxivId(url) ? arxivPdf(arxivId(url)) : '',
        source: 'arXiv',
      };
    });
}

async function searchSemanticScholar(q) {
  const { data } = await axios.get('https://api.semanticscholar.org/graph/v1/paper/search', {
    params: { query: q, limit: 8, fields: 'title,authors,publicationDate,year,abstract,url,openAccessPdf,externalIds' },
    headers: process.env.SEMANTIC_SCHOLAR_API_KEY ? { 'x-api-key': process.env.SEMANTIC_SCHOLAR_API_KEY } : {},
    timeout: SEARCH_TIMEOUT,
  });
  return (data.data || []).map((p) => ({
    title: p.title,
    authors: (p.authors || []).map((a) => a.name),
    date: p.publicationDate || String(p.year || ''),
    abstract: p.abstract || '',
    url: p.url,
    pdf: p.openAccessPdf?.url || (p.externalIds?.ArXiv ? arxivPdf(p.externalIds.ArXiv) : ''),
    doi: p.externalIds?.DOI || '',
    source: 'Semantic Scholar',
  }));
}

const OPENALEX_FIELDS =
  'title,publication_date,doi,id,authorships,abstract_inverted_index,primary_location,best_oa_location,open_access,locations';

function mapOpenAlex(w) {
  // OpenAlex ships abstracts as {word: [positions]}; rebuild the text.
  const words = [];
  Object.entries(w.abstract_inverted_index || {}).forEach(([word, positions]) =>
    positions.forEach((pos) => (words[pos] = word))
  );
  const arxivLocation = (w.locations || []).map((l) => arxivId(l.landing_page_url) || arxivId(l.pdf_url)).find(Boolean);
  const pdfs = [
    arxivLocation ? arxivPdf(arxivLocation) : '',
    w.best_oa_location?.pdf_url,
    ...(w.locations || []).map((l) => l.pdf_url),
    w.open_access?.oa_url,
  ].filter((url, i, all) => url && all.indexOf(url) === i);
  return {
    title: w.title,
    authors: (w.authorships || []).map((a) => a.author?.display_name).filter(Boolean),
    date: w.publication_date || '',
    abstract: words.join(' '),
    url: w.primary_location?.landing_page_url || w.doi || w.id,
    pdf: pdfs[0] || '',
    pdfs,
    doi: (w.doi || '').replace('https://doi.org/', ''),
    source: 'OpenAlex',
  };
}

const openAlexParams = (extra) => ({
  select: OPENALEX_FIELDS,
  ...extra,
  ...(process.env.OPENALEX_API_KEY ? { api_key: process.env.OPENALEX_API_KEY } : {}),
});

async function searchOpenAlex(q) {
  const { data } = await axios.get('https://api.openalex.org/works', {
    params: openAlexParams({ search: q, 'per-page': 8 }),
    timeout: SEARCH_TIMEOUT,
  });
  return (data.results || []).map(mapOpenAlex);
}

async function searchIeee(q) {
  const { data } = await axios.get('https://ieeexploreapi.ieee.org/api/v1/search/articles', {
    params: { apikey: process.env.IEEE_API_KEY, format: 'json', max_records: 8, querytext: q },
    timeout: SEARCH_TIMEOUT,
  });
  return (data.articles || []).map((a) => ({
    title: a.title,
    authors: (a.authors?.authors || []).map((x) => x.full_name),
    date: String(a.publication_date || a.publication_year || ''),
    abstract: a.abstract || '',
    url: a.html_url,
    pdf: '',
    doi: a.doi || '',
    source: 'IEEE Xplore',
  }));
}

// ponytail: Google Scholar and JSTOR have no public search API, so they are not queried.
const cache = new Map(); // arXiv asks for <=1 request per 3 s, so repeat queries are cached for 10 min

async function searchPapers(q) {
  const hit = cache.get(q.toLowerCase());
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.body;

  const sources = {
    arXiv: searchArxiv,
    'Semantic Scholar': searchSemanticScholar,
    OpenAlex: searchOpenAlex,
    ...(process.env.IEEE_API_KEY ? { 'IEEE Xplore': searchIeee } : {}),
  };
  const names = Object.keys(sources);
  const results = await Promise.allSettled(names.map((name) => sources[name](q)));

  const status = {};
  const byTitle = new Map();
  results.forEach((result, index) => {
    status[names[index]] = result.status === 'fulfilled' ? 'ok' : 'unavailable';
    if (result.status === 'rejected') {
      console.error(`Paper search failed (${names[index]}):`, result.reason?.message);
      return;
    }
    result.value.forEach((paper) => {
      const key = (paper.title || '').toLowerCase().replace(/\W+/g, '');
      if (!paper.title || !paper.url) return;
      const existing = byTitle.get(key);
      if (!existing) byTitle.set(key, paper);
      else {
        // Same paper from another source: keep the first, but borrow a PDF link / abstract if it lacks one.
        existing.pdf ||= paper.pdf;
        existing.doi ||= paper.doi;
        existing.abstract ||= paper.abstract;
      }
    });
  });

  const body = { papers: [...byTitle.values()], status };
  if (body.papers.length > 0) cache.set(q.toLowerCase(), { at: Date.now(), body });
  return body;
}

// ---- Downloading ----

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith('::ffff:')) return isPrivateIp(v6.slice(7));
  return v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80');
}

async function assertPublicUrl(url) {
  if (!/^https?:$/.test(url.protocol)) throw new Error('Only http(s) links can be downloaded.');
  const addresses = net.isIP(url.hostname)
    ? [{ address: url.hostname }]
    : await dns.lookup(url.hostname, { all: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error('That address is on a private network, so it will not be fetched.');
  }
}

// Publisher CDNs drop connections now and then; a retry or two is the difference between a paper and an error.
async function getWithRetry(url, config, tries = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await axios.get(url, config);
    } catch (error) {
      const transient = ['ECONNABORTED', 'ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ECONNREFUSED'].includes(error.code);
      if (!transient || attempt >= tries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
    }
  }
}

// Redirects are followed by hand so every hop is checked, not just the first URL.
async function safeFetch(url, { maxBytes = 40 * 1024 * 1024 } = {}) {
  let current = url;
  for (let hop = 0; hop < 6; hop++) {
    await assertPublicUrl(new URL(current));
    const response = await getWithRetry(current, {
      responseType: 'arraybuffer',
      maxRedirects: 0,
      validateStatus: () => true,
      timeout: 30000,
      maxContentLength: maxBytes,
      headers: { 'User-Agent': UA, Accept: 'application/pdf,text/html;q=0.9,*/*;q=0.5' },
    });
    if (response.status >= 300 && response.status < 400 && response.headers.location) {
      current = new URL(response.headers.location, current).href;
      continue;
    }
    if (response.status >= 400) throw new Error(`The server answered HTTP ${response.status}.`);
    return { data: Buffer.from(response.data), contentType: String(response.headers['content-type'] || ''), finalUrl: current };
  }
  throw new Error('Too many redirects.');
}

// ---- Resolving a paper reference to something downloadable ----

async function openAlexWork(path_) {
  const { data } = await axios.get(`https://api.openalex.org/works/${path_}`, {
    params: openAlexParams({}),
    timeout: SEARCH_TIMEOUT,
  });
  return mapOpenAlex(data);
}

const normalizeTitle = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Every place this paper might be downloadable from, best first. OpenAlex often lists several copies and the
// first one is frequently dead or paywalled, so the reader tries them in turn.
async function resolveCandidates({ url, doi, arxiv_id: arxivRef, title }) {
  const urls = [];
  const add = (...list) => list.filter(Boolean).forEach((u) => !urls.includes(u) && urls.push(u));
  const meta = { title: title || '', abstract: '', landing: '' };

  const id = String(arxivRef || arxivId(url) || '').replace(/^arxiv:/i, '');
  if (id) {
    add(arxivPdf(id));
    meta.title ||= `arXiv:${id}`;
    meta.landing = `https://arxiv.org/abs/${id}`;
  }

  const doiValue = doi || String(url || '').match(/doi\.org\/(10\.\S+)/i)?.[1];
  if (doiValue) {
    try {
      const work = await openAlexWork(`https://doi.org/${encodeURIComponent(doiValue).replace(/%2F/gi, '/')}`);
      add(...work.pdfs, work.url);
      meta.title = work.title || meta.title;
      meta.abstract = work.abstract;
      meta.landing ||= work.url;
    } catch (error) {
      console.error('DOI lookup failed:', error.message);
    }
  }

  if (url && !id && !doiValue) add(url); // a direct link the user or a search result gave us

  if (title && urls.length < 2) {
    const { data } = await axios.get('https://api.openalex.org/works', {
      params: openAlexParams({ search: title, 'per-page': 5 }),
      timeout: SEARCH_TIMEOUT,
    });
    const works = (data.results || []).map(mapOpenAlex);
    const wanted = normalizeTitle(title);
    // An exact title match first: the top search hit is often a different paper or a duplicate record.
    const ranked = [...works.filter((w) => normalizeTitle(w.title) === wanted), ...works.filter((w) => normalizeTitle(w.title) !== wanted)];
    ranked.slice(0, 3).forEach((w) => add(...w.pdfs));
    if (ranked[0]) {
      meta.title = ranked[0].title || meta.title;
      meta.abstract ||= ranked[0].abstract;
      meta.landing ||= ranked[0].url;
      add(ranked[0].url);
    }
  }

  if (urls.length === 0 && !meta.title) throw new Error('Give a url, doi, arxiv_id or title.');
  return { ...meta, urls };
}

function htmlToText(html) {
  return html
    .replace(/<(script|style|nav|footer|header|noscript)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

const textCache = new Map(); // candidate key -> { title, text, savedAs, sourceUrl }
const CHUNK = 30000;
const MAX_CANDIDATES = 6;

const isPdf = (data, contentType) => /pdf/i.test(contentType) || data.subarray(0, 5).toString() === '%PDF-';

// One candidate link -> the paper's text, or an Error saying why not.
async function fetchReadable(url) {
  let { data, contentType, finalUrl } = await safeFetch(url);

  if (!isPdf(data, contentType)) {
    const html = data.toString('utf8');
    // Publisher and repository landing pages usually point at the PDF in a citation_pdf_url meta tag.
    const metaTag = html.match(/<meta[^>]+name=["']?citation_pdf_url["']?[^>]*content=["']?([^"'\s>]+)/i) ||
      html.match(/<meta[^>]+content=["']?([^"'\s>]+)["']?[^>]*name=["']?citation_pdf_url/i);
    if (metaTag) {
      ({ data, contentType, finalUrl } = await safeFetch(new URL(metaTag[1], finalUrl).href));
    } else {
      const text = htmlToText(html);
      // A long web page might be the full text (PubMed Central, arXiv HTML), but it is usually a landing page full of
      // boilerplate, so it is kept only as a last resort if no PDF turns up.
      const error = new Error('only a web page, no PDF');
      if (text.length >= 8000) error.html = { text, finalUrl };
      throw error;
    }
  }

  if (!isPdf(data, contentType)) throw new Error('not a PDF');
  const text = (await pdfParse(data)).text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (text.length < 500) throw new Error('no extractable text (scanned PDF?)');
  return { text, finalUrl, pdf: data };
}

function savePdf(title, data) {
  const slug = workspace.safeName((title || 'paper').slice(0, 60).replace(/\s+/g, '-'), 'pdf');
  const dir = workspace.ensure('papers');
  const name = slug.endsWith('.pdf') ? slug : `${slug}.pdf`;
  const existing = path.join(dir, name);
  // Same paper downloaded before (a restart clears the in-memory cache): reuse the file, don't pile up copies.
  const file = fs.existsSync(existing) && fs.statSync(existing).size === data.length ? existing : workspace.uniquePath(dir, name);
  if (!fs.existsSync(file)) fs.writeFileSync(file, data);
  return `papers/${path.basename(file)}`;
}

// Downloads (once), saves the PDF into the workspace, extracts the text, and returns one page of it.
async function readPaper(input) {
  const offset = Math.max(0, Number(input.offset) || 0);
  const target = await resolveCandidates(input);
  const key = target.urls.join('|') || target.title;

  let entry = textCache.get(key);
  const tried = [];
  let webPage = null;
  if (!entry) {
    for (const url of target.urls.slice(0, MAX_CANDIDATES)) {
      try {
        const found = await fetchReadable(url);
        // A bare link has no title yet: borrow the first real line of the PDF for the file name.
        const title = target.title || found.text.split('\n').map((l) => l.trim()).find((l) => l.length > 8) || 'paper';
        entry = { title, text: found.text, sourceUrl: found.finalUrl, savedAs: savePdf(title, found.pdf) };
        break;
      } catch (error) {
        tried.push({ url, problem: error.message });
        webPage ||= error.html || null;
      }
    }
    if (!entry && webPage) {
      entry = { title: target.title, text: webPage.text, sourceUrl: webPage.finalUrl, savedAs: '', note: 'Text of a web page, not the PDF: it may include navigation boilerplate.' };
    }
    if (entry) textCache.set(key, entry);
  }

  if (!entry) {
    return {
      title: target.title,
      note: 'Could not get a readable full text from any open-access copy (the paper is probably paywalled, or the links are dead). Do not retry this paper. Use the abstract, or search for a different version.',
      tried,
      abstract: target.abstract,
      landing_page: target.landing,
    };
  }

  const chunk = entry.text.slice(offset, offset + CHUNK);
  return {
    title: entry.title,
    source_url: entry.sourceUrl,
    saved_pdf: entry.savedAs || undefined,
    note: entry.note,
    total_chars: entry.text.length,
    offset,
    next_offset: offset + CHUNK < entry.text.length ? offset + CHUNK : null, // call again with this to keep reading
    text: chunk,
  };
}

module.exports = { searchPapers, readPaper, arxivId };
