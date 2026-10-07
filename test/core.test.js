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
