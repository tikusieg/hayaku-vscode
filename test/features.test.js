const {test}=require('node:test');
const assert=require('node:assert/strict');
const {run,candidate}=require('../core');
const {styleOptions,blockSnippet,keywordTarget,numberSelectionTarget,adjustedNumber,postValue,canComment}=require('../features');
test('Tab accepts ratios and functions but still protects strings, comments and selectors',()=>{
  for(const a of ['ar16/9','trf:rotate()','bgi:linear-gradient()'])assert.equal(candidate('.x {\n '+a,'','css'),a);
  for(const before of ['.ar16/9','.x { /* ar16/9','.x { content: "ar16/9'])assert.equal(candidate(before,'','css'),null);
});
test('RGBA alpha input remains an editable snippet and arbitrary dollar text stays escaped',async()=>{
  assert.equal((await run({abbr:'cF00.'})).snippet,'color: rgba(255,0,0,.${1:5});$0');
  assert.match((await run({abbr:'content:"$x}"'})).snippet,/\\\$x\\}/);
});
test('clipboard URL quoting follows syntax and explicit options',async()=>{
  const request={abbr:'bgi',clipboard:'a.png'};
  assert.equal((await run(request)).snippet,'background-image: ${1:url(a.png)};$0');
  assert.equal((await run({...request,language:'sass'})).snippet,'background-image: ${1:url("a.png")}$0');
  assert.equal((await run({...request,options:{CSS_syntax_url_quotes:true,CSS_syntax_quote_symbol:"'"}})).snippet,"background-image: ${1:url('a.png')};$0");
});
test('original array dictionary accepts remove-only overrides',async()=>{
  const values=await run({action:'values',property:'position',dictionary:[{name:'position',remove_values:['static']}]});
  assert.ok(!values.includes('static'));assert.ok(values.includes('relative'));
});
test('numeric cycling clamps positive properties but permits negative margins and selected decimal digits',async()=>{
  const width='.x { width: 0px',margin='.x { margin: 0px';
  assert.equal(await adjustedNumber(width,{start:12,value:0},-1,{}),'0');
  assert.equal(await adjustedNumber(margin,{start:13,value:0},-1,{}),'-1');
  const text='.x { margin: 123.45px';
  const t=numberSelectionTarget(text,13,14,'css');assert.equal(t.factor,100);
  assert.equal(await adjustedNumber(text,t,1,{}),'223.45');
  assert.equal(numberSelectionTarget(text,17,18,'css').factor,0.1);
  assert.equal(numberSelectionTarget(text,13,21,'css'),null);
});
test('keyword targets require immediate adjacency in a declaration',()=>{
  const text='.x { position: relative';
  assert.equal(keywordTarget(text,text.length,'css').property,'position');
  assert.equal(keywordTarget(text+' ',text.length+1,'css'),null);
  assert.equal(keywordTarget('.relative',9,'css'),null);
  assert.equal(keywordTarget('.x { content: "relative',23,'css'),null);
});
test('postexpansion supports units, keyword prefixes, RGBA comma forms and important',async()=>{
  assert.equal(await postValue('width','10',{}),'10px');
  assert.equal(await postValue('position','a',{}),'absolute');
  assert.equal(await postValue('color','F',{}),'#FFF');
  assert.equal(await postValue('color','255,',{}),'rgba(255,255,255,1)');
  assert.equal(await postValue('color','255,.',{}),'rgba(255,255,255,0.5)');
  assert.equal(await postValue('width','10!im',{}),'10px !important');
});
test('code style examples and explicit overrides affect block and declaration formatting',()=>{
  const options=styleOptions({hayaku_CSS_syntax_autoguess:['selector{','  property:value;','}'],CSS_whitespace_after_colon:' '});
  assert.equal(options.CSS_whitespace_after_colon,' ');
  assert.equal(blockSnippet('css',options),'{\n  $0\n}');
  assert.equal(blockSnippet('css',{CSS_syntax_no_curly_braces:true}),'\n\t$0');
  assert.equal(blockSnippet('css',{CSS_whitespace_block_start_before:'\n',CSS_whitespace_block_start_after:'\n  ',CSS_whitespace_block_end_before:'\n',CSS_whitespace_block_end_after:'\n'}),'\n{\n  $0\n}\n');
});
test('inline comment conversion excludes strings, existing comments and preprocessors',()=>{
  assert.equal(canComment('.x { ',5,'css'),true);
  assert.equal(canComment('.x { "',6,'css'),false);
  assert.equal(canComment('.x { /* ',8,'css'),false);
  assert.equal(canComment('.x { ',5,'scss'),false);
});
test('angle function placeholders include a numeric-only degree transform',async()=>{
  const result=await run({abbr:'trf:rotate()',options:{CSS_prefixes_disable:true}});
  assert.match(result.snippet,/rotate\(\$\{1\}\$\{1\//);assert.match(result.snippet,/deg/);
});
test('function templates and positive value limits can be switched off',async()=>{
  assert.match((await run({abbr:'bgi:linear-gradient()'})).snippet,/\$\{2:#000\}/);
  assert.equal((await run({abbr:'bgi:linear-gradient()',options:{CSS_enable_function_snippets:false}})).snippet,'background-image: linear-gradient(${1});$0');
  assert.equal((await run({abbr:'trf:rotate()',options:{CSS_enable_function_snippets:false,CSS_prefixes_disable:true}})).snippet,'transform: rotate(${1});$0');
  assert.equal(await adjustedNumber('.x { width: 0px',{start:12,value:0},-1,{options:{CSS_cycle_positive_limits:false}}),'-1');
  assert.equal((await run({abbr:'bgi:url()',options:{CSS_syntax_url_quotes:true}})).snippet,'background-image: url("${1}");$0');
});
