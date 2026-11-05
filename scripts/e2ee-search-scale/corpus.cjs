// A seeded chat-like corpus for the E2EE search scale scripts.
//
// The words follow a Zipf distribution (rank r has weight 1 / r^s), like
// real chat text: a few very common words and a long tail of rare words.
// The head is a hand-written list of common English and Portuguese chat
// words. The tail comes from the system word list (/usr/share/dict/words)
// in a seeded order. No real message text is used.
//
// The same seed gives the same corpus, so two runs search the same data.

const { readFileSync } = require('node:fs');

// Mulberry32: a small seeded PRNG. Not for security.
const prng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const HEAD = `the to i you a and is it that of in for on we this be have ok
not with can do so are what just no yes was at but if it's i'm will get
know me my your it all there now like they need thanks time up how about
please one out today here then should check see when think go good sure
did from also can't more work call let's back new still has right meeting
deploy server build test release issue fix team client user review code
update branch error log version data link file send tomorrow week monday
o de que a e do da em um para é com não uma os no se na por mais as dos
como mas foi ao ele das tem à seu sua ou ser quando muito há nos já está
eu também só pelo pela até isso ela entre era depois sem mesmo aos ter
seus quem nas me esse eles estão você tinha foram essa num nem suas meu
às minha têm numa pelos elas havia seja qual será nós tenho lhe deles
essas esses pelas este fosse dele tu te vocês vos lhes meus minhas teu
reunião orçamento amanhã obrigado beleza valeu bom dia tarde noite`
  .split(/\s+/)
  .filter(Boolean);

const loadTail = (count, random) => {
  let words;
  try {
    words = readFileSync('/usr/share/dict/words', 'utf8').split('\n');
  } catch {
    // No word list: make pronounceable fake words.
    const syll =
      'ba be bi bo bu ca ce ci co cu da de di do du fa fe fi fo fu la le li lo lu ma me mi mo mu na ne ni no nu pa pe pi po pu ra re ri ro ru sa se si so su ta te ti to tu va ve vi vo vu'.split(
        ' '
      );
    words = Array.from({ length: count * 2 }, () =>
      Array.from(
        { length: 2 + Math.floor(random() * 3) },
        () => syll[Math.floor(random() * syll.length)]
      ).join('')
    );
  }
  const seen = new Set(HEAD);
  const pool = [
    ...new Set(
      words
        .map((w) => w.trim().toLowerCase())
        .filter((w) => /^[a-z]{3,14}$/.test(w) && !seen.has(w))
    ),
  ];
  // Seeded Fisher-Yates, then take the first `count`.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
};

// Returns { vocab, word(rank), sampleWord(), body(), rawBytes() }.
const createCorpus = ({ seed = 42, vocabSize = 8000, zipfS = 1.0 } = {}) => {
  const random = prng(seed);
  const vocab = [
    ...HEAD,
    ...loadTail(Math.max(0, vocabSize - HEAD.length), random),
  ];
  const cumulative = new Float64Array(vocab.length);
  let total = 0;
  for (let r = 0; r < vocab.length; r++) {
    total += 1 / Math.pow(r + 1, zipfS);
    cumulative[r] = total;
  }
  const sampleWord = () => {
    const x = random() * total;
    let lo = 0;
    let hi = vocab.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    return vocab[lo];
  };
  // Chat messages are short: about 9 words on average, a few long ones.
  const length = () =>
    Math.min(80, 1 + Math.floor(-Math.log(1 - random()) * 8));
  const body = () => {
    const words = [];
    for (let n = length(), i = 0; i < n; i++) {
      words.push(
        random() < 0.02 ? String(Math.floor(random() * 10000)) : sampleWord()
      );
    }
    return words.join(' ');
  };
  return { vocab, random, sampleWord, body };
};

// The queries that the bench times, by class. A word of rank 1 matches most
// messages (the worst case), a word of rank 5000 matches a few.
const queryClasses = (vocab, needle) => ({
  rank1: [vocab[0]],
  top10: vocab.slice(1, 10),
  rank100: vocab.slice(100, 105),
  rank1000: vocab.slice(1000, 1005),
  rank5000: vocab.slice(5000, 5005),
  twoWords: [
    `${vocab[2]} ${vocab[500]}`,
    `${vocab[5]} ${vocab[1500]}`,
    `${vocab[20]} ${vocab[60]}`,
  ],
  oneChar: ['a', 'e', 's'],
  twoChar: ['re', 'co', 'de'],
  threeCharPrefix: ['con', 'pro', 'tra'],
  needle: [needle],
});

module.exports = { createCorpus, queryClasses, prng };
