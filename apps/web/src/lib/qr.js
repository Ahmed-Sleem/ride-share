/* ══════════════════════════════════════════════════════════════════════════
   QR — a real encoder, because a code that cannot scan is a lie on a screen.

   The landing's install card and any future "point your camera here" surface
   need a matrix that a phone will actually decode. Everything else in this app
   that LOOKS like a QR is the boarding-code pattern in lib/components.js, which
   is a visual aid for a human at a desk (the scannable value there is the text
   code); it is deliberately not reused here and nothing here is a stand-in for
   it. The payload is always byte mode, because a URL is bytes and the numeric /
   alphanumeric modes would only add failure modes.

   Standard: ISO/IEC 18004. Byte mode, EC levels L/M/Q/H, versions 1–12
   (v12 holds 1 KB, which is far beyond any link this product prints; going
   further would buy nothing but slower masks). The block table and the
   alignment centres below are the standard's tables, mechanically extracted
   rather than retyped, and tests/unit.test.js checks the result by decoding the
   matrix back to the original string AND by comparing the matrix against an
   independent reference implementation's output for the same payload.

   No DOM, no copy, no colours: it returns a boolean matrix. Painting is the
   caller's job (components.js: InstallQR).
   ══════════════════════════════════════════════════════════════════════════ */
