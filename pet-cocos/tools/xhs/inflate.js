/* Raw DEFLATE decoder (RFC 1951) for the Xiaohongshu mini-tool packs: the container counts the unpacked size of the zip,
 * so json packs are stored deflated and expanded here. Plain ES5, no eval / WebAssembly. Based on the tiny-inflate design.
 * window.__xhsInflate(Uint8Array compressed, number outLength) -> Uint8Array */
(function (w) {
  'use strict';
  function Tree() { this.table = new Uint16Array(16); this.trans = new Uint16Array(288); }
  function Data(src, dest) { this.s = src; this.i = 0; this.tag = 0; this.bitcount = 0; this.d = dest; this.o = 0; this.lt = new Tree(); this.dt = new Tree(); }
  var sltree = new Tree(), sdtree = new Tree();
  var lengthBits = new Uint8Array(30), lengthBase = new Uint16Array(30), distBits = new Uint8Array(30), distBase = new Uint16Array(30);
  var clcidx = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
  var codeTree = new Tree(), lengths = new Uint8Array(288 + 32), offs = new Uint16Array(16);

  function buildBitsBase(bits, base, delta, first) {
    var i, sum;
    for (i = 0; i < delta; ++i) bits[i] = 0;
    for (i = 0; i < 30 - delta; ++i) bits[i + delta] = (i / delta) | 0;
    for (sum = first, i = 0; i < 30; ++i) { base[i] = sum; sum += 1 << bits[i]; }
  }
  function buildFixedTrees(lt, dt) {
    var i;
    for (i = 0; i < 7; ++i) lt.table[i] = 0;
    lt.table[7] = 24; lt.table[8] = 152; lt.table[9] = 112;
    for (i = 0; i < 24; ++i) lt.trans[i] = 256 + i;
    for (i = 0; i < 144; ++i) lt.trans[24 + i] = i;
    for (i = 0; i < 8; ++i) lt.trans[24 + 144 + i] = 280 + i;
    for (i = 0; i < 112; ++i) lt.trans[24 + 144 + 8 + i] = 144 + i;
    for (i = 0; i < 5; ++i) dt.table[i] = 0;
    dt.table[5] = 32;
    for (i = 0; i < 32; ++i) dt.trans[i] = i;
  }
  function buildTree(t, lens, off, num) {
    var i, sum;
    for (i = 0; i < 16; ++i) t.table[i] = 0;
    for (i = 0; i < num; ++i) t.table[lens[off + i]]++;
    t.table[0] = 0;
    for (sum = 0, i = 0; i < 16; ++i) { offs[i] = sum; sum += t.table[i]; }
    for (i = 0; i < num; ++i) if (lens[off + i]) t.trans[offs[lens[off + i]]++] = i;
  }
  function getbit(d) {
    if (!d.bitcount--) { d.tag = d.s[d.i++]; d.bitcount = 7; }
    var bit = d.tag & 1; d.tag >>>= 1; return bit;
  }
  function readBits(d, num, base) {
    if (!num) return base;
    while (d.bitcount < 24) { d.tag |= d.s[d.i++] << d.bitcount; d.bitcount += 8; }
    var val = d.tag & (0xffff >>> (16 - num));
    d.tag >>>= num; d.bitcount -= num;
    return val + base;
  }
  function decodeSymbol(d, t) {
    while (d.bitcount < 24) { d.tag |= d.s[d.i++] << d.bitcount; d.bitcount += 8; }
    var sum = 0, cur = 0, len = 0, tag = d.tag;
    do { cur = 2 * cur + (tag & 1); tag >>>= 1; ++len; sum += t.table[len]; cur -= t.table[len]; } while (cur >= 0);
    d.tag = tag; d.bitcount -= len;
    return t.trans[sum + cur];
  }
  function decodeTrees(d, lt, dt) {
    var hlit, hdist, hclen, i, num, length;
    hlit = readBits(d, 5, 257); hdist = readBits(d, 5, 1); hclen = readBits(d, 4, 4);
    for (i = 0; i < 19; ++i) lengths[i] = 0;
    for (i = 0; i < hclen; ++i) lengths[clcidx[i]] = readBits(d, 3, 0);
    buildTree(codeTree, lengths, 0, 19);
    for (num = 0; num < hlit + hdist;) {
      var sym = decodeSymbol(d, codeTree);
      switch (sym) {
        case 16: var prev = lengths[num - 1]; for (length = readBits(d, 2, 3); length; --length) lengths[num++] = prev; break;
        case 17: for (length = readBits(d, 3, 3); length; --length) lengths[num++] = 0; break;
        case 18: for (length = readBits(d, 7, 11); length; --length) lengths[num++] = 0; break;
        default: lengths[num++] = sym; break;
      }
    }
    buildTree(lt, lengths, 0, hlit);
    buildTree(dt, lengths, hlit, hdist);
  }
  function inflateBlockData(d, lt, dt) {
    while (1) {
      var sym = decodeSymbol(d, lt);
      if (sym === 256) return;
      if (sym < 256) { d.d[d.o++] = sym; }
      else {
        sym -= 257;
        var length = readBits(d, lengthBits[sym], lengthBase[sym]);
        var dist = decodeSymbol(d, dt);
        var offs2 = d.o - readBits(d, distBits[dist], distBase[dist]);
        for (var i = offs2; i < offs2 + length; ++i) d.d[d.o++] = d.d[i];
      }
    }
  }
  function inflateUncompressedBlock(d) {
    while (d.bitcount >= 8) { d.i--; d.bitcount -= 8; } // give back whole unread bytes; drop the partial one
    var length = d.s[d.i + 1] * 256 + d.s[d.i], invlength = d.s[d.i + 3] * 256 + d.s[d.i + 2];
    if (length !== (~invlength & 0x0000ffff)) throw new Error('inflate: bad stored block');
    d.i += 4;
    for (var i = length; i; --i) d.d[d.o++] = d.s[d.i++];
    d.bitcount = 0;
  }
  buildFixedTrees(sltree, sdtree);
  buildBitsBase(lengthBits, lengthBase, 4, 3);
  buildBitsBase(distBits, distBase, 2, 1);
  lengthBits[28] = 0; lengthBase[28] = 258;

  function inflate(source, outLength) {
    var d = new Data(source, new Uint8Array(outLength)), bfinal, btype;
    do {
      bfinal = getbit(d);
      btype = readBits(d, 2, 0);
      if (btype === 0) inflateUncompressedBlock(d);
      else if (btype === 1) inflateBlockData(d, sltree, sdtree);
      else if (btype === 2) { decodeTrees(d, d.lt, d.dt); inflateBlockData(d, d.lt, d.dt); }
      else throw new Error('inflate: bad block type');
    } while (!bfinal);
    if (d.o !== outLength) throw new Error('inflate: size mismatch ' + d.o + ' != ' + outLength);
    return d.d;
  }
  w.__xhsInflate = inflate;
})(typeof window !== 'undefined' ? window : globalThis);
