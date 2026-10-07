import sys,json,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str((root/'engine').resolve()))
from bridge import expand
from hayaku_dict_driver import get_css_dict
from modern_dictionary import modernize
cases=[]
def add(abbr,**kw):cases.append(dict(abbr=abbr,**kw))
for name,item in modernize(get_css_dict()[0]).items():
 if name.startswith('<'):continue
 for abbr in [name,''.join(p[0] for p in name.split('-') if p)]:
  add(abbr);add(abbr+'16');add(abbr+':')
 for v in item['values']:
  if v and v[0] not in '<.[':add(name+':'+v)
for language in ['css','scss','less','sass','stylus','postcss']:
 for abbr in ['mb16','fw200','fw600','fw450.5','ffs','w0','w10.0','w-.5','w1e2','w10rem','w100p','c#f','cFFFA','c#abc.','c#abc.2','c#abcdef','c#12345','c#12345678','trf:rotate()','bgi','c','w','p:r','@m','zzzz','unknown:value']:
  add(abbr,language=language)
for options in [{'CSS_prefixes_disable':True},{'CSS_prefixes_only':['moz'],'CSS_prefixes_align':False},{'CSS_colors_case':'lowercase','CSS_colors_length':'long'},{'CSS_syntax_quote_symbol':"'"},{'CSS_units_for_unitless_numbers':True},{'CSS_default_unit':'rem','CSS_default_unit_decimal':'px'},{'CSS_newline_after_expand':True,'CSS_disable_postexpand':True}]:
 for abbr in ['trf','w10','w.5','lh1.5','cA','bgi','usn']:add(abbr,options=options,clipboard='a.png')
for d in [{'width':{'values':['...','foo'],'default':'7px'}},{'color':{'values':['purple'],'remove_values':['red']}},{'custom-size':{'values':['<length>'],'default':'8px'}}]:
 for abbr in ['w','w16','c','custom-size','custom-size16']:add(abbr,dictionary=d)
unique={json.dumps(r,sort_keys=True):r for r in cases};cases=list(unique.values());print('cases',len(cases),flush=True)
records=[]
for r in cases:
 try: records.append({'request':r,'expected':expand(r)})
 except Exception as e: records.append({'request':r,'error':str(e)})
result=subprocess.run(['node',str(root/'scripts/compare-native.js')],input=json.dumps(records),text=True)
sys.exit(result.returncode)