const QR = (function () {
  /* [version][level] → (count, totalCodewords, dataCodewords) and, when the
     spec splits that version into two block groups, a second triple. */
  const BLOCKS = [
    /* v1  */ [[1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9]],
    /* v2  */ [[1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16]],
    /* v3  */ [[1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13]],
    /* v4  */ [[1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9]],
    /* v5  */ [[1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12]],
    /* v6  */ [[2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15]],
    /* v7  */ [[2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14]],
    /* v8  */ [[2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15]],
    /* v9  */ [[2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13]],
    /* v10 */ [[2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16]],
    /* v11 */ [[4, 101, 81], [1, 80, 50, 4, 81, 51], [4, 50, 22, 4, 51, 23], [3, 36, 12, 8, 37, 13]],
    /* v12 */ [[2, 116, 92, 2, 117, 93], [6, 58, 36, 2, 59, 37], [4, 46, 20, 6, 47, 21], [7, 42, 14, 4, 43, 15]],
  ];
  /* Alignment-pattern centres; v1 has none, and the corners are already finders. */
  const ALIGN = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38],
    [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58]];
  const LEVEL_INDEX = { L: 0, M: 1, Q: 2, H: 3 };
  const LEVEL_BITS = { L: 1, M: 0, Q: 3, H: 2 };     // as written into the format info
  const MODE_BYTE = 4;

  /* GF(256) with the standard's primitive polynomial 0x11D. */
  const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function build() {
    let x = 1;
    for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11D; }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();
  const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

  /* Generator polynomial of degree `n`: ∏ (x − α^i). Built here rather than
     carried as a table — 25 lines of math instead of 25 rows of numbers that
     can be mistyped, and it is checked by the round-trip test. */
  function genPoly(n) {
    let poly = [1];
    for (let i = 0; i < n; i++) {
      const next = new Array(poly.length + 1).fill(0);
      for (let k = 0; k < poly.length; k++) {
        next[k] ^= mul(poly[k], EXP[i]);          // coefficient × α^i
        next[k + 1] ^= poly[k];
      }
      poly = next;
    }
    /* The loop accumulates in ascending powers, so flip it: the division below
       (and the standard's own tables) index the generator polynomial from its
       leading 1 down to the constant term. */
    return poly.reverse();

  }
  const ecCache = {};
  function ecOf(data, n) {
    const g = ecCache[n] || (ecCache[n] = genPoly(n));
    const res = new Uint8Array(data.length + n);
    res.set(data, 0);
    for (let i = 0; i < data.length; i++) {
      const factor = res[i];
      if (!factor) continue;
      for (let k = 1; k < g.length; k++) res[i + k] ^= mul(g[k], factor);
    }
    return res.subarray(data.length);             // n error-correction codewords
  }

  const utf8 = (s) => {
    const out = [];
    for (const ch of String(s)) {
      const cp = ch.codePointAt(0);
      if (cp < 0x80) out.push(cp);
      else if (cp < 0x800) out.push(0xC0 | (cp >> 6), 0x80 | (cp & 63));
      else if (cp < 0x10000) out.push(0xE0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
      else out.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    }
    return out;
  };
  function dataCapacity(version, li) {
    const spec = BLOCKS[version - 1][li];
    let n = 0;
    for (let g = 0; g < spec.length; g += 3) n += spec[g] * spec[g + 2];
    return n;
  }

  /* Bitstream: 0100 + length + payload + terminator, then the standard's
     alternating pad bytes 0xEC / 0x11. */
  function toCodewords(bytes, version, li) {
    const capBytes = dataCapacity(version, li);
    const bits = [];
    const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1); };
    put(MODE_BYTE, 4);
    put(bytes.length, version < 10 ? 8 : 16);
    for (const b of bytes) put(b, 8);
    const room = capBytes * 8;
    for (let i = 0; i < 4 && bits.length < room; i++) bits.push(0);
    while (bits.length % 8) bits.push(0);
    const cw = [];
    for (let i = 0; i < bits.length; i += 8) {
      cw.push(bits[i] << 7 | bits[i + 1] << 6 | bits[i + 2] << 5 | bits[i + 3] << 4 |
        bits[i + 4] << 3 | bits[i + 5] << 2 | bits[i + 6] << 1 | bits[i + 7]);
    }
    for (let p = 0; cw.length < capBytes; p++) cw.push(p % 2 ? 0x11 : 0xEC);
    return cw;
  }

  function splitBlocks(cw, version, li) {
    const spec = BLOCKS[version - 1][li];
    const groups = spec.length > 3 ? [spec.slice(0, 3), spec.slice(3)] : [spec];
    const data = [], ecc = [];
    let at = 0;
    for (const [count, total, dcw] of groups) {
      for (let i = 0; i < count; i++) {
        const slice = cw.slice(at, at + dcw);
        at += dcw;
        data.push(slice);
        ecc.push(Array.from(ecOf(Uint8Array.from(slice), total - dcw)));
      }
    }
    const out = [];
    const maxD = Math.max.apply(null, data.map((d) => d.length));
    for (let i = 0; i < maxD; i++) for (const d of data) if (i < d.length) out.push(d[i]);
    const maxE = Math.max.apply(null, ecc.map((e) => e.length));
    for (let i = 0; i < maxE; i++) for (const e of ecc) if (i < e.length) out.push(e[i]);
    return out;
  }

  /* ── the matrix ─────────────────────────────────────────────────────────── */
  function blank(size) {
    const mod = new Int8Array(size * size);        // -1 = reserved, 0/1 = light/dark
    const res = new Uint8Array(size * size);       // 1 = written by a function pattern
    return { size, mod, res, at: (r, c) => r * size + c };
  }
  function putFinder(m, r0, c0) {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      const rr = r0 + r, cc = c0 + c;
      if (rr < 0 || cc < 0 || rr >= m.size || cc >= m.size) continue;
      const dark = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
        (c >= 0 && c <= 6 && (r === 0 || r === 6)) || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
      m.mod[m.at(rr, cc)] = dark ? 1 : 0; m.res[m.at(rr, cc)] = 1;
    }
  }
  function reserve(m, r, c, v) {
    if (r < 0 || c < 0 || r >= m.size || c >= m.size) return;
    m.mod[m.at(r, c)] = v == null ? 0 : v; m.res[m.at(r, c)] = 1;
  }
  function functionPatterns(m, version) {
    const s = m.size;
    putFinder(m, 0, 0); putFinder(m, 0, s - 7); putFinder(m, s - 7, 0);
    for (let i = 8; i < s - 8; i++) { reserve(m, 6, i, i % 2 === 0 ? 1 : 0); reserve(m, i, 6, i % 2 === 0 ? 1 : 0); }
    for (const c of ALIGN[version - 1]) for (const r of ALIGN[version - 1]) {
      if ((r === 6 && c === 6) || (r === 6 && c === s - 7) || (r === s - 7 && c === 6)) continue;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
        reserve(m, r + dr, c + dc, (Math.max(Math.abs(dr), Math.abs(dc)) !== 1) ? 1 : 0);
      }
    }
    /* Reserve exactly the modules the format information will occupy and nothing
       more: reserving one data cell here shifts every later bit by one module,
       which looks fine and scans as garbage. Row 6 and column 6 are the timing
       patterns, so they are already taken. The always-dark module goes last,
       because it sits right where copy A of the format info stops. */
    for (let i = 0; i <= 8; i++) {
      if (i !== 6) { reserve(m, i, 8); reserve(m, 8, i); }
    }
    for (let i = 0; i < 8; i++) reserve(m, 8, s - 1 - i);
    for (let i = 0; i < 7; i++) reserve(m, s - 1 - i, 8);
    reserve(m, s - 8, 8, 1);
    if (version >= 7) {                             // version info blocks
      for (let i = 0; i < 18; i++) {
        const b = Math.floor(i / 3), c = (i % 3) + s - 11;
        reserve(m, b, c); reserve(m, c, b);
      }
    }
  }
  function placeData(m, codewords) {
    const bits = [];
    for (const cw of codewords) for (let i = 7; i >= 0; i--) bits.push((cw >> i) & 1);
    let k = 0;
    for (let right = m.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < m.size; vert++) {
        for (let j = 0; j < 2; j++) {
          const c = right - j;
          const up = ((right + 1) & 2) === 0;
          const r = up ? m.size - 1 - vert : vert;
          if (m.res[m.at(r, c)]) continue;
          m.mod[m.at(r, c)] = k < bits.length ? bits[k] : 0;
          k++;
        }
      }
    }
  }
  const MASKS = [
    (r, c) => (r + c) % 2 === 0,
    (r) => r % 2 === 0,
    (_r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ];
  function applyMask(m, idx) {
    const f = MASKS[idx];
    for (let r = 0; r < m.size; r++) for (let c = 0; c < m.size; c++) {
      if (m.res[m.at(r, c)]) continue;
      if (f(r, c)) m.mod[m.at(r, c)] ^= 1;
    }
  }
  /* The mask that survives is the one with the least "structure": the four
     penalty rules of the standard (N1 = 3 + 1 per module beyond a run of five,
     N2 = 3 per 2×2 block, N3 = 40 per finder-like ratio with four light modules
     beside it, N4 = 10 per 5% the dark ratio is off 50%). Row and column runs are
     each counted, the dark total only once — a doubled dark count pushes rule 4
     to its maximum on every mask and quietly makes the choice meaningless. */
  function penalty(m) {
    const s = m.size;
    let score = 0, dark = 0;
    const get = (r, c) => m.mod[m.at(r, c)];
    const runsIn = (line) => {
      let run = 1;
      for (let i = 1; i <= s; i++) {
        if (i < s && line[i] === line[i - 1]) run++;
        else { if (run >= 5) score += 3 + (run - 5); run = 1; }
      }
    };
    const PAT = [1, 0, 1, 1, 1, 0, 1];
    const isPat = (line, i) => PAT.every((v, j) => line[i + j] === v);
    const isLight = (line, i, n) => { for (let j = 0; j < n; j++) if (line[i + j] !== 0) return false; return true; };
    const finderLike = (line) => {
      for (let i = 0; i + 11 <= s; i++) {
        if ((isPat(line, i) && isLight(line, i + 7, 4)) || (isLight(line, i, 4) && isPat(line, i + 4))) score += 40;
      }
    };
    const row = new Uint8Array(s), col = new Uint8Array(s);
    for (let r = 0; r < s; r++) {
      for (let c = 0; c < s; c++) { row[c] = get(r, c); col[c] = get(c, r); if (row[c]) dark++; }
      runsIn(row);
      finderLike(row);
    }
    for (let c = 0; c < s; c++) { runsIn(col); finderLike(col); }
    for (let r = 0; r < s - 1; r++) for (let c = 0; c < s - 1; c++) {
      const v = get(r, c);
      if (v === get(r, c + 1) && v === get(r + 1, c) && v === get(r + 1, c + 1)) score += 3;
    }
    const total = s * s;
    score += Math.floor(Math.abs(dark * 20 - total * 10) / total - 10) * 10;
    return score;
  }
  const bitLength = (n) => (n === 0 ? 0 : 32 - Math.clz32(n));
  /* Polynomial long division in GF(2), which is what the standard's BCH check
     bits are. One function serves both fields because it reduces by the
     generator's own degree: 0x537 (15 bits) for the format info, 0x1F25 (18)
     for the version info. */
  function bchRemainder(value, poly) {
    const deg = bitLength(poly) - 1;
    let v = value << deg;
    for (let i = bitLength(v) - bitLength(poly); i >= 0; i--) {
      if (v & (1 << (i + deg))) v ^= poly << i;
    }
    return v;
  }
  /* The format info is 15 bits — 2 for the EC level, 3 for the mask, 10 check
     bits — then XORed with 0x5412 so that an all-light code can never read as a
     valid format. */
  function formatBits(level, mask) {
    const data = (LEVEL_BITS[level] << 3) | mask;
    return ((data << 10) | bchRemainder(data, 0x537)) ^ 0x5412;
  }
  function versionBits(version) {
    return (version << 12) | bchRemainder(version, 0x1F25);
  }

  function drawFormat(m, level, mask) {
    const bits = formatBits(level, mask);
    const s = m.size;
    for (let i = 0; i < 15; i++) {
      const bit = (bits >> i) & 1;
      /* Bit i runs LSB-first. Copy A hugs the top-left finder down column 8 —
         skipping row 6, which is the timing line — and copy B runs along row 8
         from the right edge inwards. Row 6 / column 6 are the timing patterns and
         column 8 row (size−8) is the always-dark module, drawn separately. */
      const rowA = i < 6 ? i : i < 8 ? i + 1 : s - 15 + i;
      m.mod[m.at(rowA, 8)] = bit;
      const colB = i < 8 ? s - 1 - i : i === 8 ? 7 : 14 - i;
      m.mod[m.at(8, colB)] = bit;
    }
  }
  function drawVersion(m, version) {
    if (version < 7) return;
    const bits = versionBits(version);
    const s = m.size;
    for (let i = 0; i < 18; i++) {
      const bit = (bits >> i) & 1;
      const r = Math.floor(i / 3), c = s - 11 + (i % 3);
      m.mod[m.at(r, c)] = bit;
      m.mod[m.at(c, r)] = bit;
    }
  }

  /* `opts.mask` pins the mask instead of choosing the best one. Production code
     never passes it; it exists so a test can compare this encoder against a
     reference implementation module for module, which is the only way to tell a
     wrong matrix apart from a merely different mask choice. */
  function encode(text, level, opts) {
    const o = opts || {};
    const lv = LEVEL_INDEX[level || "M"];
    const bytes = utf8(text);
    let version = 0;
    for (let v = 1; v <= BLOCKS.length; v++) {
      const need = bytes.length * 8 + 4 + (v < 10 ? 8 : 16);
      if (need <= dataCapacity(v, lv) * 8) { version = v; break; }
    }
    if (!version) throw new Error("QR: payload does not fit in version " + BLOCKS.length);
    const m = blank(version * 4 + 17);
    functionPatterns(m, version);
    placeData(m, splitBlocks(toCodewords(bytes, version, lv), version, lv));
    drawVersion(m, version);
    let best = null, bestScore = Infinity;
    const MASKS_TO_TRY = o.mask == null ? [0, 1, 2, 3, 4, 5, 6, 7] : [o.mask];
    for (const mask of MASKS_TO_TRY) {
      const trial = { size: m.size, mod: Uint8Array.from(m.mod), res: m.res, at: m.at };
      applyMask(trial, mask);
      drawFormat(trial, level || "M", mask);
      const score = penalty(trial);
      if (score < bestScore) { bestScore = score; best = { mask, mod: trial.mod }; }
    }
    const size = m.size;
    const grid = [];
    for (let r = 0; r < size; r++) {
      const row = new Uint8Array(size);
      for (let c = 0; c < size; c++) row[c] = best.mod[r * size + c] ? 1 : 0;
      grid.push(row);
    }
    return { size, version, level: level || "M", mask: best.mask, grid };
  }

  return { encode, dataCapacity, genPoly, MASKS };
})();
