const vscode = require('vscode');
const userSnippets = require('./user-snippets');
const {run, candidate, numericTarget} = require('./core');
const {styleOptions,blockSnippet,keywordTarget,numberSelectionTarget,adjustedNumber,postValue,canComment}=require('./features');
const supported = /^(css|scss|less|sass|stylus|postcss)$/;
let busy = false;
let valueSession;
function activate(context) {
  const output=vscode.window.createOutputChannel('Hayaku');
  context.subscriptions.push(output);
  const warned=new Set();
  const warn=(source,error)=>{
    const message=source+': '+error.message;
    if(!warned.has(message)) {warned.add(message);output.appendLine(message);
      vscode.window.showWarningMessage('Hayaku: スニペットを読み込めませんでした。出力「Hayaku」を確認してください。');}
  };
  context.subscriptions.push(vscode.commands.registerCommand('hayaku.selectSnippetDirectory',async()=>{
    const folders=await vscode.window.showOpenDialog({canSelectFiles:false,canSelectFolders:true,canSelectMany:false,
      title:'使用中のユーザー／プロファイルの snippets フォルダーを選択'});
    if(folders?.length) await vscode.workspace.getConfiguration('hayaku').update('userSnippetDirectories',
      [folders[0].fsPath],vscode.ConfigurationTarget.Global);
  }));
  const enabled=(editor,name)=>vscode.workspace.getConfiguration('hayaku',editor.document.uri).get(name,true);
  let typingEdit=false;
  const targetsFor=editor=>{
    if(!editor || !supported.test(editor.document.languageId) || !vscode.workspace.isTrusted ||
       !enabled(editor,'enableValueCycling')) return [];
    const text=editor.document.getText();
    return editor.selections.map(selection=>selection.isEmpty?
      numericTarget(text,editor.document.offsetAt(selection.active),editor.document.languageId):
      enabled(editor,'enableSelectedDigitCycling')?numberSelectionTarget(text,editor.document.offsetAt(selection.start),editor.document.offsetAt(selection.end),editor.document.languageId):null);
  };
  const refreshNumberContext=()=>{
    const targets=targetsFor(vscode.window.activeTextEditor);
    const editor=vscode.window.activeTextEditor;
    const keywords=editor&&supported.test(editor.document.languageId)&&enabled(editor,'enableKeywordCycling')&&enabled(editor,'enableValueCycling')&&editor.selections.every(s=>s.isEmpty&&keywordTarget(editor.document.getText(),editor.document.offsetAt(s.active),editor.document.languageId));
    vscode.commands.executeCommand('setContext','hayaku.canCycleKeyword',!!keywords);
    return vscode.commands.executeCommand('setContext','hayaku.canCycleNumber',
      targets.length>0 && targets.every(Boolean));
  };
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(refreshNumberContext));
  context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(refreshNumberContext));
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event=>{refreshNumberContext();if(event?.contentChanges?.length&&!typingEdit&&!busy)handleTyping(event).catch(error=>output.appendLine(error.message));}));
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(refreshNumberContext));
  refreshNumberContext();
  const clearValue = () => { valueSession=undefined; vscode.commands.executeCommand('setContext','hayaku.valueActive',false); };
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(clearValue));
  context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(event => {
    if(!valueSession)return;
    if(event.textEditor !== valueSession.editor || event.selections.length !== 1 ||
       event.selections[0].active.line !== valueSession.start.line){clearValue();return;}
    const line=event.textEditor.document.lineAt(valueSession.start.line).text;
    const start=valueSession.start.character+valueSession.prefix.length,end=line.indexOf(';',start);
    const at=event.selections[0].active.character;
    if(at<start||at>(end<0?line.length:end))clearValue();
  }));
  const register = (id, action) => context.subscriptions.push(vscode.commands.registerCommand(id, async (...args) => {
    if (busy) return;
    const editor=vscode.window.activeTextEditor;
    if (!editor || !supported.test(editor.document.languageId) || !vscode.workspace.isTrusted) return;
    busy=true;
    try {await action(editor,...args);} catch(error) {
      vscode.window.showErrorMessage('Hayaku: ' + error.message);
    } finally {busy=false;}
  }));
  function config(editor) {
    const c=vscode.workspace.getConfiguration('hayaku',editor.document.uri);
    const options={...c.get('options',{})};
    const vendorSetting=c.inspect('disableVendorPrefixes');
    const hasVendorSetting=vendorSetting && ['globalValue','workspaceValue','workspaceFolderValue',
      'globalLanguageValue','workspaceLanguageValue','workspaceFolderLanguageValue']
      .some(key=>vendorSetting[key]!==undefined);
    if(hasVendorSetting) options.CSS_prefixes_disable=c.get('disableVendorPrefixes');
    options.CSS_enable_function_snippets=c.get('enableFunctionSnippets',true);
    options.CSS_cycle_positive_limits=c.get('enablePositiveValueLimits',true);
    return {options:styleOptions(options), aliases:c.get('aliases',{}),
      dictionary:c.get('dictionary',{}), language:editor.document.languageId, clipboardDefaults:c.get('clipboardDefaults',true)};
  }
  async function handleTyping(event) {
    const editor=vscode.window.activeTextEditor;
    if(!editor||event.document!==editor.document||!vscode.workspace.isTrusted||editor.selections.length!==1||event.reason||event.contentChanges.length!==1)return;
    const change=event.contentChanges[0],inputVersion=editor.document.version;
    if(change.text.length>1)return;
    // Let VS Code update the selection after the typed character.
    await new Promise(resolve=>setTimeout(resolve,0));
    if(editor!==vscode.window.activeTextEditor||editor.document.version!==inputVersion||typingEdit||!editor.selections[0].isEmpty)return;
    const active=editor.selections[0].active,text=editor.document.getText(),offset=editor.document.offsetAt(active);
    if(change.text==='/'&&text.slice(offset-2,offset)==='//'&&enabled(editor,'enableInlineComments')&&config(editor).options.CSS_disable_inline_comment!==true&&canComment(text,offset-2,editor.document.languageId)) {
      typingEdit=true;
      try {await editor.insertSnippet(new vscode.SnippetString('/* ${1} */$0'),new vscode.Range(editor.document.positionAt(offset-2),active));} finally {typingEdit=false;}
      return;
    }
    const session=valueSession;
    if(!session||session.editor!==editor||active.line!==session.start.line||!enabled(editor,'enablePostexpand')||!enabled(editor,'enableLivePostexpand'))return;
    const line=editor.document.lineAt(active.line).text,start=session.start.character+session.prefix.length;
    if(!line.slice(session.start.character).startsWith(session.prefix)||active.character<start)return;
    const end=line.indexOf(';',start),limit=end<0?line.length:end;
    if(active.character>limit||change.range.start.line!==active.line||change.range.start.character<start)return;
    const raw=line.slice(start,active.character);
    if(!raw){
      if(!change.text&&session.liveValue){typingEdit=true;try{await editor.edit(edit=>edit.replace(new vscode.Range(new vscode.Position(active.line,start),new vscode.Position(active.line,limit)),''),{undoStopBefore:false,undoStopAfter:false});editor.selection=new vscode.Selection(active,active);}finally{typingEdit=false;}session.liveValue=undefined;}
      return;
    }
    const version=editor.document.version;
    const value=await postValue(session.property,raw,config(editor),{keywords:enabled(editor,'enableLiveKeywordCompletion')});
    if(!value||line.slice(start,limit)===value||version!==editor.document.version||valueSession!==session)return;
    let cursor=value.startsWith(raw)?raw.length:value.startsWith('#')&&!raw.startsWith('#')?raw.length+1:value.length;
    let selectionLength=0;
    if(/^\d{1,3},$/.test(raw)&&value.startsWith('rgba(')){cursor=value.indexOf(',')+1;selectionLength=raw.length-1;}
    if(/^(?:\d{1,3},|rgba\(\d{1,3},)\.$/.test(raw)&&value.startsWith('rgba(')){cursor=value.lastIndexOf(',')+3;selectionLength=1;}
    typingEdit=true;
    try {
      await editor.edit(edit=>edit.replace(new vscode.Range(new vscode.Position(active.line,start),new vscode.Position(active.line,limit)),value),{undoStopBefore:false,undoStopAfter:false});
      const pos=new vscode.Position(active.line,start+Math.min(cursor,value.length));
      editor.selection=new vscode.Selection(pos,new vscode.Position(pos.line,pos.character+selectionLength));
      session.liveValue=value;
    } finally {typingEdit=false;}
  }
  const same = (e,version,selections) => vscode.window.activeTextEditor===e && e.document.version===version &&
    selections.length===e.selections.length && selections.every((s,i)=>s.isEqual(e.selections[i]));
  register('hayaku.nextSnippet', async editor => {
    if(!enabled(editor,'enableSnippetNavigation')) return;
    await vscode.commands.executeCommand('hideSuggestWidget');
    await vscode.commands.executeCommand('jumpToNextSnippetPlaceholder');
  });
  register('hayaku.expand', async editor => {
    const selections=[...editor.selections], version=editor.document.version, c=config(editor);
    const text=editor.document.getText();
    // User-authored snippets are resolved before invoking the Hayaku engine.
    if(enabled(editor,'enableUserSnippets') && selections.every(s=>s.isEmpty)) {
      const snippets=await userSnippets.load(vscode,context,editor.document,warn);
      if(!same(editor,version,selections)) return;
      const lines=selections.map(s=>editor.document.lineAt(s.active.line).text.slice(0,s.active.character));
      const matches=userSnippets.matching(snippets,lines);
      let chosen=matches[0];
      if(matches.length>1) {
        chosen=await vscode.window.showQuickPick(matches.map(s=>({
          label:s.name,description:s.prefix,detail:s.source,snippet:s
        })),{placeHolder:'同じ略記に一致する自作スニペットを選択'}).then(item=>item?.snippet);
        if(!chosen) return;
      }
      if(chosen) {
        if(!same(editor,version,selections)) return;
        const ranges=selections.map(s=>new vscode.Range(s.active.translate(0,-chosen.prefix.length),s.active));
        await vscode.commands.executeCommand('hideSuggestWidget');
        await vscode.commands.executeCommand('editor.action.inlineSuggest.hide');
        if(!same(editor,version,selections)) return;
        clearValue();
        await editor.insertSnippet(new vscode.SnippetString(chosen.body),ranges);
        return;
      }
    }
    if(!enabled(editor,'enableAbbreviations')) return vscode.commands.executeCommand('tab');
    const ranges=[];
    let abbr;
    for(const s of selections) {
      if(!s.isEmpty) return vscode.commands.executeCommand('tab');
      const offset=editor.document.offsetAt(s.active);
      const a=candidate(text.slice(0,offset),text.slice(offset),c.language);
      if(!a || (abbr && a!==abbr)) return vscode.commands.executeCommand('tab');
      abbr=a; ranges.push(new vscode.Range(s.active.translate(0,-a.length),s.active));
    }
    await vscode.commands.executeCommand('hideSuggestWidget');
    await vscode.commands.executeCommand('editor.action.inlineSuggest.hide');
    const result=await run({...c,abbr,clipboard:c.clipboardDefaults?await vscode.env.clipboard.readText():''});
    if(!same(editor,version,selections)) return;
    if(!result) return vscode.commands.executeCommand('tab');
    await vscode.commands.executeCommand('hideSuggestWidget');
    clearValue();
    await editor.insertSnippet(new vscode.SnippetString(result.snippet),ranges);
    if(enabled(editor,'enablePostexpand') && result.postexpand && ranges.length===1) {
      valueSession={editor,start:ranges[0].start,prefix:result.prefix,property:result.property};
      await vscode.commands.executeCommand('setContext','hayaku.valueActive',true);
    }
  });
  register('hayaku.postexpand', async editor => {
    if(!enabled(editor,'enablePostexpand')) return vscode.commands.executeCommand('jumpToNextSnippetPlaceholder');
    const session=valueSession;
    await vscode.commands.executeCommand('hideSuggestWidget');
    clearValue();
    if(!session || session.editor!==editor || editor.selections.length!==1)
      return vscode.commands.executeCommand('jumpToNextSnippetPlaceholder');
    const version=editor.document.version,selections=[...editor.selections], c=config(editor);
    const line=editor.document.lineAt(session.start.line).text;
    const tail=line.slice(session.start.character);
    if(!tail.startsWith(session.prefix)) return vscode.commands.executeCommand('jumpToNextSnippetPlaceholder');
    const end=tail.indexOf(';');
    const raw=tail.slice(session.prefix.length,end<0?tail.length:end).trim();
    if(!raw) return vscode.commands.executeCommand('jumpToNextSnippetPlaceholder');
    const plainValue=await postValue(session.property,raw,c);
    const result=plainValue?await run({...c,abbr:session.property+':'+plainValue,options:{...c.options,CSS_prefixes_disable:true},clipboard:''}):null;
    if(!same(editor,version,selections)) return;
    if(!result || result.placeholder) return vscode.commands.executeCommand('jumpToNextSnippetPlaceholder');
    const range=new vscode.Range(session.start,new vscode.Position(session.start.line,
      session.start.character+(end<0?tail.length:end+1)));
    await vscode.commands.executeCommand('leaveSnippet');
    await editor.insertSnippet(new vscode.SnippetString(result.snippet),range);
  });
  register('hayaku.block', async editor => {
    if(!enabled(editor,'enableCodeBlocks')) return;
    // Only append a block at the end of a nonempty, unfinished line.
    const canInsert=editor.selections.every(selection=>{
      if(!selection.isEmpty) return false;
      const {active}=selection;
      const text=editor.document.lineAt(active.line).text;
      return active.character===text.length && text.trim().length>0 && !text.trimEnd().endsWith(';');
    });
    if(!canInsert) return vscode.commands.executeCommand('editor.action.insertLineAfter');
    await editor.insertSnippet(new vscode.SnippetString(blockSnippet(editor.document.languageId,config(editor).options)));
  });
  register('hayaku.cycleKeyword',async(editor,step=1)=>{
    if(!enabled(editor,'enableValueCycling')||!enabled(editor,'enableKeywordCycling'))return;
    const text=editor.document.getText(),c=config(editor),version=editor.document.version,selections=[...editor.selections];
    const targets=selections.map(s=>s.isEmpty?keywordTarget(text,editor.document.offsetAt(s.active),c.language):null);
    if(!targets.length||targets.some(t=>!t))return;
    const changes=[];
    for(const target of targets) {
      const values=await run({...c,action:'values',property:target.property}),at=values.indexOf(target.value);
      if(at<0||!values.length)return;
      changes.push({...target,value:values[(at+(step<0?-1:1)+values.length)%values.length]});
    }
    if(!same(editor,version,selections))return;
    await editor.edit(edit=>changes.forEach(t=>edit.replace(new vscode.Range(editor.document.positionAt(t.start),editor.document.positionAt(t.end)),t.value)));
  });
  register('hayaku.cycle', async (editor, step=1) => {
    if(!Number.isFinite(step)) step=1;
    const targets=targetsFor(editor),version=editor.document.version,selections=[...editor.selections];
    if(!targets.length || targets.some(t=>!t)) return;
    const changes=new Map();
    for(const target of targets) {
      const value=await adjustedNumber(editor.document.getText(),target,step,config(editor));
      changes.set(target.start,{range:new vscode.Range(editor.document.positionAt(target.start),
        editor.document.positionAt(target.end)),value});
    }
    if(!same(editor,version,selections))return;
    await editor.edit(edit=>changes.forEach(change=>edit.replace(change.range,change.value)));

  });
}
module.exports = {activate};
