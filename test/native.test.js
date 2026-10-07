const {test}=require('node:test');
const assert=require('node:assert/strict');
const {expand}=require('../engine/native');
const {execFileSync}=require('node:child_process');
test('runtime expands without permitting child processes',()=>{
  const script=`const Module=require('node:module');const load=Module._load;
    Module._load=function(id,...args){if(['child_process','node:child_process'].includes(id))throw Error('subprocess dependency');return load.call(this,id,...args);};
    require('./core').run({abbr:'mb16'}).then(r=>process.stdout.write(r.snippet));`;
  assert.equal(execFileSync(process.execPath,['-e',script],{cwd:require('node:path').join(__dirname,'..'),encoding:'utf8'}),'margin-bottom: 16px;$0');
});
test('cached dictionaries do not leak custom settings across requests',()=>{
  const request={abbr:'w',dictionary:{width:{values:['...','special'],default:'7px'}}};
  const snapshot=structuredClone(request);
  assert.equal(expand(request).snippet,'width: ${1:7px};$0');
  assert.deepEqual(request,snapshot);
  assert.notEqual(expand({abbr:'w'}).snippet,'width: ${1:7px};$0');
  request.dictionary.width.default='9px';
  assert.equal(expand(request).snippet,'width: ${1:9px};$0');
});
test('recursive user dictionary references terminate',()=>{
  assert.equal(expand({abbr:'custom-size',dictionary:{'custom-size':{values:['<custom-size>'],default:'1px'}}}).snippet,'custom-size: ${1:1px};$0');
});
test('native postexpansion handles literal complex values and snippet escaping',()=>{
  assert.equal(expand({abbr:'width:calc(100% - 1rem)'}).snippet,'width: calc(100% - 1rem);$0');
  assert.equal(expand({abbr:'content:"$x}"'}).snippet,'content: "\\$x\\}";$0');
  assert.equal(expand({abbr:'not-a-property:value'}),null);
});
test('numeric spelling, units and alpha colors retain the original behavior',()=>{
  for(const [abbr,snippet] of Object.entries({'w10.0':'width: 10.0em;$0','w0':'width: 0;$0','c#abc.2':'color: rgba(170,187,204,.2);$0','cFFFA':'color: rgba(255,255,255,0.67);$0'}))assert.equal(expand({abbr}).snippet,snippet);
});
