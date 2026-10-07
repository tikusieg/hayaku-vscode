const vscode=require('vscode');
const assert=require('node:assert/strict');
const fs=require('node:fs');
async function run() {
  const checks=[];
  try {
    const extension=vscode.extensions.getExtension('local-hayaku.hayaku-vscode-local');
    assert.ok(extension);
    await extension.activate();
    async function open(text,positions) {
      const doc=await vscode.workspace.openTextDocument({language:'css',content:text});
      const editor=await vscode.window.showTextDocument(doc);
      editor.selections=positions.map(([line,col])=>new vscode.Selection(line,col,line,col));
      return editor;
    }
    let e=await open('.x {\n  w10\n}',[[1,5]]);
    await vscode.commands.executeCommand('hayaku.expand');
    assert.equal(e.document.lineAt(1).text,'  width: 10px;');
    checks.push('expand');
    await vscode.commands.executeCommand('undo');
    assert.equal(e.document.lineAt(1).text,'  w10');
    checks.push('undo');
    e=await open('.x {\n  por\n  por\n}',[[1,5],[2,5]]);
    await vscode.commands.executeCommand('hayaku.expand');
    assert.equal(e.document.lineAt(1).text,'  position: relative;');
    assert.equal(e.document.lineAt(2).text,'  position: relative;');
    checks.push('multiple cursors');
    e=await open('.x {\n  w\n}',[[1,3]]);
    await vscode.commands.executeCommand('hayaku.expand');
    await vscode.commands.executeCommand('type',{text:'10'});
    await vscode.commands.executeCommand('hayaku.postexpand');
    assert.equal(e.document.lineAt(1).text,'  width: 10px;');
    checks.push('postexpand numeric');
    e=await open('.x {\n  pos\n}',[[1,5]]);
    await vscode.commands.executeCommand('hayaku.expand');
    await vscode.commands.executeCommand('type',{text:'r'});
    await vscode.commands.executeCommand('hayaku.postexpand');
    assert.equal(e.document.lineAt(1).text,'  position: relative;');
    checks.push('postexpand keyword');
    e=await open('.x {\n  width: 10px;\n}',[[1,10]]);
    await vscode.commands.executeCommand('hayaku.cycle',1);
    assert.equal(e.document.lineAt(1).text,'  width: 11px;');
    checks.push('cycle number');
    fs.writeFileSync(process.env.HAYAKU_TEST_RESULT,JSON.stringify({ok:true,checks},null,2));
  } catch(error) {
    fs.writeFileSync(process.env.HAYAKU_TEST_RESULT,JSON.stringify({ok:false,checks,error:error.stack},null,2));
    throw error;
  }
}
module.exports={run};
