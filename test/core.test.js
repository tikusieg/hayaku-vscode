const {test}=require('node:test');
const assert=require('node:assert/strict');
const {run,candidate}=require('../core');
const cases={
  por:'position: relative;$0', 'pstnrltv':'position: relative;$0', 'p:r':'position: relative;$0',
  w10:'width: 10px;$0', 'ml-10':'margin-left: -10px;$0', 'w10.5':'width: 10.5em;$0',
  w10h:'width: 10vh;$0', c0:'color: #000;$0', cFA:'color: #FAFAFA;$0',
  'c0.5':'color: rgba(0,0,0,.5);$0', 'por!':'position: relative !important;$0',
  'w100p':'width: 100%;$0', 'op.5':'opacity: 0.5;$0'
};
for(const [abbr,expected] of Object.entries(cases)) test(abbr,async()=>{
  assert.equal((await run({abbr})).snippet,expected);
});
test('custom aliases, style and preprocessor',async()=>{
  assert.equal((await run({abbr:'zz',aliases:{zz:'w10'}})).snippet,'width: 10px;$0');
  assert.equal((await run({abbr:'w10',language:'stylus'})).snippet,'width 10px$0');
  assert.equal((await run({abbr:'w10',language:'sass'})).snippet,'width: 10px$0');
  assert.equal((await run({abbr:'cFA',options:{hayaku_CSS_colors_case:'lowercase'}})).snippet,'color: #fafafa;$0');
});
test('r expands to right while rx remains rotate x',async()=>{
  assert.equal((await run({abbr:'r'})).snippet,'right: ${1:100%};$0');
  assert.equal((await run({abbr:'rx'})).snippet,'rotate: x;$0');
});
test('mia expands to margin-inline auto',async()=>{
  assert.equal((await run({abbr:'mia'})).snippet,'margin-inline: auto;$0');
});
test('placeholder, clipboard and misses',async()=>{
  assert.match((await run({abbr:'w'})).snippet,/\$\{1:/);
  assert.match((await run({abbr:'c',clipboard:'#123'})).snippet,/#123/);
  assert.equal(await run({abbr:'zzzzzzzzzz'}),null);
});
test('context protects selectors, strings and comments',()=>{
  assert.equal(candidate('.thing {\n  w10','','css'),'w10');
  assert.equal(candidate('.thing { color: red; w10',' }','css'),'w10');
  for(const before of ['w10','.w10','.x { /* w10','.x { content: "w10','.x { color: w10'])
    assert.equal(candidate(before,'','css'),null,before);
  assert.equal(candidate('.x { w10','abc','css'),null);
  assert.equal(candidate('.x { // w10','','scss'),null);
});
test('empty and oversized abbreviations leave text unchanged',async()=>{
  assert.equal(await run({abbr:''}),null);
  assert.equal(await run({abbr:'w'.repeat(129)}),null);
});

test('preferred abbreviations keep properties and appended values',async()=>{
  for(const [abbr,property] of Object.entries({of:'object-fit',ar:'aspect-ratio',mi:'margin-inline',mbm:'mix-blend-mode'}))
    assert.equal((await run({abbr})).property,property);
  for(const [abbr,snippet] of Object.entries({'of:cover':'object-fit: cover;$0','ar16/9':'aspect-ratio: 16/9;$0',mi16:'margin-inline: 16px;$0',mbmm:'mix-blend-mode: multiply;$0'}))
    assert.equal((await run({abbr})).snippet,snippet);
  for(const abbr of ['min-width16','miw','miw16'])assert.equal((await run({abbr})).property,'min-width');
  for(const abbr of ['mih','mih16'])assert.equal((await run({abbr})).property,'min-height');
  assert.equal((await run({abbr:'of',aliases:{of:'overflow:'}})).property,'overflow');
});
test('cursor requires cu abbreviations and supports explicit custom aliases',async()=>{
  assert.equal((await run({abbr:'cu'})).property,'cursor');
  assert.equal((await run({abbr:'cup'})).snippet,'cursor: pointer;$0');
  assert.equal((await run({abbr:'cud'})).snippet,'cursor: default;$0');
  assert.equal((await run({abbr:'cursor:pointer'})).snippet,'cursor: pointer;$0');
  for(const abbr of ['cp','cn','cc','cw'])assert.notEqual((await run({abbr}))?.property,'cursor');
  assert.equal((await run({abbr:'cp',aliases:{cp:'cursor:pointer'}})).snippet,'cursor: pointer;$0');
});

test('hyphen-separated numeric shorthand values preserve units and signs',async()=>{
  const cases={
    'p6-10':'padding: 6px 10px;$0',
    'p6-10-12':'padding: 6px 10px 12px;$0',
    'm6-10-12-14':'margin: 6px 10px 12px 14px;$0',
    'p6px-10rem':'padding: 6px 10rem;$0',
    'p0-10':'padding: 0 10px;$0',
    'p.5-1.5':'padding: 0.5em 1.5em;$0',
    'm-6--10':'margin: -6px -10px;$0',
    'mi6-10':'margin-inline: 6px 10px;$0',
    'p6-10!':'padding: 6px 10px !important;$0'
  };
  for(const [abbr,snippet] of Object.entries(cases))assert.equal((await run({abbr})).snippet,snippet,abbr);
  assert.equal((await run({abbr:'p6-10',language:'sass'})).snippet,'padding: 6px 10px$0');
  assert.equal((await run({abbr:'p6-10',language:'stylus'})).snippet,'padding 6px 10px$0');
  assert.equal((await run({abbr:'p6-10',options:{CSS_default_unit:'rem'}})).snippet,'padding: 6rem 10rem;$0');
  assert.equal(await run({abbr:'p6-10-12-14-16'}),null);
});
