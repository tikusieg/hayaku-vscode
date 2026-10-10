const {expand} = require('./engine/native');
async function run(request) { return expand(request); }
// Scan strings and comments so Tab never expands their contents.
function context(text, language) {
  let quote = '', comment = false, lineComment = false, depth = 0;
  for (let i=0;i<text.length;i++) {
    const c=text[i], n=text[i+1];
    if (comment) { if(c==='*' && n==='/') {comment=false;i++;} continue; }
    if (lineComment) {if(c==='\n') lineComment=false; continue;}
    if (quote) {if(c==='\\') i++; else if(c===quote) quote=''; continue;}
    if(c==='/' && n==='*') {comment=true;i++;continue;}
    if(language!=='css' && c==='/' && n==='/') {lineComment=true;i++;continue;}
    if(c==='"' || c==="'") {quote=c;continue;}
    if(c==='{') depth++;
    if(c==='}') depth--;
  }
  return !quote && !comment && !lineComment && (depth>0 || ['sass','stylus'].includes(language));
}
function candidate(before, after, language) {
  if (!context(before, language) || !/^\s*(?:[;}\r\n]|$)/.test(after)) return null;
  const segment = before.split(/[;{}\n]/).pop();
  const match = /^(\s*)([a-z$@+][a-zA-Z0-9:#.%!_+\-/(),]*)$/.exec(segment);
  return match ? match[2] : null;
}
module.exports = {run, context, candidate};

// Return only the numeric part; the unit participates in hit-testing, not editing.
function numericTarget(text, offset, language) {
  const lineStart=text.lastIndexOf('\n',offset-1)+1;
  const nextLine=text.indexOf('\n',offset);
  const line=text.slice(lineStart,nextLine<0?text.length:nextLine);
  const column=offset-lineStart;
  for(const m of line.matchAll(/[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?(?:[a-zA-Z]+|%)?/g)) {
    const start=m.index,end=start+m[0].length;
    if(column<start || column>end) continue;
    if(start>0 && /[\w#$@.\\-]/.test(line[start-1])) continue;
    const number=/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(m[0])[0];
    const prefix=text.slice(0,lineStart+start);
    if(!context(prefix,language) || /url\([^)]*$/i.test(prefix)) continue;
    const declaration=line.slice(0,start).split(/[;{}]/).pop();
    const pattern=language==='stylus'?/^\s*[-\w]+(?:\s*:\s*|\s+)[^;]*$/:/^\s*[-\w]+\s*:\s*[^;]*$/;
    if(!pattern.test(declaration) || !Number.isFinite(Number(number))) continue;
    return {start:lineStart+start,end:lineStart+start+number.length,value:Number(number)};
  }
  return null;
}
module.exports.numericTarget=numericTarget;
