"""Build a conservative Hayaku overlay from a pinned vscode-custom-data checkout.
Usage: python3 scripts/update_dictionary.py /path/to/vscode-custom-data
The generated data is checked in; no network access occurs at extension runtime.
"""
import json
import re
import subprocess
import sys
from pathlib import Path
root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1]).resolve()
data = json.loads((source/'web-data/data/browsers.css-data.json').read_text())
props = {p['name']: p for p in data['properties']}
eligible = {n:p for n,p in props.items() if re.fullmatch(r'[a-z][a-z-]*',n)
            and p.get('status','standard') == 'standard'}
types = {'length':['<length>'], 'length-percentage':['<dimension>'],
         'percentage':['<percentage>'], 'number':['<number>'], 'integer':['<integer>'],
         'color':['<color_values>'],
         # CSS Fonts 4: normal | bold | <number [1,1000]>.
         'font-weight-absolute':['<number>']}
def values(name, seen=()):
    if name in seen or name not in props:
        return []
    p=props[name]
    syntax=p.get('syntax','')
    result=[v['name'] for v in p.get('values',[]) if re.fullmatch(r'[a-z][a-z-]*',v['name'])
            and v.get('status','standard')=='standard']
    for ref in re.findall(r"<'([a-z-]+)'>",syntax):
        result.extend(values(ref,(*seen,name)))
    # Only literal keywords outside type references/functions.
    literal=re.sub(r'<[^>]*>',' ',syntax)
    literal=re.sub(r'[a-z-]+\([^)]*\)',' ',literal)
    result.extend(re.findall(r'(?<![\w-])[a-z][a-z-]*(?![\w-])',literal))
    for kind in re.findall(r'<([a-z-]+)(?:\s[^>]*)?>',syntax):
        result.extend(types.get(kind,[]))
    for kind in p.get('restrictions',[]):
        result.extend(types.get(kind,[]))
    # Grid track grammars use named nonterminals rather than direct lengths.
    if name in ('grid-template-columns','grid-template-rows','grid-auto-columns','grid-auto-rows'):
        result.extend(['<dimension>','.fr'])
    return list(dict.fromkeys(result))
overlay={n:{'values':values(n)} for n in sorted(eligible)}
units='rex cap rcap rch ic ric lh rlh vi vb svw svh svi svb svmin svmax lvw lvh lvi lvb lvmin lvmax dvw dvh dvi dvb dvmin dvmax cqw cqh cqi cqb cqmin cqmax q'.split()
overlay['<length>']={'values':['.'+u for u in units]}
revision=subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()
out={'source':'https://github.com/microsoft/vscode-custom-data','revision':revision,
     'policy':'Unprefixed standard properties, simple keywords and supported numeric/color types; no new function templates.',
     'properties':overlay}
(root/'engine/dictionaries/modern_CSS_dictionary.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
(root/'THIRD_PARTY_LICENSES.txt').write_text('vscode-custom-data — '+revision+'\n\n'+(source/'LICENSE').read_text())
print(f'Generated {len(eligible)} standard property entries.')
