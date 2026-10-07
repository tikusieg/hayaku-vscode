const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parseJSONC,definitions,matching,load}=require('../user-snippets');
test('JSONC comments and trailing commas preserve snippet strings',()=>{
  const text=`{
    // comment
    "Margin": {"prefix":["mb","margin-b",], "body":["url(https://a/b)", "\${1:x,}",],},
    /* comment */ "Other": {"prefix":"x","body":"/* literal */"},
  }`;
  assert.equal(parseJSONC(text).Margin.body[1],'${1:x,}');
  assert.equal(definitions(text,'css.json','css').length,3);
  assert.throws(()=>parseJSONC('{/* unfinished'));
});
test('language, global scope, file templates and exact prefix boundaries',()=>{
  const text=JSON.stringify({
    A:{prefix:['mb','m-b'],scope:'css, scss',body:['a','b']},
    B:{prefix:'mb',scope:'javascript',body:'bad'},
    C:{prefix:'mb',isFileTemplate:true,body:'bad'},
    D:{prefix:'mb',body:'bad',include:'*.special.css'}
  });
  const result=definitions(text,'global.code-snippets','css');
  assert.equal(result.length,2);
  assert.equal(result[0].body,'a\nb');
  assert.equal(definitions(text,'javascript.json','css').length,0);
  assert.equal(matching(result,['  mb']).length,1);
  assert.equal(matching(result,['  xmb']).length,0);
  assert.equal(matching(result,['  mb','  m-b']).length,0);
  assert.equal(matching(result,['  mbx']).length,0);
});
test('load reads only active-language, global and current-project authored files',async()=>{
  const files={
    '/user/snippets/css.json':JSON.stringify({A:{prefix:'mb',body:'user'}}),
    '/user/snippets/javascript.json':'invalid',
    '/user/snippets/global.code-snippets':JSON.stringify({B:{prefix:'g',body:'global'}}),
    '/project/.vscode/p.code-snippets':JSON.stringify({C:{prefix:'p',body:'project'}}),
    '/project/.vscode/settings.json':'invalid'
  };
  const path=require('node:path').posix;
  const uri=p=>({fsPath:p,toString:()=>p});
  const api={
    Uri:{joinPath:(base,...parts)=>uri(path.join(base.fsPath,...parts)),file:uri},
    FileType:{File:1},
    workspace:{
      getConfiguration:()=>({get:()=>[]}),
      getWorkspaceFolder:()=>({uri:uri('/project')}),
      fs:{
        readDirectory:async folder=>Object.keys(files).filter(p=>path.dirname(p)===folder.fsPath).map(p=>[path.basename(p),1]),
        readFile:async file=>Buffer.from(files[file.fsPath])
      }
    }
  };
  const result=await load(api,{globalStorageUri:uri('/user/globalStorage/local-hayaku')},
    {uri:uri('/project/a.css'),languageId:'css'},()=>assert.fail('unexpected read error'));
  assert.deepEqual(result.map(s=>s.body).sort(),['global','project','user']);
});
