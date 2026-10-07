const {test}=require('node:test');
const assert=require('node:assert/strict');
const {run}=require('../core');
const python=process.env.HAYAKU_PYTHON||'python3';
test('69 pre-update abbreviation results remain identical',async()=>{
  for(const [abbr,snippet] of Object.entries(require('./legacy-expansions.json')))
    assert.equal((await run(python,{abbr})).snippet,snippet,abbr);
});
const cases={
  'd:g':'display: grid;', 'd:f':'display: flex;', 'gap16':'gap: 16px;',
  'row-gap8':'row-gap: 8px;', 'margin-inline16':'margin-inline: 16px;',
  'padding-block8':'padding-block: 8px;', 'grid-template-columns:subgrid':'grid-template-columns: subgrid;',
  'container-type:inline-size':'container-type: inline-size;', 'text-wrap:balance':'text-wrap: balance;',
  'position:sticky':'position: sticky;', 'h100dvh':'height: 100dvh;', 'w50cqw':'width: 50cqw;',
  'accent-colorF':'accent-color: #FFF;', 'width:revert-layer':'width: revert-layer;'
};
for(const [abbr,expected] of Object.entries(cases))
  test('modern '+abbr,async()=>assert.equal((await run(python,{abbr})).snippet,expected+'$0'));
test('new property placeholder and user overrides',async()=>{
  assert.equal((await run(python,{abbr:'aspect-ratio'})).property,'aspect-ratio');
  assert.equal((await run(python,{abbr:'gg',aliases:{gg:'gap16'}})).snippet,'gap: 16px;$0');
  assert.equal((await run(python,{abbr:'gap',dictionary:{gap:{values:['normal'],default:'12px'}}})).snippet,'gap: ${1:12px};$0');
});
test('modern dictionary keywords are available for cycling',async()=>{
  const values=await run(python,{action:'values',property:'text-wrap'});
  assert.ok(values.includes('balance'));
  assert.ok(values.includes('pretty'));
});
test('font weights accept numeric values without units and retain keywords',async()=>{
  for(const value of ['1','200','600','450','450.5','1000']) {
    for(const abbr of ['fw'+value,'font-weight:'+value])
      assert.equal((await run(python,{abbr})).snippet,'font-weight: '+value+';$0',abbr);
  }
  for(const [abbr,value] of [['fwn','normal'],['fwb','bold']])
    assert.equal((await run(python,{abbr})).snippet,'font-weight: '+value+';$0');
  assert.equal((await run(python,{abbr:'fw600!'})).snippet,'font-weight: 600 !important;$0');
  for(const language of ['scss','less','sass','stylus']) {
    const expected=language==='stylus'?'font-weight 600$0':
      language==='sass'?'font-weight: 600$0':'font-weight: 600;$0';
    assert.equal((await run(python,{abbr:'fw600',language})).snippet,expected);
  }
});
test('configured ffs shortcut uses editable palt default',async()=>{
  const properties=require('../package.json').contributes.configuration.properties;
  const settings={aliases:properties['hayaku.aliases'].default,dictionary:properties['hayaku.dictionary'].default};
  const result=await run(python,{...settings,abbr:'ffs'});
  assert.equal(result.snippet,'font-feature-settings: ${1:"palt" 1};$0');
  assert.equal(result.placeholder,true);
  const custom=await run(python,{...settings,abbr:'ffs',
    dictionary:{'font-feature-settings':{values:[],default:'"palt" 0'}}});
  assert.equal(custom.snippet,'font-feature-settings: ${1:"palt" 0};$0');
});
