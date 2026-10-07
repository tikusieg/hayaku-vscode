const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const core=require('../core');
function harness(text, language='css', snippets=[], pick=0, settings={}) {
  const commands={},contexts={},calls=[],listeners={};
  const lines=text.split('\n'),line=lines.length-1,character=lines[line].length;
  const active={line,character,translate:(a,b)=>({line:line+a,character:character+b})};
  const selection={active,isEmpty:true,isEqual:other=>other===selection};
  const document={languageId:language,version:1,uri:{},getText:()=>text,lineAt:n=>({text:lines[n]}),positionAt:offset=>({line:0,character:offset}),offsetAt:()=>text.length};
  const editor={document,selections:[selection],edit:async callback=>{callback({replace:(range,value)=>calls.push(['replace',value])});return true;},insertSnippet:async snippet=>calls.push(['insert',snippet.value])};
  const on=name=>callback=>{listeners[name]=callback;return {dispose(){}};};
  const vscode={
    window:{createOutputChannel:()=>({dispose(){},appendLine(){}}),
      showQuickPick:async items=>pick===null?undefined:items[pick],activeTextEditor:editor,onDidChangeActiveTextEditor:on('editor'),onDidChangeTextEditorSelection:on('selection'),showErrorMessage:msg=>{throw Error(msg);}},
    workspace:{isTrusted:true,onDidChangeTextDocument:on('document'),onDidChangeConfiguration:on('configuration'),getConfiguration:()=>({get:(key,fallback)=>key in settings?settings[key]:key==='clipboardDefaults'?false:fallback})},
    commands:{registerCommand:(id,fn)=>{commands[id]=fn;return {dispose(){}};},
      executeCommand:async(id,...args)=>{calls.push([id,...args]);if(id==='setContext')contexts[args[0]]=args[1];}},
    Range:class {constructor(start,end){this.start=start;this.end=end;}},
    SnippetString:class {constructor(value){this.value=value;}}
  };
  const mockCore={...core,run:async(request)=>{
    assert.ok(calls.some(([id])=>id==='hideSuggestWidget'),'suggestions hidden before expansion');
    assert.equal(request.abbr,'mb');
    return {snippet:'margin-bottom: ${1:};$0',postexpand:true,prefix:'margin-bottom: ',property:'margin-bottom'};
  }};
  const module={exports:{}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../extension'),'utf8'),{
    module,require:id=>id==='vscode'?vscode:id==='./user-snippets'?{load:async()=>snippets,matching:require('../user-snippets').matching}:mockCore
  });
  module.exports.activate({subscriptions:[]});
  return {commands,contexts,calls,listeners,editor};
}
test('mb expands with one command even with suggestions; no completion is accepted',async()=>{
  const h=harness('.x {\n  mb');
  await h.commands['hayaku.expand']();
  assert.deepEqual(h.calls.filter(([id])=>id==='insert'),[['insert','margin-bottom: ${1:};$0']]);
  assert.ok(!h.calls.some(([id])=>['acceptSelectedSuggestion','tab','jumpToNextSnippetPlaceholder'].includes(id)));
});
test('non-abbreviation Tab retains indentation and does not expand',async()=>{
  const h=harness('.x {\n  ');
  await h.commands['hayaku.expand']();
  assert.ok(h.calls.some(([id])=>id==='tab'));
  assert.ok(!h.calls.some(([id])=>id==='insert'));
});
test('user snippet takes precedence over mb in Hayaku',async()=>{
  const h=harness('.x {\n  mb','css',[{name:'My margin',prefix:'mb',body:'margin-bottom: ${1:24px};',source:'css.json'}]);
  await h.commands['hayaku.expand']();
  assert.deepEqual(h.calls.filter(([id])=>id==='insert'),[['insert','margin-bottom: ${1:24px};']]);
});
test('duplicate snippets can be chosen or cancelled without Hayaku fallback',async()=>{
  const snippets=[{name:'A',prefix:'mb',body:'A'},{name:'B',prefix:'mb',body:'B'}];
  const h=harness('.x {\n  mb','css',snippets,1);
  await h.commands['hayaku.expand']();
  assert.deepEqual(h.calls.filter(([id])=>id==='insert'),[['insert','B']]);
  const cancel=harness('.x {\n  mb','css',snippets,null);
  await cancel.commands['hayaku.expand']();
  assert.ok(!cancel.calls.some(([id])=>id==='insert'||id==='tab'));
});
test('automatic suggestions are not disabled and snippet navigation is protected',()=>{
  const contribution=require('../package.json').contributes;
  assert.equal(contribution.configurationDefaults,undefined);
  const binding=contribution.keybindings.find(b=>b.command==='hayaku.expand');
  assert.match(binding.when,/!inSnippetMode/);
  assert.ok(!binding.when.includes('hayaku.canExpand'));
});

