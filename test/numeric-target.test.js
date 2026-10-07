const {test}=require('node:test');
const assert=require('node:assert/strict');
const {numericTarget}=require('../core');
function target(marked,language='css') {
  const offset=marked.indexOf('|');
  return numericTarget(marked.replace('|',''),offset,language);
}
test('number adjacency includes entire unit and edits only number',()=>{
  for(const token of ['|16px','1|6px','16|px','16p|x','16px|']) {
    const t=target('.x { margin: '+token+'; }');
    assert.equal(t.value,16,token);
    assert.equal(t.end-t.start,2,token);
  }
  assert.equal(target('.x { opacity: -0.|5; }').value,-0.5);
  assert.equal(target('.x { width: 50%|; }').value,50);
  assert.equal(target('.x { margin: 1e|2px; }').value,100);
});
test('non-numeric contexts leave native keybinding available',()=>{
  for(const text of [
    '.x { |margin: 16px; }','.x { margin: | 16px; }',
    '.x { display: block|; }','.x { color: #12|3456; }',
    '.x { content: "12|px"; }','.x { /* margin: 12|px; */ }',
    '.x { background: url(image12|.png); }','.x12| { margin: 1px; }'
  ]) assert.equal(target(text),null,text);
  assert.equal(target('.x { // margin: 12|px','scss'),null);
});
test('numeric declaration detection supports indentation syntaxes',()=>{
  assert.equal(target('.x\n  margin 16px|','stylus').value,16);
  assert.equal(target('.x\n  margin: 16px|','sass').value,16);
});
