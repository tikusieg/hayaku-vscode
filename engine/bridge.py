"""JSON transport for the unchanged MIT Hayaku parsing engine."""
import json
import re
import sys
from modern_dictionary import modernize
from hayaku_probe import extract, segmentation
from hayaku_dict_driver import get_css_dict, merge_dict, merge_aliases, get_values_by_property
from hayaku_templates import generate_result_object, align_prefix, restyle_snippet, COMPLEX_COLOR_REGEX, IMAGE_REGEX

def escape(text):
    return str(text).replace('\\', '\\\\').replace('$', '\\$').replace('}', '\\}')

def expand(request):
    language = request.get('language', 'css')
    preprocessor = dict(scss='SCSS', less='Less', sass='Sass', stylus='Stylus', postcss='PostCSS').get(language)
    dictionary, aliases = get_css_dict(preprocessor=preprocessor)
    legacy_dictionary = merge_dict(dictionary, request.get('dictionary', {}))
    dictionary = merge_dict(modernize(dictionary), request.get('dictionary', {}))
    aliases = merge_aliases(aliases, request.get('aliases', {}))
    options = dict(CSS_whitespace_after_colon=' ', CSS_syntax_no_semicolons=language in ('sass', 'stylus'),
                   CSS_syntax_no_colons=language == 'stylus', CSS_prefixes_align=language not in ('sass', 'stylus'),
                   CSS_colors_case='uppercase', CSS_colors_length='short',
                   CSS_syntax_quote_symbol='"', CSS_clipboard_defaults=['colors', 'images'])
    options.update({k.removeprefix('hayaku_'): v for k,v in request.get('options', {}).items()})
    options.update(dict=dictionary, aliases=aliases)
    if request.get('action') == 'values':
        return get_values_by_property(request['property'], dictionary)
    abbr = request.get('abbr', '')
    if not abbr or len(abbr) > 128:
        return None
    # Preserve successful legacy fuzzy matches; exact new property names take precedence.
    resolved = aliases.get(abbr, abbr).replace(': ', ':')
    parts = segmentation(resolved)
    name = parts.get('property-name', parts.get('property-value', ''))
    exact_new = name in dictionary and name not in legacy_dictionary
    legacy_options = dict(options, dict=legacy_dictionary)
    legacy_input = dict(abbr=resolved, options=legacy_options)
    if not exact_new and extract(legacy_input):
        result = generate_result_object(dict(abbr=abbr, options=legacy_options))
    else:
        result = generate_result_object(dict(abbr=abbr, options=options))
    if not result:
        return None
    value = result['value']
    placeholder = isinstance(value, dict)
    if placeholder:
        default = value.get('default', '')
        clip = request.get('clipboard', '').strip()
        if '<color_values>' in value.get('symbols', []) and 'colors' in options['CSS_clipboard_defaults'] and COMPLEX_COLOR_REGEX.match(clip):
            default = clip if clip.startswith(('#','rgb','hsl')) else '#' + clip
        if '<url>' in value.get('symbols', []) and 'images' in options['CSS_clipboard_defaults'] and IMAGE_REGEX.match(clip):
            default = 'url("' + clip + '")'
        value = default
    value = restyle_snippet(str(value), options)
    # VS Code does not implement Sublime's conditional regex snippet syntax.
    if placeholder:
        snippet_value = '${1:' + escape(value) + '}'
    elif '()' in value:
        snippet_value = escape(value).replace('()', '(${1})', 1)
    else:
        snippet_value = escape(value)
    names = (result['property'],)
    if not options.get('CSS_prefixes_disable'):
        names = align_prefix(result['property'], result.get('prefixes', []),
                             result.get('no-unprefixed-property', False) or options.get('CSS_prefixes_no_unprefixed', False),
                             options['CSS_prefixes_align'], options.get('CSS_prefixes_only', []))
    colon = '' if options['CSS_syntax_no_colons'] else ':'
    separator = options['CSS_whitespace_after_colon'] or (' ' if not colon else '')
    end = '' if options['CSS_syntax_no_semicolons'] else ';'
    important = ' !important' if result.get('important') else ''
    kind = result['type']
    def render(name):
        if kind == 'function':
            return name + '(' + snippet_value + ')' + end
        if kind == 'at-rule':
            return name + ' ' + snippet_value
        return name + colon + separator + snippet_value + important + end
    snippet = '\n'.join(render(name) for name in names) + '$0'
    if options.get('CSS_newline_after_expand'):
        snippet += '\n'
    return dict(snippet=snippet, property=result['property'], placeholder=placeholder, postexpand=placeholder and len(names) == 1 and not options.get('CSS_disable_postexpand'), prefix=names[0] + colon + separator)

if __name__ == '__main__':
    try:
        print(json.dumps(expand(json.load(sys.stdin))))
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
