import { createHash } from 'crypto'
import type { CompanyWatch, JobRole } from '@/lib/types'

export type WatchMatch = {
  id: string
  companyId: string
  company: string
  title: string
  url: string
  location: string
  postedDate: string
  descriptionSnippet: string
  sourceUrl: string
  confidence: number
  matchedKeywords: string[]
}

export type CompanyWatchResult = {
  companyId: string
  company: string
  checkedAt: string
  sourceUrls: string[]
  status: 'ok' | 'partial' | 'no-match' | 'blocked' | 'error'
  note: string
  matches: WatchMatch[]
}

const TARGET_KEYWORDS = [
  'people partner',
  'hr business partner',
  'human resources business partner',
  'wellbeing',
  'well-being',
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

const BLOCKLIST = [
  'intern',
  'internship',
  'working student',
  'apprentice',
  'ausbildung',
  'student',
  'retail associate',
  'store manager',
  'sales associate',
  'cashier'
]

const WATCH_SOURCES: Record<string, string[]> = {
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

function normalize(value: string) {
  return String(value || '').toLowerCase()
}

function htmlDecode(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

function stripTags(value: string) {
  return htmlDecode(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
}

function matchedKeywords(text: string) {
  const haystack = normalize(text)
  return TARGET_KEYWORDS.filter(keyword => haystack.includes(keyword))
}

function hasGermanySignal(text: string) {
  const haystack = normalize(text)
  return GERMANY_KEYWORDS.some(keyword => haystack.includes(keyword))
}

function isBlocked(text: string) {
  const haystack = normalize(text)
  return BLOCKLIST.some(keyword => haystack.includes(keyword))
}

function confidenceScore(title: string, location: string, description: string) {
  const baseText = `${title} ${location} ${description}`
  const matched = matchedKeywords(baseText)
  let score = matched.length * 14
  if (hasGermanySignal(`${location} ${description}`)) score += 20
  if (normalize(title).includes('people partner') || normalize(title).includes('hr business partner')) score += 20
  if (normalize(title).includes('wellbeing') || normalize(title).includes('wellness') || normalize(title).includes('culture')) score += 12
  return Math.min(100, score)
}

function buildId(companyId: string, url: string, title: string) {
  const raw = `${companyId}|${url}|${title}`
  return createHash('sha1').update(raw).digest('hex').slice(0, 20)
}

function safeJsonParse<T = any>(value: string): T | null {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function collectJobPostings(node: any, bucket: any[] = []): any[] {
  if (!node) return bucket
  if (Array.isArray(node)) {
    node.forEach(item => collectJobPostings(item, bucket))
    return bucket
  }
  if (typeof node !== 'object') return bucket
  if (String(node['@type'] || '').toLowerCase() === 'jobposting') {
    bucket.push(node)
  }
  Object.values(node).forEach(value => collectJobPostings(value, bucket))
  return bucket
}

function locationFromJobPosting(job: any) {
  const location = job.jobLocation || job.applicantLocationRequirements || ''
  if (Array.isArray(location)) {
    return location.map(locationFromJobPosting).filter(Boolean).join(' | ')
  }
  if (typeof location === 'string') return location
  if (location?.address) {
    const address = location.address
    return [address.addressLocality, address.addressRegion, address.addressCountry].filter(Boolean).join(', ')
  }
  if (location?.name) return location.name
  return ''
}

function extractJsonLdMatches(html: string, sourceUrl: string, company: CompanyWatch): WatchMatch[] {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  const matches: WatchMatch[] = []

  for (const scriptMatch of html.matchAll(scriptRegex)) {
    const parsed = safeJsonParse(scriptMatch[1])
    if (!parsed) continue
    const jobs = collectJobPostings(parsed)
    jobs.forEach(job => {
      const title = stripTags(String(job.title || ''))
      const description = stripTags(String(job.description || ''))
      const location = stripTags(locationFromJobPosting(job))
      const url = String(job.url || job.mainEntityOfPage || sourceUrl)
      const confidence = confidenceScore(title, location, description)
      const keywords = matchedKeywords(`${title} ${description}`)
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
        matchedKeywords: keywords
      })
    })
  }

  return matches
}

function extractAnchorMatches(html: string, sourceUrl: string, company: CompanyWatch): WatchMatch[] {
  const anchorRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  const matches: WatchMatch[] = []

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

function dedupeMatches(items: WatchMatch[]) {
  const byId = new Map<string, WatchMatch>()
  items.forEach(item => {
    const current = byId.get(item.id)
    if (!current || item.confidence > current.confidence) byId.set(item.id, item)
  })
  return Array.from(byId.values()).sort((a, b) => b.confidence - a.confidence)
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; NituJobWatcher/1.0; +https://vercel.app)'
    },
    next: { revalidate: 0 }
  })

  if (!response.ok) {
    throw new Error(`Fetch failed for ${url}: ${response.status}`)
  }

  return response.text()
}

export async function watchCompany(company: CompanyWatch): Promise<CompanyWatchResult> {
  const sourceUrls = WATCH_SOURCES[company.id] || [company.careersUrl || company.website].filter(Boolean)
  const checkedAt = new Date().toISOString()
  const results: WatchMatch[] = []
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
      results.push(...extractJsonLdMatches(html, sourceUrl, company))
      results.push(...extractAnchorMatches(html, sourceUrl, company))
    } catch {
      errorCount += 1
    }
  }

  const matches = dedupeMatches(results)

  if (matches.length) {
    return {
      companyId: company.id,
      company: company.name,
      checkedAt,
      sourceUrls,
      status: blockedCount || errorCount ? 'partial' : 'ok',
      note: blockedCount || errorCount
        ? `Found ${matches.length} candidate matches. Some sources were blocked or errored (${blockedCount} blocked / ${errorCount} errored).`
        : `Found ${matches.length} candidate matches.`,
      matches
    }
  }

  if (blockedCount === sourceUrls.length) {
    return {
      companyId: company.id,
      company: company.name,
      checkedAt,
      sourceUrls,
      status: 'blocked',
      note: 'All configured sources were blocked by anti-bot protection.',
      matches: []
    }
  }

  if (errorCount === sourceUrls.length) {
    return {
      companyId: company.id,
      company: company.name,
      checkedAt,
      sourceUrls,
      status: 'error',
      note: 'All configured sources failed to load.',
      matches: []
    }
  }

  return {
    companyId: company.id,
    company: company.name,
    checkedAt,
    sourceUrls,
    status: blockedCount || errorCount ? 'partial' : 'no-match',
    note: blockedCount || errorCount
      ? `No relevant matches found. Some sources were blocked or errored (${blockedCount} blocked / ${errorCount} errored).`
      : 'No relevant Germany-focused matches found on the configured sources.',
    matches: []
  }
}

export async function watchCompanies(companies: CompanyWatch[]) {
  const settled = await Promise.all(companies.map(company => watchCompany(company)))
  return settled
}

export function matchToRole(match: WatchMatch): JobRole {
  return {
    id: match.id,
    company: match.company,
    title: match.title,
    location: match.location || 'Germany',
    workArrangement: 'Check listing',
    salaryMin: '',
    salaryMax: '',
    source: 'Automated watcher',
    jobUrl: match.url,
    industry: '',
    companyStage: '',
    experienceRequired: '',
    visaSponsorship: 'Unknown',
    postedDate: match.postedDate || '',
    status: 'To Apply',
    jdText: match.descriptionSnippet
  }
}
