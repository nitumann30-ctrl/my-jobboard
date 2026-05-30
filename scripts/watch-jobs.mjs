import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

const companiesPath = path.join(process.cwd(), 'data', 'companies.json')
const outputPath = path.join(process.cwd(), 'data', 'job-feed.json')

const TARGET_KEYWORDS = [
  'people partner',
  'hr business partner',
  'human resources business partner',
  'wellbeing',
  'wellness',
  'people & culture',
  'people and culture',
  'organizational development',
  'organisation development',
  'employee experience',
  'employee engagement',
  'people development',
  'learning',
  'learning & development',
  'learning and development',
  'talent development',
  'talent acquisition',
  'culture',
  'change management',
  'psychological safety',
  'stress',
  'burnout',
  'manager support',
  'manager coaching',
  'leadership development',
  'hr',
  'human resources'
]

const GERMANY_KEYWORDS = [
  'germany',
  'deutschland',
  'berlin',
  'munich',
  'münchen',
  'hamburg',
  'frankfurt',
  'cologne',
  'köln',
  'düsseldorf',
  'stuttgart',
  'nuremberg',
  'nürnberg',
  'bonn',
  'leverkusen',
  'herzogenaurach',
  'wermelskirchen',
  'remote, germany',
  'germany - remote'
]

const BLOCKLIST = ['intern', 'internship', 'working student', 'apprentice', 'ausbildung', 'student', 'retail associate', 'store manager', 'sales associate', 'cashier']

const WATCH_SOURCES = {
  'deutsche-bank': [
    'https://careers.db.com/',
    'https://careers.db.com/students-graduates/graduate-programme/',
    'https://careers.db.com/students-graduates/technology/'
  ],
  'porsche-consulting': [
    'https://www.porsche-consulting.com/en/careers/',
    'https://newsroom.porsche.com/en/company/porsche-consulting/'
  ],
  'obi-group-holding': [
    'https://www.obi.de/karriere/',
    'https://www.linkedin.com/company/obi/jobs'
  ],
  'munich-re': [
    'https://careers.munichre.com/',
    'https://careers.munichre.com/search/'
  ],
  covestro: [
    'https://www.covestro.com/en/careers',
    'https://www.covestro.com/en/company/covestro-worldwide/deutschland'
  ],
  'kpmg-germany': [
    'https://kpmg.com/de/en/home/careers.html',
    'https://kpmg.com/xx/en/what-we-do/services/ai.html'
  ],
  siemens: [
    'https://jobs.siemens.com/careers',
    'https://www.siemens.com/global/en/company/jobs.html'
  ],
  sap: [
    'https://www.sap.com/about/careers.html',
    'https://www.sap.com/germany/topics/innovation-guide/h2'
  ],
  bayer: [
    'https://www.bayer.com/en/career',
    'https://www.bayer.com/en/career/career-areas'
  ],
  henkel: [
    'https://www.henkel.com/careers',
    'https://www.henkel.com/careers/why-henkel'
  ],
  adidas: [
    'https://careers.adidas-group.com/jobs?location=%5B%7B%22country%22:%22Germany%22%7D%5D&offset=0&location_manual=Germany',
    'https://jobs.adidas-group.com/go/Jobs-in-Herzogenaurach/4226801/'
  ]
}

const normalize = (value) => String(value || '').toLowerCase()

const htmlDecode = (value) => value
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&nbsp;/g, ' ')

const stripTags = (value) => htmlDecode(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())

const matchedKeywords = (text) => TARGET_KEYWORDS.filter((keyword) => normalize(text).includes(keyword))
const hasGermanySignal = (text) => GERMANY_KEYWORDS.some((keyword) => normalize(text).includes(keyword))
const isBlocked = (text) => BLOCKLIST.some((keyword) => normalize(text).includes(keyword))

function confidenceScore(title, location, description) {
  const baseText = `${title} ${location} ${description}`
  const matched = matchedKeywords(baseText)
  let score = matched.length * 14
  if (hasGermanySignal(`${location} ${description}`)) score += 20
  if (normalize(title).includes('people partner') || normalize(title).includes('hr business partner')) score += 20
  if (normalize(title).includes('wellbeing') || normalize(title).includes('wellness') || normalize(title).includes('culture')) score += 12
  return Math.min(100, score)
}

