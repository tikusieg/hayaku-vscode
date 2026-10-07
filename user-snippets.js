// JSONC permits comments and trailing commas. Keep quoted text byte-for-byte.
function parseJSONC(text) {
  text=text.replace(/^\uFEFF/,'');
  let output='', quoted=false, escaped=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i],n=text[i+1];
    if(quoted) {
      output+=c;
      if(escaped) escaped=false;
      else if(c==='\\') escaped=true;
      else if(c==='"') quoted=false;
    } else if(c==='"') {quoted=true;output+=c;}
    else if(c==='/' && n==='/') {
      while(i<text.length && text[i]!=='\n') i++;
      output+='\n';
    } else if(c==='/' && n==='*') {
      const end=text.indexOf('*/',i+2);
      if(end<0) throw Error('Unterminated comment');
      output+=' ';i=end+1;
    } else output+=c;
  }
  let clean='';quoted=false;escaped=false;
  for(let i=0;i<output.length;i++) {
    const c=output[i];
    if(!quoted && c===',') {
      let j=i+1;while(/\s/.test(output[j]||'') && j<output.length) j++;
      if(output[j]==='}' || output[j]===']') continue;
    }
    clean+=c;
    if(quoted) {if(escaped) escaped=false;else if(c==='\\') escaped=true;else if(c==='"') quoted=false;}
    else if(c==='"') quoted=true;
  }
  return JSON.parse(clean);
}

function definitions(text, filename, language) {
  if(filename.endsWith('.json') && filename!==language+'.json') return [];
  const data=parseJSONC(text), result=[];
  if(!data || typeof data!=='object' || Array.isArray(data)) throw Error('Expected a snippet object');
  for(const [name,s] of Object.entries(data)) {
    if(!s || typeof s!=='object' || s.isFileTemplate) continue;
    // Newer VS Code file-pattern restrictions are not interpreted here.
    if(s.include || s.exclude) continue;
    if(s.scope && (typeof s.scope!=='string' || !s.scope.split(',').map(v=>v.trim()).includes(language))) continue;
    const prefixes=Array.isArray(s.prefix)?s.prefix:[s.prefix];
    const body=Array.isArray(s.body) && s.body.every(v=>typeof v==='string')?s.body.join('\n'):s.body;
    if(typeof body!=='string') continue;
    for(const prefix of prefixes)
      if(typeof prefix==='string' && prefix.length && !prefix.includes('\n'))
        result.push({name,prefix,body});
  }
  return result;
}

function matching(snippets, beforeLines) {
  if(!beforeLines.length) return [];
  return snippets.filter(s=>beforeLines.every(line=>{
    if(!line.endsWith(s.prefix)) return false;
    const previous=line.slice(0,-s.prefix.length).slice(-1);
    return !previous || !/[\w$-]/.test(previous);
  }));
}

async function load(vscode, context, document, warn) {
  const config=vscode.workspace.getConfiguration('hayaku',document.uri);
  const configured=config.get('userSnippetDirectories',[]);
  const dirs=[];
  if(configured.length) {
    for(const dir of configured) dirs.push({uri:vscode.Uri.file(dir),project:false});
  } else if(context.globalStorageUri) {
    dirs.push({uri:vscode.Uri.joinPath(context.globalStorageUri,'..','..','snippets'),project:false});
  }
  // Folder snippets apply to their containing workspace folder.
  const folder=vscode.workspace.getWorkspaceFolder(document.uri);
  if(folder) dirs.push({uri:vscode.Uri.joinPath(folder.uri,'.vscode'),project:true});
  const result=[],seen=new Set();
  for(const dir of dirs) {
    let files;
    try {files=await vscode.workspace.fs.readDirectory(dir.uri);}
    catch(error) {if(error.code!=='FileNotFound' && error.code!=='ENOENT') warn(dir.uri.toString(),error);continue;}
    for(const [filename,type] of files.sort((a,b)=>a[0].localeCompare(b[0]))) {
      if(!(type & vscode.FileType.File)) continue;
      if(!filename.endsWith('.code-snippets') && (dir.project || filename!==document.languageId+'.json')) continue;
      const uri=vscode.Uri.joinPath(dir.uri,filename),key=uri.toString();
      if(seen.has(key)) continue;
      seen.add(key);
      try {
        const bytes=await vscode.workspace.fs.readFile(uri);
        if(bytes.length>1024*1024) throw Error('Snippet file exceeds 1 MB');
        for(const s of definitions(Buffer.from(bytes).toString('utf8'),filename,document.languageId))
          result.push({...s,source:key});
      } catch(error) {warn(key,error);}
    }
  }
  return result;
}
module.exports={parseJSONC,definitions,matching,load};
