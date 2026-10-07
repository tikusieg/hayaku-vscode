"""Append modern CSS data without reordering legacy values or changing defaults."""
import copy
import json
from pathlib import Path

DATA = json.loads((Path(__file__).parent/'dictionaries/modern_CSS_dictionary.json').read_text())
GLOBAL_VALUES = ['inherit', 'initial', 'unset', 'revert', 'revert-layer']

def modernize(original):
    dictionary = copy.deepcopy(original)
    for name, item in DATA['properties'].items():
        if name not in dictionary:
            dictionary[name] = {'values': []}
        old = dictionary[name]['values']
        old.extend(v for v in item['values'] if v not in old)
    for name, item in dictionary.items():
        if not name.startswith(('<', '@', '$', '+')) and item.get('type','property') == 'property':
            item['values'].extend(v for v in GLOBAL_VALUES if v not in item['values'])
    return dictionary