function buildId(companyId, url, title) {
  return crypto.createHash('sha1').update(`${companyId}|${url}|${title}`).digest('hex').slice(0, 20)
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function collectJobPostings(node, bucket = []) {
  if (!node) return bucket
  if (Array.isArray(node)) {
    node.forEach((item) => collectJobPostings(item, bucket))
    return bucket
  }
  if (typeof node !== 'object') return bucket
  if (String(node['@type'] || '').toLowerCase() === 'jobposting') bucket.push(node)
  Object.values(node).forEach((value) => collectJobPostings(value, bucket))
  return bucket
}

function locationFromJobPosting(job) {
  const location = job.jobLocation || job.applicantLocationRequirements || ''
  if (Array.isArray(location)) return location.map(locationFromJobPosting).filter(Boolean).join(' | ')
  if (typeof location === 'string') return location
  if (location?.address) {
    const address = location.address
    return [address.addressLocality, address.addressRegion, address.addressCountry].filter(Boolean).join(', ')
  }
  if (location?.name) return location.name
  return ''
}

function extractJsonLdMatches(html, sourceUrl, company) {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  const matches = []

  for (const scriptMatch of html.matchAll(scriptRegex)) {
    const parsed = safeJsonParse(scriptMatch[1])
    if (!parsed) continue
    const jobs = collectJobPostings(parsed)
    jobs.forEach((job) => {
      const title = stripTags(String(job.title || ''))
      const description = stripTags(String(job.description || ''))
      const location = stripTags(locationFromJobPosting(job))
      const url = String(job.url || job.mainEntityOfPage || sourceUrl)
      const confidence = confidenceScore(title, location, description)
      if (!title || confidence < 34 || isBlocked(`${title} ${description}`)) return
      if (!hasGermanySignal(`${location} ${description} ${url}`)) return
      matches.push({
        id: buildId(company.id, url, title),
        companyId: company.id,
        company: company.name,
        title,
        url,
        location,
        postedDate: String(job.datePosted || ''),
        descriptionSnippet: description.slice(0, 320),
        sourceUrl,
        confidence,
        matchedKeywords: matchedKeywords(`${title} ${description}`)
      })
    })
  }

  return matches
}

function extractAnchorMatches(html, sourceUrl, company) {
  const anchorRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  const matches = []

  for (const anchor of html.matchAll(anchorRegex)) {
    const href = anchor[1]
    const label = stripTags(anchor[2])
    if (!label || label.length < 6 || label.length > 180) continue
    if (!/job|career|stellen|position|opening|vacanc/i.test(href) && !/manager|partner|culture|people|hr|wellbeing|talent|learning/i.test(label)) continue
    if (/privacy|cookie|imprint|linkedin|facebook|instagram|youtube|support|help/i.test(href)) continue
    if (isBlocked(label)) continue

    const startIndex = anchor.index || 0
    const context = stripTags(html.slice(Math.max(0, startIndex - 280), Math.min(html.length, startIndex + 420)))
    const confidence = confidenceScore(label, context, context)
    if (confidence < 38) continue
    if (!hasGermanySignal(`${context} ${sourceUrl}`) && !hasGermanySignal(label)) continue

    const resolved = href.startsWith('http') ? href : new URL(href, sourceUrl).toString()
    matches.push({
      id: buildId(company.id, resolved, label),
      companyId: company.id,
      company: company.name,
      title: label,
      url: resolved,
      location: context,
      postedDate: '',
      descriptionSnippet: context.slice(0, 320),
      sourceUrl,
      confidence,
      matchedKeywords: matchedKeywords(`${label} ${context}`)
    })
  }

  return matches
}

function dedupeMatches(items) {
  const map = new Map()
  items.forEach((item) => {
    const current = map.get(item.id)
    if (!current || item.confidence > current.confidence) map.set(item.id, item)
  })
  return Array.from(map.values()).sort((a, b) => b.confidence - a.confidence)
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; NituJobWatcher/1.0; +https://vercel.app)' }
  })
  if (!response.ok) throw new Error(`Fetch failed for ${url}: ${response.status}`)
  return response.text()
}

async function watchCompany(company) {
  const sourceUrls = WATCH_SOURCES[company.id] || [company.careersUrl || company.website].filter(Boolean)
  const checkedAt = new Date().toISOString()
  const all = []
  let blockedCount = 0
  let errorCount = 0

  for (const sourceUrl of sourceUrls) {
    try {
      const html = await fetchHtml(sourceUrl)
      const lowerHtml = normalize(html)
      if (lowerHtml.includes('recaptcha') || lowerHtml.includes('cloudflare') || lowerHtml.includes('checking your browser')) {
        blockedCount += 1
        continue
      }
      all.push(...extractJsonLdMatches(html, sourceUrl, company))
      all.push(...extractAnchorMatches(html, sourceUrl, company))
    } catch {
      errorCount += 1
    }
  }

  const matches = dedupeMatches(all)
  const status = matches.length ? (blockedCount || errorCount ? 'partial' : 'ok') : (blockedCount === sourceUrls.length ? 'blocked' : errorCount === sourceUrls.length ? 'error' : blockedCount || errorCount ? 'partial' : 'no-match')
  const note = matches.length
    ? blockedCount || errorCount
      ? `Found ${matches.length} candidate matches. Some sources were blocked or errored (${blockedCount} blocked / ${errorCount} errored).`
      : `Found ${matches.length} candidate matches.`
    : blockedCount === sourceUrls.length
      ? 'All configured sources were blocked by anti-bot protection.'
      : errorCount === sourceUrls.length
        ? 'All configured sources failed to load.'
        : blockedCount || errorCount
          ? `No relevant matches found. Some sources were blocked or errored (${blockedCount} blocked / ${errorCount} errored).`
          : 'No relevant Germany-focused matches found on the configured sources.'

  return { companyId: company.id, company: company.name, checkedAt, sourceUrls, status, note, matches }
}

async function main() {
  const companies = JSON.parse(await fs.readFile(companiesPath, 'utf8'))
  const results = await Promise.all(companies.map(watchCompany))
  const summary = {
    checkedAt: new Date().toISOString(),
    totalCompanies: companies.length,
    totalMatches: results.reduce((sum, item) => sum + item.matches.length, 0),
    results
  }

  await fs.writeFile(outputPath, JSON.stringify(summary, null, 2), 'utf8')
  console.log(`Checked ${summary.totalCompanies} companies and found ${summary.totalMatches} candidate matches.`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
