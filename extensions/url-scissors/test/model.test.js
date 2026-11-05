'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../src/popup.js');

const rt = u => M.serialize(M.parse(u));

test('round-trip is byte-exact for untouched URLs', () => {
  for (const u of [
    'https://a.com/',
    'https://a.com/p?a=1&b=2',
    'https://a.com/p?flag&empty=&x=1',          // `?a` vs `?a=` preserved
    'https://a.com/p?q=hello+world&r=a%20b',     // + and %20 both preserved
    'https://a.com/p?x=%2f%2F&y=%41',            // lowercase hex / needless escapes preserved
    'https://a.com/p?a=1&&b=2',                  // empty segment preserved
    'https://a.com/p?a=b=c==',                   // '=' inside value
    'https://a.com/p?a=1#frag?not=query',        // '?' after '#' is hash
    'https://a.com/p#only-hash',
    'https://a.com/p?',                          // bare '?' (empty query) -> normalised away
  ]) {
    const expected = u.endsWith('?') ? u.slice(0, -1) : u;
    assert.equal(rt(u), expected, u);
  }
});

test('parse splits head / params / hash', () => {
  const m = M.parse('https://a.com/x/y?a=1&flag&b=#h');
  assert.equal(m.head, 'https://a.com/x/y');
  assert.equal(m.hash, '#h');
  assert.deepEqual(m.params.map(p => [p.k, p.v]), [['a', '1'], ['flag', null], ['b', '']]);
});

test('display decodes only when re-encoding is lossless', () => {
  assert.deepEqual(M.display('hello%20world', false), { t: 'hello world', m: 'd' });
  assert.deepEqual(M.display('%E4%B8%AD%E6%96%87', false), { t: '中文', m: 'd' });
  assert.deepEqual(M.display('a,b/c:d', false), { t: 'a,b/c:d', m: 'd' });
  assert.deepEqual(M.display('hello+world', false), { t: 'hello+world', m: 'd' });
  // not lossless -> raw, so editing can never silently change their encoding
  assert.equal(M.display('a%2Fb', false).m, 'r');        // encoded slash
  assert.equal(M.display('%e4%b8%ad', false).m, 'r');    // lowercase hex
  assert.equal(M.display('%41', false).m, 'r');          // needless escape
  assert.equal(M.display('100%', false).m, 'r');         // malformed
  assert.equal(M.display('c%2B%2B', false).m, 'r');      // %2B vs +
  assert.deepEqual(M.display(null, false), { t: '', m: 'd' });
});

test('decoded editing re-encodes minimally and keeps structure', () => {
  const v = t => M.fromInput(t, 'd', false, 'x');
  assert.equal(v('a b'), 'a%20b');
  assert.equal(v('a&b'), 'a%26b');
  assert.equal(v('a#b'), 'a%23b');
  assert.equal(v('100%'), '100%25');
  assert.equal(v('中'), '%E4%B8%AD');
  assert.equal(v('a=b'), 'a=b');                         // '=' fine in a value
  assert.equal(M.fromInput('a=b', 'd', true, 'x'), 'a%3Db'); // but not in a key
  assert.equal(v('a+b'), 'a+b');                         // '+' untouched
  assert.equal(v("it's"), 'it%27s');
});

test('every decoded display round-trips through its own encoder', () => {
  for (const raw of ['hello%20world', '%E4%B8%AD', 'a%26b', 'x%23y', '100%25', 'it%27s', 'a+b']) {
    const d = M.display(raw, false);
    assert.equal(d.m, 'd', raw);
    assert.equal(M.fromInput(d.t, d.m, false, raw), raw, raw);
  }
});

test('raw editing only protects delimiters', () => {
  assert.equal(M.fromInput('a%2Fb&c', 'r', false, 'x'), 'a%2Fb%26c');
  assert.equal(M.fromInput('k=1', 'r', true, 'x'), 'k%3D1');
  assert.equal(M.fromInput('a b', 'r', false, 'x'), 'a b');  // Chrome encodes on navigation
});

test('`?flag` does not become `?flag=` after type-then-clear', () => {
  assert.equal(M.fromInput('', 'd', false, null), null);
  assert.equal(M.fromInput('', 'd', false, ''), '');
});

test('editing one param leaves every other byte alone', () => {
  const m = M.parse('https://a.com/p?x=%2f&q=hello+world&flag&r=a%20b#h');
  m.params[3].v = M.fromInput('a b c', M.display(m.params[3].v).m, false, m.params[3].v0);
  assert.equal(M.serialize(m), 'https://a.com/p?x=%2f&q=hello+world&flag&r=a%20b%20c#h');
});

test('new empty rows are dropped, parsed empty segments are kept', () => {
  const m = M.parse('https://a.com/?a=1&&b=2');
  m.params.push({ k: '', v: '', v0: '', n: true });
  assert.equal(M.serialize(m), 'https://a.com/?a=1&&b=2');
  m.params[3].k = 'c';
  assert.equal(M.serialize(m), 'https://a.com/?a=1&&b=2&c=');
});

test('canon compares the way Chrome navigates', () => {
  assert.equal(M.canon('https://A.com/p?q=a b'), M.canon('https://a.com/p?q=a%20b'));
  assert.notEqual(M.canon('https://a.com/p?q=1'), M.canon('https://a.com/p?q=2'));
  assert.equal(M.canon('not a url'), 'not a url');
});