test('user snippet Tab advances a field without expanding or accepting suggestions',async()=>{
  const h=harness('.x {\n  mb');
  await h.commands['hayaku.nextSnippet']();
  assert.ok(h.calls.some(([id])=>id==='jumpToNextSnippetPlaceholder'));
  assert.ok(!h.calls.some(([id])=>id==='insert'));
});

test('feature switches independently disable Hayaku and user snippet expansion',async()=>{
  const snippet={name:'Mine',prefix:'mb',body:'custom'};
  let h=harness('.x {\n  mb','css',[snippet],0,{enableUserSnippets:false});
  await h.commands['hayaku.expand']();
  assert.equal(h.calls.find(([id])=>id==='insert')[1],'margin-bottom: ${1:};$0');
  h=harness('.x {\n  mb','css',[snippet],0,{enableAbbreviations:false});
  await h.commands['hayaku.expand']();
  assert.equal(h.calls.find(([id])=>id==='insert')[1],'custom');
  h=harness('.x {\n  mb','css',[snippet],0,{enableAbbreviations:false,enableUserSnippets:false});
  await h.commands['hayaku.expand']();
  assert.ok(!h.calls.some(([id])=>id==='insert'));
});
test('postexpand and block switches disable their effects',async()=>{
  const h=harness('.x {\n  mb','css',[],0,{enablePostexpand:false,enableCodeBlocks:false});
  await h.commands['hayaku.expand']();
  assert.notEqual(h.contexts['hayaku.valueActive'],true);
  const before=h.calls.filter(([id])=>id==='insert').length;
  await h.commands['hayaku.block']();
  assert.equal(h.calls.filter(([id])=>id==='insert').length,before);
});
test('numeric context and mutation agree and obey the master switch',async()=>{
  let h=harness('.x {\n  margin: 16px');
  assert.equal(h.contexts['hayaku.canCycleNumber'],true);
  await h.commands['hayaku.cycle'](1);
  assert.deepEqual(h.calls.filter(([id])=>id==='replace'),[['replace','17']]);
  h=harness('.x {\n  margin: 16px','css',[],0,{enableValueCycling:false});
  assert.equal(h.contexts['hayaku.canCycleNumber'],false);
  await h.commands['hayaku.cycle'](1);
  assert.ok(!h.calls.some(([id])=>id==='replace'));
  h=harness('.x {\n  display: block');
  assert.equal(h.contexts['hayaku.canCycleNumber'],false);
});

test('block insertion falls back at line start, middle, blank lines and after semicolons',async()=>{
  for(const [text,column] of [['.item',0],['.item',2],['',0],['  ',2],['color: red;',11],['color: red;  ',13]]) {
    const h=harness(text);h.editor.selections[0].active.character=column;
    await h.commands['hayaku.block']();
    assert.ok(h.calls.some(([id])=>id==='editor.action.insertLineAfter'),text+':'+column);
    assert.ok(!h.calls.some(([id])=>id==='insert'));
  }
});
test('block insertion at selector end retains CSS and indentation syntax',async()=>{
  for(const language of ['css','scss','less','postcss','sass','stylus']) {
    const h=harness('.item',language);
    await h.commands['hayaku.block']();
    assert.equal(h.calls.find(([id])=>id==='insert')[1],['sass','stylus'].includes(language)?'\n\t$0':' {\n\t$0\n}');
    assert.ok(!h.calls.some(([id])=>id==='editor.action.insertLineAfter'));
  }
});
test('mixed cursor positions fall back together without partial block insertion',async()=>{
  const h=harness('.item');
  h.editor.selections.push({isEmpty:true,active:{line:0,character:2}});
  await h.commands['hayaku.block']();
  assert.equal(h.calls.filter(([id])=>id==='editor.action.insertLineAfter').length,1);
  assert.ok(!h.calls.some(([id])=>id==='insert'));
});
