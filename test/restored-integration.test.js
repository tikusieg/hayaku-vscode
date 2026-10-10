const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function editorHarness(initial,settings={}) {
  let text=initial,version=1;const listeners={},commands={},contexts={},inserts=[];
  class Position {constructor(line,character){this.line=line;this.character=character;}translate(l,c){return new Position(this.line+l,this.character+c);}}
  class Selection {constructor(start,end){this.start=start;this.end=end;this.active=end;this.isEmpty=start.line===end.line&&start.character===end.character;}isEqual(other){return this.start.line===other.start.line&&this.start.character===other.start.character&&this.end.line===other.end.line&&this.end.character===other.end.character;}}
  class Range {constructor(start,end){this.start=start;this.end=end;}}
  const offsetAt=p=>text.split('\n').slice(0,p.line).reduce((n,l)=>n+l.length+1,0)+p.character;
  const positionAt=n=>{const a=text.slice(0,n).split('\n');return new Position(a.length-1,a.at(-1).length);};
  const doc={languageId:'css',uri:{},get version(){return version;},getText:()=>text,lineAt:n=>({text:text.split('\n')[n]}),offsetAt,positionAt};
  const editor={document:doc,selections:[new Selection(positionAt(text.length),positionAt(text.length))],get selection(){return this.selections[0];},set selection(s){this.selections=[s];},
    edit:async fn=>{const edits=[];fn({replace:(range,value)=>edits.push({range,value})});for(const e of edits.sort((a,b)=>offsetAt(b.range.start)-offsetAt(a.range.start))){const from=offsetAt(e.range.start),to=offsetAt(e.range.end);text=text.slice(0,from)+e.value+text.slice(to);}version++;listeners.document?.({document:doc,contentChanges:edits.map(e=>({range:e.range,text:e.value}))});return true;},
    insertSnippet:async(snippet,range)=>{inserts.push(snippet.value);range=Array.isArray(range)?range[0]:range||editor.selection;const start=offsetAt(range.start),end=offsetAt(range.end),m=/\$\{1(?::([^}]*))?\}/.exec(snippet.value);const plain=snippet.value.replace(/\$\{1(?::([^}]*))?\}/g,(_,v)=>v||'').replace(/\$0/g,'');text=text.slice(0,start)+plain+text.slice(end);version++;const a=m?start+m.index:start+plain.length,b=m?a+(m[1]||'').length:a;editor.selection=new Selection(positionAt(a),positionAt(b));}
  };
  const on=key=>fn=>{listeners[key]=fn;return {dispose(){}};};
  const vscode={Position,Selection,Range,SnippetString:class{constructor(value){this.value=value;}},window:{activeTextEditor:editor,createOutputChannel:()=>({dispose(){},appendLine:message=>{throw Error(message);}}),onDidChangeActiveTextEditor:on('editor'),onDidChangeTextEditorSelection:on('selection'),showErrorMessage:m=>{throw Error(m);}},workspace:{isTrusted:true,onDidChangeTextDocument:on('document'),onDidChangeConfiguration:on('configuration'),getConfiguration:()=>({get:(k,f)=>k in settings?settings[k]:k==='clipboardDefaults'?false:f,inspect:()=>({})})},commands:{registerCommand:(id,fn)=>{commands[id]=fn;return {dispose(){}};},executeCommand:async(id,...args)=>{if(id==='setContext')contexts[args[0]]=args[1];}}};
  const module={exports:{}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../extension'),'utf8'),{module,setTimeout,require:id=>id==='vscode'?vscode:id==='./user-snippets'?{load:async()=>[],matching:()=>[]}:require(id==='./core'?'../core':'../features')});
  module.exports.activate({subscriptions:[]});
  const type=async value=>{const range=editor.selection,start=offsetAt(range.start),end=offsetAt(range.end);text=text.slice(0,start)+value+text.slice(end);version++;const pos=positionAt(start+value.length);editor.selection=new Selection(pos,pos);listeners.document({document:doc,contentChanges:[{range,text:value}]});await new Promise(resolve=>setTimeout(resolve,15));};
  return {editor,commands,contexts,inserts,type,get text(){return text;},select:(a,b)=>{editor.selection=new Selection(positionAt(a),positionAt(b));}};
}
test('ratio abbreviations pass through the actual Tab command',async()=>{
  const h=editorHarness('.x {\n ar16/9');await h.commands['hayaku.expand']();assert.equal(h.text,'.x {\n aspect-ratio: 16/9;');
});
test('live typing adds units without consuming subsequent digits; setting disables it',async()=>{
  const h=editorHarness('.x {\n w');await h.commands['hayaku.expand']();await h.type('1');assert.equal(h.text,'.x {\n width: 1px;');await h.type('0');assert.equal(h.text,'.x {\n width: 10px;');
  const off=editorHarness('.x {\n w',{enableLivePostexpand:false});await off.commands['hayaku.expand']();await off.type('1');assert.equal(off.text,'.x {\n width: 1;');
});
test('typing the second slash creates a CSS comment and respects its switch',async()=>{
  const h=editorHarness('.x {\n /');await h.type('/');assert.equal(h.text,'.x {\n /*  */');
  const off=editorHarness('.x {\n /',{enableInlineComments:false});await off.type('/');assert.equal(off.text,'.x {\n //');
});
test('keyword command cycles dictionary values and respects its switch',async()=>{
  const h=editorHarness('.x { position: static');await h.commands['hayaku.cycleKeyword'](1);assert.equal(h.text,'.x { position: relative');
  const off=editorHarness('.x { position: static',{enableKeywordCycling:false});await off.commands['hayaku.cycleKeyword'](1);assert.equal(off.text,'.x { position: static');
});
test('number command clamps widths and changes the selected digit',async()=>{
  const h=editorHarness('.x { width: 0px');await h.commands['hayaku.cycle'](-1);assert.equal(h.text,'.x { width: 0px');
  const m=editorHarness('.x { margin: 123px');m.select(13,14);await m.commands['hayaku.cycle'](1);assert.equal(m.text,'.x { margin: 223px');
  const off=editorHarness('.x { margin: 123px',{enableSelectedDigitCycling:false});off.select(13,14);await off.commands['hayaku.cycle'](1);assert.equal(off.text,'.x { margin: 123px');
});
test('live postexpansion handles keywords, colors, RGBA channel selection and deletion',async()=>{
  const p=editorHarness('.x {\n po');await p.commands['hayaku.expand']();await p.type('a');assert.equal(p.text,'.x {\n position: absolute;');await p.type('b');assert.equal(p.text,'.x {\n position: absolute;');
  const c=editorHarness('.x {\n c');await c.commands['hayaku.expand']();await c.type('F');assert.equal(c.text,'.x {\n color: #FFF;');
  const w=editorHarness('.x {\n w');await w.commands['hayaku.expand']();await w.type('1');const at=w.editor.document.offsetAt(w.editor.selection.active);w.select(at-1,at);await w.type('');assert.equal(w.text,'.x {\n width: ;');
  const rgba=editorHarness('.x {\n c');await rgba.commands['hayaku.expand']();await rgba.type('255');await rgba.type(',');assert.equal(rgba.text,'.x {\n color: rgba(255,255,255,1);');await rgba.type('.');assert.equal(rgba.text,'.x {\n color: rgba(255,255,255,0.5);');
});
test('padding-right accepts typed sp() without replacing it with unset',async()=>{
  const h=editorHarness('.x {\n pr');await h.commands['hayaku.expand']();
  for(const c of 'sp()')await h.type(c);
  assert.equal(h.text,'.x {\n padding-right: sp();');
  await h.commands['hayaku.postexpand']();assert.equal(h.text,'.x {\n padding-right: sp();');
});
test('keyword completion has its own switch while numeric completion stays enabled',async()=>{
  const h=editorHarness('.x {\n po',{enableLiveKeywordCompletion:false});await h.commands['hayaku.expand']();await h.type('a');assert.equal(h.text,'.x {\n position: a;');
  const w=editorHarness('.x {\n w',{enableLiveKeywordCompletion:false});await w.commands['hayaku.expand']();await w.type('1');assert.equal(w.text,'.x {\n width: 1px;');
});
