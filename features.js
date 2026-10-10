const {context,numericTarget,run}=require('./core');
function styleOptions(raw={}) {
  const o=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k.replace(/^hayaku_/,''),v]));
  const example=o.CSS_syntax_autoguess;
  if(Array.isArray(example)) {
    const m=/selector(\s*)(\{)?(\s*)property(:)?(\s*)value(;)?(\s*)(\})?(\s*)/i.exec(example.join('\n').trim());
    if(m) {
      const defaults={CSS_whitespace_block_start_before:m[1],CSS_whitespace_block_start_after:m[3],
        CSS_whitespace_after_colon:m[5],CSS_whitespace_block_end_before:m[7],CSS_whitespace_block_end_after:m[9],
        CSS_syntax_no_curly_braces:!m[2],CSS_syntax_no_colons:!m[4],CSS_syntax_no_semicolons:!m[6]};
      return {...defaults,...o};
    }
  }
  return o;
}
function blockSnippet(language,options={}) {
  const o=styleOptions(options),indented=['sass','stylus'].includes(language);
  const noBraces=o.CSS_syntax_no_curly_braces??indented;
  return (o.CSS_whitespace_block_start_before??(noBraces?'':' '))+(noBraces?'':'{')+
    (o.CSS_whitespace_block_start_after??'\n\t')+'$0'+
    (noBraces?'':(o.CSS_whitespace_block_end_before??'\n')+'}'+(o.CSS_whitespace_block_end_after??''));
}
function keywordTarget(text,offset,language) {
  const lineStart=text.lastIndexOf('\n',offset-1)+1;
  const line=text.slice(lineStart,text.indexOf('\n',offset)<0?text.length:text.indexOf('\n',offset));
  for(const m of line.matchAll(/[a-z][a-z-]*/gi)) {
    const start=lineStart+m.index,end=start+m[0].length;
    if(offset<start||offset>end||!context(text.slice(0,start),language))continue;
    const declaration=line.slice(0,m.index).split(/[;{}]/).pop();
    const d=(language==='stylus'?/^\s*([-\w]+)(?:\s*:\s*|\s+)/:/^\s*([-\w]+)\s*:\s*/).exec(declaration);
    if(d&&declaration.slice(d[0].length).trim()==='')return {start,end,property:d[1],value:m[0]};
  }
  return null;
}
function numberSelectionTarget(text,start,end,language) {
  const target=numericTarget(text,start,language);
  if(!target||end>target.end||start<target.start||start===end)return null;
  const selected=text.slice(start,end);
  if(!/\d/.test(selected))return null;
  const number=text.slice(target.start,target.end);
  if(/[eE]/.test(number))return null;
  const point=number.indexOf('.'),right=end-target.start;
  target.factor=point<0?10**(number.length-right):right<=point?10**(point-right):10**(point-right+1);
  return target;
}
async function adjustedNumber(text,target,step,settings) {
  const declaration=text.slice(0,target.start).split(/[;{}\n]/).pop();
  const property=/^\s*([-\w]+)(?:\s*:\s*|\s+)/.exec(declaration)?.[1];
  const metadata=property?await run({...settings,action:'metadata',property}):{};
  let value=Math.round((target.value+step*(target.factor??1))*1e8)/1e8;
  if(metadata.always_positive&&settings.options?.CSS_cycle_positive_limits!==false)value=Math.max(0,value);
  return String(value);
}
async function postValue(property,raw,settings) {
  if(/^(?:color|.*-color|background|border.*|outline.*)$/.test(property)) {
    const rgba=/^(?:rgba\()?([0-9]{1,3}),([.]?)$/.exec(raw);
    if(rgba&&Number(rgba[1])<=255)return `rgba(${rgba[1]},${rgba[1]},${rgba[1]},${rgba[2]?'0.5':'1'})`;
  }
  if(raw.includes('(')&&!raw.endsWith(')'))return null;
  const important=/!([a-z]*)$/.exec(raw);
  if(important&&'important'.startsWith(important[1]))raw=raw.slice(0,important.index)+'!';
  const result=await run({...settings,abbr:property+':'+raw,options:{...settings.options,CSS_prefixes_disable:true},clipboard:''});
  if(!result||result.placeholder||result.property!==property)return null;
  let value=result.snippet.slice(result.prefix.length).replace(/\$0\n?$/,'').replace(/;$/,'');
  // Live text edits contain plain text, never snippet syntax.
  value=value.replace(/\$\{1:([^}]*)\}/g,'$1').replace(/\$\{1\}/g,'').replace(/\\([\\$}])/g,'$1');
  if(value.includes('${'))return null;
  return value;
}
function canComment(text,offset,language) {
  if(language!=='css')return false;
  return context(text.slice(0,offset),'css');
}
module.exports={styleOptions,blockSnippet,keywordTarget,numberSelectionTarget,adjustedNumber,postValue,canComment};
