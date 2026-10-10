'use strict';
// JavaScript port of Hayaku's MIT-licensed dictionary and abbreviation engine.
const source = require('./dictionaries/hayaku_CSS_dictionary.json');
const modern = require('./dictionaries/modern_CSS_dictionary.json').properties;
const priority = require('./priority.json');
const own = (o,k) => Object.hasOwn(o,k);
const clone = o => structuredClone(o);
function parse(raw) {
  const out=Object.create(null);
  for(const item of raw || []) if(own(item,'name')) {
    for(const name of Array.isArray(item.name)?item.name:item.name.split(',').map(s=>s.trim())) {
      out[name]={...item,values:(item.values||[]).map(v=>v.replaceAll(' ','~'))};
      delete out[name].name;
    }
  }
  return out;
}
function merge(left,right) {
  const out=Object.assign(Object.create(null),clone(left));
  right=Array.isArray(right)?parse(right):right;
  for(const [name,item] of Object.entries(right || {})) {
    if(!own(out,name)) {out[name]=clone(item);continue;}
    for(const key of ['default','prefixes','no_unprefixed_property','always_positive','type'])
      if(own(item,key)) out[name][key]=clone(item[key]);
    if(item.values) {
      const old=out[name].values.filter(v=>!item.values.includes(v)), vals=[...item.values], at=vals.indexOf('...');
      if(at>=0) vals.splice(at,1,...old); else vals.push(...old);
      out[name].values=[...new Set(vals)];
    }
    if(item.remove_values) out[name].values=out[name].values.filter(v=>!item.remove_values.includes(v));
  }
  return out;
}
function flatten(dict,name,commented=false,seen=new Set()) {
  if(seen.has(name)) return [];
  seen=new Set(seen).add(name);
  let key=name;
  if(commented && key.startsWith('<_')) key=key.replace('<_','<');
  const item=own(dict,key)?dict[key]:(key.startsWith('<')?dict[key.slice(1,-1)]:undefined);
  if(!item) return [];
  if(typeof item==='string') return [item];
  return (item.values||[]).flatMap(v=>[v,...(v.startsWith('<')&&v.endsWith('>')?flatten(dict,v,commented,seen):[])]);
}
function defaultValue(dict,name,seen=new Set()) {
  if(seen.has(name)) return undefined;
  seen=new Set(seen).add(name);
  const item=own(dict,name)?dict[name]:dict[name.slice(1,-1)];
  if(!item) return undefined;
  if(item.default!=null) return item.default;
  for(const v of item.values||[]) if(v.startsWith('<')&&v.endsWith('>')) {
    const result=defaultValue(dict,v,seen); if(result!==undefined) return result;
  }
}
function index(dict) {
  const flat=Object.create(null), all=Object.keys(dict);
  for(const name of Object.keys(dict)) {
    flat[name]=flatten(dict,name);
    all.push(...flat[name].filter(v=>!v.startsWith('<')&&!v.startsWith('.')).map(v=>name+' '+v));
  }
  return {dict,flat,all};
}
// Cache only the most recent settings: repeated Tab presses need no dictionary rebuild.
let cachedKey, cached;
function dictionaries(request) {
  const key=JSON.stringify([request.language,request.dictionary,request.aliases]);
  if(key===cachedKey) return cached;
  const pre={scss:'SCSS',less:'Less',sass:'Sass',stylus:'Stylus',postcss:'PostCSS'}[request.language];
  const base=merge(parse(source.CSS),parse(source[pre]));
  const updated=clone(base);
  for(const [name,item] of Object.entries(modern)) {
    if(!own(updated,name)) updated[name]={values:[]};
    updated[name].values=[...new Set([...updated[name].values,...item.values])];
  }
  for(const [name,item] of Object.entries(updated)) if(!/^[<@$+]/.test(name)&&(item.type||'property')==='property')
    item.values=[...new Set([...item.values,'inherit','initial','unset','revert','revert-layer'])];
  const aliases=Object.assign(Object.create(null),source.CSS_aliases,source[pre+'_aliases'],request.aliases);
  cached={legacy:index(merge(base,request.dictionary)),modern:index(merge(updated,request.dictionary)),aliases};
  cachedKey=key;return cached;
}
function segmentation(abbr) {
  const p={abbr,important:abbr.endsWith('!')};
  if(p.important) abbr=abbr.slice(0,-1);
  const m=/^([a-z$@+]?[a-z-]*[a-z]).*$/.exec(abbr);
  if(!m) return p;
  p.name=m[1]; let rest=abbr.slice(m[1].length);p.hasValue=!!rest;
  if(rest.startsWith(':')) {rest=rest.slice(1);if(!rest) p.keyword='';}
  if(!rest) return p;
  const dot=rest.indexOf('.'),end=dot>0?dot:99,hex=rest.slice(0,end);
  if(rest[0]==='#') {p.color=rest.slice(1,end);if(dot>0)p.alpha=rest.slice(dot);}
  if(/^[A-Z0-9.]+$/.test(rest)&&/^[\dA-F]+$/.test(hex)&&parseInt(hex,16)<=0xffffff) {
    p.color=hex;if(dot>0)p.alpha=rest.slice(dot);
  }
  const numericToken='[+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][+-]?\\d+)?[a-z%]*';
  if(new RegExp('^'+numericToken+'(?:-'+numericToken+'){1,3}$').test(rest)) {
    const tokens=[...rest.matchAll(new RegExp('(?:^|-)('+numericToken+')','g'))].map(m=>segmentation('x'+m[1]));
    if(tokens.every(t=>own(t,'number'))) {
      p.numbers=tokens;p.number=tokens[0].number;p.decimal=tokens[0].decimal;return p;
    }
  }
  const number=rest.replace(/[a-z%]+$/,'');
  if(number.trim() && /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(number)) {
    p.number=Number(number);p.decimal=!/^[+-]?\d+$/.test(number);
    if(rest!==number)p.unit=rest.slice(number.length);
  }
  if(!own(p,'color')&&!own(p,'number'))p.keyword=rest;
  return p;
}
function subsequence(string,abbr) {
  let at=0;string=string.toLowerCase();
  for(const c of abbr) {at=string.indexOf(c,at);if(at<0)return false;at++;}return true;
}
function score(a,b) {
  return (a.endsWith(' ')?3:0)+((a.slice(1,-1).includes('-')||b.slice(1,-1).includes('-'))?-2:0)
    +((a.slice(1,-1).includes(' ')||b.slice(1,-1).includes(' '))?-.5:0)+(a.endsWith('-')?1.05:0)
    +(a.length===1?1+(b.length===1?1:0):0);
}
// Preserve the original segmentation scores, including one-letter abbreviations.
function trees(word,abbr) {
  if(word.length<abbr.length)return [];
  let list=[[word[0],word.slice(1)]];
  for(let level=1;level<abbr.length;level++) {
    // The original Python loop iterates the prior list while replacing its result.
    const current=list;
    for(let t=0;t<current.length;t++) {
      const tr=current[t];
      if(level===1&&list.length===1)list=[];
      const last=tr.at(-1),lower=last.toLowerCase();
      for(let i=lower.indexOf(abbr[level]);i>=0;i=lower.indexOf(abbr[level],i+1))
        list.push(level===1?[tr[0]+last.slice(0,i),last.slice(i)]:[...tr.slice(0,-1),last.slice(0,i),last.slice(i)]);
      list=[...new Map(list.filter(v=>v.length===level+1).map(v=>[JSON.stringify(v),v])).values()];
    }
  }
  return list.filter(t=>t.every(s=>(s.match(/-/g)||[]).length<=1));
}
function choose(abbr,candidates,priorities=priority,scored=true) {
  candidates=[...new Set(candidates)];
  if(scored) {
    let best=-Infinity,found=[];
    for(const candidate of candidates)for(const tree of trees(candidate,abbr)) {
      let s=0;for(let i=1;i<tree.length;i++)s+=score(tree[i-1],tree[i]);
      if(s>best){best=s;found=[candidate];}else if(s===best)found.push(candidate);
    }
    if(found.length)candidates=[...new Set(found)];
  }
  const rank=c=>{const i=priorities.indexOf(c.split(' ')[0]);return i<0?priorities.length+1:i;};
  return candidates.sort((a,b)=>rank(a)-rank(b)||(a<b?-1:a>b?1:0))[0]||'';
}
function extract(input,data,aliases) {
  const p=segmentation(input);if(!p.name)return null;
  const abbrValue=p.hasValue&&!input.replace(/!$/,'').endsWith(':');
  let candidates=[];
  for(const [name,vals] of Object.entries(data.flat)) {
    if(own(p,'color')&&vals.includes('<color_values>'))candidates.push(name);
    if(own(p,'number')&&vals.some(v=>(p.decimal?['<length>','<number>','percentage']:['<integer>']).includes(v)))candidates.push(name);
  }
  if(p.keyword==='')candidates.push(...data.all);
  if(own(p,'keyword')) {
    candidates.push(...data.all.filter(c=>{const [prop,value]=c.split(' ');return value&&subsequence(prop,p.name.toLowerCase())&&subsequence(value,p.keyword.toLowerCase());}));
  } else if(!own(p,'color')||own(p,'number'))candidates.push(...data.all);
  if(p.numbers)candidates=candidates.filter(c=>/^(?:margin|padding|inset|border-radius|gap|margin-inline|margin-block|padding-inline|padding-block|inset-inline|inset-block|scroll-margin|scroll-padding|background-position|background-size)$/.test(c));
  // Cursor abbreviations must begin with cu (full cursor names also qualify).
  if(!p.name.toLowerCase().startsWith('cu'))candidates=candidates.filter(c=>c.split(' ')[0]!=='cursor');
  let abbr=(p.name+' '+(p.keyword||'')).trim();
  if(!aliases[p.important?input.slice(0,-1):input])abbr=(aliases[abbr]||abbr).replace(/:$/,'');
  const pair=Object.keys(aliases).find(a=>a.endsWith('...')&&abbr.startsWith(a.slice(0,-3)));
  let starts=pair?candidates.filter(c=>c.startsWith(aliases[pair])&&subsequence(c,abbr)):[];
  if(!starts.length)starts=candidates.filter(c=>c[0]===abbr[0]&&subsequence(c,abbr));
  if(own(p,'number')||p.keyword==='')starts=starts.filter(c=>!c.includes(' '));
  const picked=choose(abbr,starts);if(!picked)return null;
  const [name,value]=picked.split(' ');p.name=name;
  if(value!==undefined)p.keyword=value;
  const vals=data.flat[name]||[];
  if(!vals.includes('<color_values>'))delete p.color;
  if(!vals.some(v=>['<integer>','percentage','<length>','<number>','<alphavalue>'].includes(v)))delete p.number;
  if(!vals.includes(p.keyword))delete p.keyword;
  if(!own(p,'keyword')&&!own(p,'number')&&!own(p,'color')&&abbrValue)return null;
  p.default=defaultValue(data.dict,name);return p;
}
function numberText(p) {
  return p.decimal&&Number.isInteger(p.number)?p.number.toFixed(1):String(p.number);
}
function colorExpand(color,alpha=1) {
  if(!color)return '#';
  const hexAlpha=h=>Math.round(parseInt(h.length===1?h+h:h,16)/255*100)/100;
  switch(color.length) {
    case 1:color=color==='#'?'':color.repeat(3);break;
    case 2:color=(color[0]==='#'?color[1]:color).repeat(3);break;
    case 3:if(color[0]==='#')color=color.slice(1).repeat(3);break;
    case 4:if(color[0]!=='#'&&alpha===1){alpha=hexAlpha(color[3]);color=color.slice(0,3);}else return color;break;
    case 5:alpha=hexAlpha(color.slice(color[0]==='#'?4:3,5));color=color[0]==='#'?color.slice(1,4):color.slice(0,3);break;
    case 6:if(color[0]==='#'){alpha=hexAlpha(color.slice(4,5));color=color.slice(1,4);}break;
    case 7:color=color.slice(1);break;
    default:return color;
  }
  if(alpha==='.'||Number(alpha)<1) {
    if(alpha==='.')alpha='.__HAYAKU_ALPHA__';if(alpha==='.0'||alpha===0)alpha='0';
    if(color.length===3)color=[...color].map(c=>c+c).join('');
    return `rgba(${parseInt(color.slice(0,2),16)},${parseInt(color.slice(2,4),16)},${parseInt(color.slice(4),16)},${alpha})`;
  }
  return '#'+color;
}
function valueOf(p,data,o) {
  if(p.numbers)return p.numbers.map(t=>valueOf({...t,name:p.name,color:undefined},data,o)).join(' ');
  if(own(p,'keyword'))return p.keyword;
  const vals=data.flat[p.name]||[];
  if(vals.includes('<color_values>'))return colorExpand(p.color||'',p.alpha===undefined?1:p.alpha);
  if(vals.some(v=>v.startsWith('.'))) {
    if(!own(p,'number'))return '';
    if(p.number===0)return '0';
    let unit=p.decimal?(o.CSS_default_unit_decimal??'em'):(o.CSS_default_unit??'px');
    if(vals.includes('<number>')&&!o.CSS_units_for_unitless_numbers)unit='';
    if(p.unit) {
      const short='percents'.startsWith(p.unit)?'%':p.unit;
      unit=choose(short,vals.filter(v=>v.startsWith('.')).map(v=>v.slice(1)).filter(v=>subsequence(v,short)),
        ['em','ex','vw','vh','vmin','vmaxvm','ch','rem','px','cm','mm','in','pt','pc'],false)||short;
    }
    return numberText(p)+unit;
  }
  return own(p,'number')?numberText(p):'';
}
function restyle(value,o) {
  value=value.replace(/#([0-9a-fA-F]{3,6})/g,(_,color)=>{
    const casing=(o.CSS_colors_case||'').toLowerCase(),length=(o.CSS_colors_length||'').toLowerCase();
    if('uppercaseupper'.includes(casing))color=color.toUpperCase();else if('lowercaselower'.includes(casing))color=color.toLowerCase();
    if('shortshorthand'.includes(length)&&color.length===6&&color[0]===color[1]&&color[2]===color[3]&&color[4]===color[5])color=color[0]+color[2]+color[4];
    else if('longlonghand'.includes(length)&&color.length===3)color=[...color].map(c=>c+c).join('');
    return '#'+color;
  });
  const quote=o.CSS_syntax_quote_symbol;
  if(quote==="'"&&value.includes('"'))value=value.replaceAll('"',"'");
  else if(quote==='"'&&value.includes("'"))value=value.replaceAll("'",'"');
  else if(quote&&value.includes('url($1)'))value=value.replaceAll('url($1)',`url(${quote}$1${quote})`);
  return value.replaceAll('~',' ');
}
const escape = value=>value.replaceAll('\\','\\\\').replaceAll('$','\\$').replaceAll('}','\\}');
function expand(request={}) {
  const language=request.language||'css',ds=dictionaries(request);
  if(request.action==='metadata')return clone(ds.modern.dict[request.property]||{});
  if(request.action==='values')return [...new Set((ds.modern.flat[request.property]||[]).filter(v=>/^[a-z-]+$/.test(v)))];
  const abbr=request.abbr||'';if(!abbr||abbr.length>128)return null;
  const o={CSS_whitespace_after_colon:' ',CSS_syntax_no_semicolons:['sass','stylus'].includes(language),CSS_syntax_no_colons:language==='stylus',
    CSS_prefixes_align:!['sass','stylus'].includes(language),CSS_colors_case:'uppercase',CSS_colors_length:'short',CSS_syntax_quote_symbol:'"',CSS_clipboard_defaults:['colors','images']};
  for(const [k,v] of Object.entries(request.options||{}))o[k.replace(/^hayaku_/,'')]=v;
  let resolved=ds.aliases[abbr]||abbr;
  const originalName=segmentation(abbr).name;
  if(!ds.aliases[abbr]&&!own(ds.modern.dict,originalName)&&!own(ds.legacy.dict,originalName)) {
    const prefix=['mbm','of','ar','mi'].find(a=>{
      if(!abbr.startsWith(a)||!ds.aliases[a]?.endsWith(':'))return false;
      const suffix=abbr.slice(a.length),property=ds.aliases[a].slice(0,-1);
      if(a==='mi'&&/^[wh](?:$|[\d:.!+\-])/.test(suffix))return false;
      return !suffix||/^[\d:.!+\-]/.test(suffix)||
        (ds.modern.flat[property]||[]).some(v=>/^[a-z-]+$/.test(v)&&subsequence(v,suffix.replace(/!$/,'')));
    });
    if(prefix)resolved=ds.aliases[prefix]+abbr.slice(prefix.length).replace(/^:/,'');
  }
  resolved=resolved.replaceAll(': ',':');
  const name=segmentation(resolved).name;
  let data=ds.modern,p;
  if(!(own(ds.modern.dict,name)&&!own(ds.legacy.dict,name))) {p=extract(resolved,ds.legacy,ds.aliases);if(p)data=ds.legacy;}
  p=p||extract(resolved,data,ds.aliases);
  if(!p&&resolved.includes(':')) {
    const colon=resolved.indexOf(':');p=extract(resolved.slice(0,colon+1),data,ds.aliases);
    if(p)p.keyword=resolved.slice(colon+1);
  }
  if(!p)return null;
  let value=valueOf(p,data,o);
  const placeholder=!value||value==='#'||(value.startsWith('[')&&value.endsWith(']'));
  if(placeholder) {
    value=p.default??'';const clip=(request.clipboard||'').trim(),symbols=flatten(data.dict,p.name,true);
    if(symbols.includes('<color_values>')&&o.CSS_clipboard_defaults.includes('colors')&&/^(#?([a-fA-F\d]{3}|[a-fA-F\d]{6})|(rgb|hsl)a?\([^\)]+\))$/.test(clip))value=/^(#|rgb|hsl)/.test(clip)?clip:'#'+clip;
    if(symbols.includes('<url>')&&o.CSS_clipboard_defaults.includes('images')&&/^[^\s]+\.(jpg|jpeg|gif|png)$/.test(clip)){const q=(o.CSS_syntax_url_quotes??['sass','stylus'].includes(language))?o.CSS_syntax_quote_symbol:'';value='url('+q+clip+q+')';}
  }
  const templates={
    'linear-gradient()':'linear-gradient(${1:to bottom}, ${2:#000} ${3:0}, ${4:#FFF} ${5:100%})',
    'repeating-linear-gradient()':'repeating-linear-gradient(${1:to bottom}, ${2:#000} ${3:0}, ${4:#FFF} ${5:25%})',
    'radial-gradient()':'radial-gradient(${1:circle at center}, ${2:#000} ${3:0}, ${4:#FFF} ${5:100%})',
    'repeating-radial-gradient()':'repeating-radial-gradient(${1:circle at center}, ${2:#000} ${3:0}, ${4:#FFF} ${5:25%})',
    ...(o.CSS_function_snippets||{})
  };
  const functionSnippet=o.CSS_enable_function_snippets!==false&&templates[value];
  const alphaPlaceholder=own(p,'color')&&p.alpha==='.';
  value=escape(restyle(String(value),o));
  if(alphaPlaceholder)value=value.replace('__HAYAKU_ALPHA__','${1:5}');
  if(functionSnippet)value=functionSnippet;
  value=placeholder?'${1:'+value+'}':(o.CSS_enable_function_snippets===false?value:value.replace(/\b(rotate(?:X|Y|Z)?|skew(?:X|Y)?)\(\)/g,'$1(${1}${1/^(-?(?:[0-9]*\\.[0-9]+|[0-9]+))$/${1:+deg}/})')).replace('()','(${1})');
  if(o.CSS_syntax_url_quotes??['sass','stylus'].includes(language))value=value.replace('url(${1})','url('+o.CSS_syntax_quote_symbol+'${1}'+o.CSS_syntax_quote_symbol+')');
  const item=data.dict[p.name];let names=[p.name];
  if(!o.CSS_prefixes_disable) {
    let prefixes=item.prefixes||[];
    if(o.CSS_prefixes_only?.length)prefixes=prefixes.filter(v=>o.CSS_prefixes_only.includes(v));
    if(prefixes.length) {
      names=prefixes.map(v=>'-'+v+'-'+p.name);
      if(!item['no-unprefixed-property']&&!o.CSS_prefixes_no_unprefixed)names.push(p.name);
      if(o.CSS_prefixes_align){const max=Math.max(...names.map(n=>n.length));names=names.map(n=>n.padStart(max));}
    }
  }
  const colon=o.CSS_syntax_no_colons?'':':',sep=o.CSS_whitespace_after_colon||(colon?'':' '),end=o.CSS_syntax_no_semicolons?'':';';
  const snippet=names.map(n=>item.type==='function'?n+'('+value+')'+end:item.type==='at-rule'?n+' '+value:n+colon+sep+value+(p.important?' !important':'')+end).join('\n')+'$0'+(o.CSS_newline_after_expand?'\n':'');
  return {snippet,property:p.name,placeholder,postexpand:placeholder&&names.length===1&&!o.CSS_disable_postexpand,prefix:names[0]+colon+sep};
}
module.exports={expand};
