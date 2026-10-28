// Transcript moderation words. The admin still makes the final call.
// high: vulgar, sexual, slurs, threats -> flag the cheer red.
// medium: insults and harsh words -> flag orange.
// low: mild, often friendly ("anjir keren!") -> highlight only, no flag.
export const LEVELS = ['high', 'medium', 'low']

export const DEFAULT_WORD_LEVELS = {
  high: [
    // id
    'kontol', 'kntl', 'memek', 'mmk', 'ngentot', 'ngentod', 'entot', 'ngewe', 'ewe', 'jembut',
    'pepek', 'peler', 'titit', 'toket', 'tetek', 'itil', 'pentil', 'ngaceng', 'coli', 'colmek',
    'sange', 'bokep', 'lonte', 'pelacur', 'perek', 'jablay', 'sundal', 'kimak', 'pukimak', 'puki',
    'cibai', 'pantek', 'kanjut', 'telaso', 'jancuk', 'jancok', 'diancuk', 'dancok', 'ancuk', 'cuk',
    'jnck', 'bencong', 'banci', 'maho', 'homo', 'kafir', 'mati lu', 'mampus lu', 'bunuh diri',
    // en
    'fuck', 'fucking', 'fucker', 'fucked', 'motherfucker', 'mf', 'mofo', 'fck', 'fuk', 'phuck',
    'cunt', 'twat', 'cock', 'cocksucker', 'dick', 'dickhead', 'pussy', 'whore', 'slut', 'skank',
    'thot', 'hoe', 'tits', 'porn', 'horny', 'cum', 'blowjob', 'handjob', 'dildo', 'jerk off',
    'nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded', 'tranny', 'dyke', 'chink', 'spic',
    'kys', 'kill yourself', 'go die',
  ],
  medium: [
    // id
    'anjing', 'anjg', 'anj', 'ajg', 'njing', 'asu', 'asw', 'bangsat', 'bgst', 'bajingan',
    'keparat', 'brengsek', 'babi', 'babik', 'monyet', 'kunyuk', 'celeng', 'kampret', 'tai', 'taik',
    'tahi', 'bangke', 'bangkai', 'setan', 'iblis', 'bedebah', 'goblok', 'goblog', 'gblk', 'tolol',
    'tll', 'bego', 'idiot', 'dungu', 'geblek', 'sinting', 'sarap', 'autis', 'cacat', 'budek',
    'bacot', 'bacod', 'cocot', 'matamu', 'ndasmu', 'raimu', 'modar', 'mampus', 'gathel', 'kurang ajar',
    'otak udang', 'kampungan',
    // en
    'shit', 'sh1t', 'bullshit', 'shitty', 'shithead', 'dipshit', 'bitch', 'b1tch', 'biatch', 'bish',
    'son of a bitch', 'bastard', 'asshole', 'arsehole', 'ass', 'a$$', 'dumbass', 'jackass', 'prick', 'wanker',
    'bollocks', 'piss off', 'douche', 'douchebag', 'scumbag', 'stfu', 'gtfo', 'wtf', 'screw you', 'moron',
    'stupid',
  ],
  low: [
    // id
    'anjir', 'anjay', 'anjrit', 'njir', 'buset', 'sialan', 'sial', 'gila', 'edan', 'jangkrik',
    'norak', 'bodoh', 'ndeso', 'udik', 'alay',
    // en
    'damn', 'goddamn', 'hell', 'crap', 'bloody', 'bugger', 'pissed', 'sucks', 'loser', 'dumb',
    'shut up', 'fml', 'omfg', 'freaking', 'frick',
  ],
}

const RANK = { high: 3, medium: 2, low: 1 }

// Lowercase and leetspeak to letters: 4/@ a, 1/! i, 0 o, 3 e, 5/$ s, 7 t. Other symbols drop out.
const base = s =>
  String(s)
    .toLowerCase()
    .replace(/[4@]/g, 'a')
    .replace(/[1!|]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/0/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/7/g, 't')
    .replace(/[^a-z]/g, '')

const collapse = s => s.replace(/(.)\1+/g, '$1')

// Whole-word match. A stretched word ("anjiiiing") matches its entry, but a shorter word never
// matches a longer one: "as" is not "ass", "hel" is not "hell".
function sameWord(token, word) {
  if (!token || !word) return false
  if (token === word) return true
  return token.length > word.length && collapse(token) === collapse(word)
}

// Builds the matcher for a { high, medium, low } list. Entries with spaces match as phrases.
function compile(levels) {
  const entries = []
  for (const level of LEVELS) {
    for (const raw of levels?.[level] ?? []) {
      const words = String(raw).trim().split(/\s+/).map(base).filter(Boolean)
      if (words.length) entries.push({ raw: String(raw).trim(), words, level })
    }
  }
  return entries
}

const cache = new WeakMap()

// Splits text into tokens and marks the moderation words. Returns
// { tokens: [{ t, level }], hits: [{ word, level }], level } where level is the worst one found
// (null when clean). Punctuation splits words, except ! inside a word ("sh!t").
export function scanWords(text, levels) {
  if (!cache.has(levels)) cache.set(levels, compile(levels))
  const entries = cache.get(levels)
  const src = String(text || '')
  const parts = src.split(/(\s+|[.,?;:"“”()]+|!+(?=\s|$|[.,?;:"“”()]))/).filter(p => p)
  const tokens = parts.map(t => ({ t, level: null }))
  const wordAt = []
  tokens.forEach((tok, i) => {
    const b = base(tok.t)
    if (b && /[\p{L}\p{N}@$]/u.test(tok.t)) wordAt.push({ i, b })
  })

  const hits = new Map()
  const mark = (from, to, level) => {
    for (let k = from; k <= to; k += 1) {
      const cur = tokens[k].level
      if (!cur || RANK[level] > RANK[cur]) tokens[k].level = level
    }
  }
  for (const entry of entries) {
    const n = entry.words.length
    for (let s = 0; s + n <= wordAt.length; s += 1) {
      let ok = true
      for (let k = 0; k < n && ok; k += 1) ok = sameWord(wordAt[s + k].b, entry.words[k])
      if (!ok) continue
      const from = wordAt[s].i
      const to = wordAt[s + n - 1].i
      mark(from, to, entry.level)
      // One hit per place in the text, even when several entries match it ("sh!t" is shit and sh1t).
      const key = `${from}-${to}`
      const prev = hits.get(key)
      if (!prev || RANK[entry.level] > RANK[prev.level]) hits.set(key, { word: entry.raw, level: entry.level })
    }
  }

  // Neighbouring tokens with the same level render as one highlight ("mati lu", not "mati" + "lu").
  const merged = []
  for (const tok of tokens) {
    const last = merged[merged.length - 1]
    if (last && last.level === tok.level) last.t += tok.t
    else merged.push({ ...tok })
  }

  let level = null
  for (const hit of hits.values()) if (!level || RANK[hit.level] > RANK[level]) level = hit.level
  return { tokens: merged, hits: [...hits.values()], level }
}

// High and medium words stop auto-approve; low words are only highlighted.
export const needsReview = scan => scan.level === 'high' || scan.level === 'medium'
