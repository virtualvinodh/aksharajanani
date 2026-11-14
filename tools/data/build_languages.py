"""Build data/languages.json for the "Don't see your language?" picker.

For every language CLDR lists (one entry per language, plus script variants such as
Serbian (Latin)), it records the letters the language uses, its occasional letters,
extra punctuation, the guide font for its writing system and a sample sentence.

Sources (download them first; nothing is fetched from unicode.org):
  - CLDR JSON:  npm pack cldr-misc-full cldr-localenames-full   (letters, names)
  - UDHR in Unicode: https://github.com/eric-muller/udhr          (sample sentences, Article 1)
  - Noto fonts: https://github.com/notofonts/notofonts.github.io  (guide fonts; fetched from
    jsdelivr at NOTO_COMMIT and cached in --font-cache, used to see where marks sit)

Usage:
  uv run -q --with fonttools python3 tools/data/build_languages.py \
      --cldr-misc <cldr-misc-full>/main --cldr-names <cldr-localenames-full>/main \
      --udhr <udhr>/data/udhr --font-cache <dir> --out data/languages.json
"""
import argparse
import json
import os
import re
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter

from fontTools import unicodedata as fud
from fontTools.ttLib import TTFont

NOTO_COMMIT = '4cf78353cd1668040ba8efa13029cd910fcdf9e2'  # the commit the built-in scripts' guide fonts use
NOTO_BASE = f'https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io@{NOTO_COMMIT}/fonts'

# Writing systems with thousands of letters; drawing them by hand isn't practical here.
SKIP_SCRIPTS = {'Hani', 'Hira', 'Kana', 'Hang', 'Yiii', 'Brai', 'Zyyy', 'Zinh', 'Zzzz'}
MAX_LETTERS = 400

# Writing systems where letters join or combine into new shapes that this picker can't build.
COMPLEX_SCRIPTS = {
    'Arab', 'Syrc', 'Nkoo', 'Mong', 'Adlm', 'Rohg', 'Mand',
    'Beng', 'Deva', 'Guru', 'Gujr', 'Orya', 'Taml', 'Telu', 'Knda', 'Mlym', 'Sinh',
    'Mymr', 'Khmr', 'Tibt', 'Java', 'Bali', 'Sund', 'Cakm', 'Mtei', 'Lana', 'Lepc',
    'Limb', 'Batk', 'Bugi', 'Newa', 'Sylo', 'Tirh', 'Takr', 'Shrd', 'Gong', 'Gonm',
}

# Fonts whose family name doesn't follow "NotoSans" + script name.
NOTO_FAMILY_OVERRIDES = {'Latn': 'NotoSans', 'Grek': 'NotoSans', 'Cyrl': 'NotoSans', 'Nkoo': 'NotoSansNKo'}

# Other English names people search by, besides CLDR's own "-alt-" names.
ALIASES = {
    'bn': ['Bengali'], 'or': ['Oriya'], 'fa': ['Farsi'], 'fil': ['Tagalog'], 'km': ['Cambodian'],
    'my': ['Myanmar'], 'pa': ['Panjabi'], 'mni': ['Meitei', 'Meetei'], 'sat': ['Santhali'],
    'ff': ['Fulani', 'Pulaar'], 'fy': ['Frisian'], 'gd': ['Gaelic'], 'se': ['Sami', 'Saami'],
    'ckb': ['Sorani'], 'el': ['Hellenic'], 'nl': ['Flemish'], 'ms': ['Malaysian', 'Bahasa Melayu'],
    'id': ['Bahasa Indonesia'], 'sw': ['Kiswahili'], 'zgh': ['Berber', 'Amazigh'], 'tzm': ['Berber', 'Amazigh'],
    'kab': ['Berber', 'Amazigh'], 'shi': ['Berber', 'Amazigh'], 'yi': ['Jewish'], 'ti': ['Tigrigna'],
    'ja': ['Hiragana', 'Katakana', 'Kana', 'Nihongo', '日本語', 'ひらがな', 'カタカナ'],
}

# Languages kept with only part of their letters: Japanese as kana (hiragana and katakana).
# The sample is the iroha poem, which uses every kana once, in both.
KANA_ONLY = {
    'ja': {
        'name': 'Japanese (kana)',
        'native': '日本語（かな）',
        'sample': 'いろはにほへと ちりぬるを わかよたれそ つねならむ\n'
                  'うゐのおくやま けふこえて あさきゆめみし ゑひもせす\n'
                  'イロハニホヘト チリヌルヲ ワカヨタレソ ツネナラム\n'
                  'ウヰノオクヤマ ケフコエテ アサキユメミシ ヱヒモセス',
    },
}
KANA_FONT_URL = '/fonts/NotoSansJPKana-Regular.ttf'

LOCALE_RE =re.compile(r'^[a-z]{2,3}(-[A-Z][a-z]{3})?$')


def parse_uset(s):
    """Parse a CLDR exemplar set like "[aà b {dž} \\- a-c]" into a list of strings."""
    s = (s or '').strip()
    if not s:
        return []
    assert s[0] == '[' and s[-1] == ']', s
    body = s[1:-1]
    out, i = [], 0

    def read_char(i):
        if body[i] == '\\':
            if body[i + 1] == 'u':
                return chr(int(body[i + 2:i + 6], 16)), i + 6
            if body[i + 1] == 'U':
                return chr(int(body[i + 2:i + 10], 16)), i + 10
            return body[i + 1], i + 2
        return body[i], i + 1

    while i < len(body):
        c = body[i]
        if c.isspace():
            i += 1
            continue
        if c == '{':
            j = body.index('}', i)
            seq, k = '', i + 1
            while k < j:
                ch, k = read_char(k)
                seq += ch
            out.append(seq)
            i = j + 1
            continue
        ch, i = read_char(i)
        if i < len(body) - 1 and body[i] == '-' and not body[i + 1].isspace():
            end, i = read_char(i + 1)
            out.extend(chr(x) for x in range(ord(ch), ord(end) + 1))
        else:
            out.append(ch)
    return out


def flatten(tokens):
    """Single code points, in order, without repeats. A sequence such as {ẹ́} or {dž}
    contributes its parts: the picker offers letters and marks, not sequences."""
    seen, out = set(), []
    for tok in tokens:
        # NFC first, so a sequence with a precomposed form becomes that one letter.
        for p in unicodedata.normalize('NFC', tok):
            if unicodedata.category(p) in ('Cf', 'Cc', 'Zs', 'Co', 'Cn'):
                continue
            if p not in seen:
                seen.add(p)
                out.append(p)
    return out


def main_script(chars):
    counts = Counter(fud.script(c) for c in chars if unicodedata.category(c).startswith('L'))
    for code in ('Zyyy', 'Zinh'):
        counts.pop(code, None)
    return counts.most_common(1)[0][0] if counts else None


def ot_tag(script):
    tags = fud.ot_tags_from_script(script)
    return tags[0].strip() if tags else None


def noto_family(script, available):
    if script in NOTO_FAMILY_OVERRIDES:
        return NOTO_FAMILY_OVERRIDES[script]
    want = 'notosans' + re.sub(r'[^a-z]', '', fud.script_name(script).lower())
    for fam in available:
        if fam.lower() == want:
            return fam
    want_serif = want.replace('notosans', 'notoserif', 1)
    for fam in available:
        if fam.lower() == want_serif:
            return fam
    return None


def font_url(family):
    return f'{NOTO_BASE}/{family}/hinted/ttf/{family}-Regular.ttf'


def fetch_font(family, cache):
    """Download the family's regular font (hinted if there is one). Returns (path, url) or (None, None)."""
    os.makedirs(cache, exist_ok=True)
    path = os.path.join(cache, f'{family}-Regular.ttf')
    if os.path.exists(path) and os.path.exists(path + '.url'):
        return path, open(path + '.url').read().strip()
    for url in (font_url(family), font_url(family).replace('/hinted/', '/unhinted/')):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                data = r.read()
        except Exception:
            continue
        with open(path, 'wb') as f:
            f.write(data)
        with open(path + '.url', 'w') as f:
            f.write(url)
        return path, url
    return None, None


def mark_position(ch, font):
    """Where a combining mark sits: 'above', 'aboveRight', 'below', 'belowAttached' or 'overlay'."""
    ccc = unicodedata.combining(ch)
    if ccc == 1:
        return 'overlay'
    if ccc == 8:  # kana voicing marks ゛ ゜ (が = か + ゛), at the letter's top right
        return 'aboveRight'
    if ccc == 202:  # attached below, e.g. cedilla, ogonek
        return 'belowAttached'
    if ccc in (216, 232):  # attached / above right, e.g. the horn of ơ
        return 'aboveRight'
    if ccc in (7, 9, 233) or 200 <= ccc <= 224 and ccc != 214:
        return 'below'
    if ccc == 214 or ccc >= 226:
        return 'above'
    # Class 0 or a fixed-position class (Hebrew points, Thai, Indic signs): look at the guide font.
    if font is not None:
        cmap = font.getBestCmap()
        name = cmap.get(ord(ch))
        if name and 'glyf' in font:
            g = font['glyf'][name]
            if getattr(g, 'numberOfContours', 0):
                g.recalcBounds(font['glyf'])
                upm = font['head'].unitsPerEm
                if g.yMax <= upm * 0.05:
                    return 'below'
                if g.yMin >= upm * 0.35:
                    return 'above'
                return 'overlay'
    name = unicodedata.name(ch, '')
    return 'below' if 'BELOW' in name else 'above'


def udhr_article1(udhr_dir):
    """bcp47 tag -> (stage, Article 1 text)."""
    idx = open(os.path.join(udhr_dir, 'index.xml'), encoding='utf-8').read()
    out = {}
    for m in re.finditer(r'<udhr ([^>]*)/>', idx):
        a = dict(re.findall(r"(\S+)='([^']*)'", m.group(1)))
        tag, f = a.get('bcp47'), a.get('f')
        stage = int(a.get('stage') or 0)
        if not tag or not f or stage < 3:
            continue
        path = os.path.join(udhr_dir, f'udhr_{f}.xml')
        if not os.path.exists(path):
            continue
        try:
            root = ET.parse(path).getroot()
        except ET.ParseError:
            continue
        ns = {'u': 'http://efele.net/udhr'}
        art = root.find("u:article[@number='1']", ns)
        if art is None:
            continue
        paras = [''.join(p.itertext()).strip() for p in art.findall('u:para', ns)]
        text = ' '.join(p for p in paras if p)
        if not text or '[missing]' in text:
            continue
        if tag not in out or stage > out[tag][0]:
            out[tag] = (stage, text)
    return out


def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cldr-misc', required=True)
    ap.add_argument('--cldr-names', required=True)
    ap.add_argument('--udhr', required=True)
    ap.add_argument('--font-cache', required=True)
    ap.add_argument('--noto-list', required=True, help='GitHub contents listing of notofonts.github.io/fonts (JSON)')
    ap.add_argument('--kana-font', default='public/fonts/NotoSansJPKana-Regular.ttf')
    ap.add_argument('--basic', default='data/characters_basic.json')
    ap.add_argument('--out', default='data/languages.json')
    args = ap.parse_args()

    available = [x['name'] for x in load_json(args.noto_list)]
    basic = {c['name'] for s in load_json(args.basic) for c in s.get('characters', [])}
    en_names = load_json(os.path.join(args.cldr_names, 'en', 'languages.json'))['main']['en']['localeDisplayNames']['languages']
    en_scripts = load_json(os.path.join(args.cldr_names, 'en', 'scripts.json'))['main']['en']['localeDisplayNames']['scripts']
    samples = udhr_article1(args.udhr)

    languages, used_scripts, used_marks = [], {}, {}
    for code in sorted(os.listdir(args.cldr_misc)):
        if not LOCALE_RE.match(code):
            continue
        path = os.path.join(args.cldr_misc, code, 'characters.json')
        if not os.path.exists(path):
            continue
        chars = list(load_json(path)['main'].values())[0]['characters']
        main_tokens = parse_uset(chars.get('exemplarCharacters'))
        letters = flatten(main_tokens)
        kana = code in KANA_ONLY
        if kana:
            # Japanese without its ~2,100 kanji: a kana font, used next to another font for kanji.
            # CLDR interleaves them (あアぃィ…); list all hiragana, then all katakana.
            letters = sorted((c for c in letters if fud.script(c) in ('Hira', 'Kana') or c == 'ー'), key=ord)
        if not letters or len(letters) > MAX_LETTERS:
            continue
        script = 'Kana' if kana else main_script(letters)
        if not script or (script in SKIP_SCRIPTS and not kana):
            continue
        more = [c for c in flatten(parse_uset(chars.get('auxiliary'))) if c not in letters]
        # Occasional letters from another writing system (e.g. Han in Vietnamese) aren't useful here.
        more = [c for c in more if fud.script(c) in (script, 'Zinh', 'Zyyy') and not unicodedata.category(c).startswith('N')]
        punct = [c for c in flatten(parse_uset(chars.get('punctuation'))) if c not in basic and not unicodedata.category(c).startswith('L')]
        index = flatten(parse_uset(chars.get('index')))
        caps = any(c != c.lower() for c in index) if index else False

        base, _, script_sub = code.partition('-')
        name = en_names.get(code) or en_names.get(base)
        if not name:
            continue
        if script_sub and code not in en_names:
            name = f"{name} ({en_scripts.get(script_sub, script_sub)})"
        native = None
        own = os.path.join(args.cldr_names, code, 'languages.json')
        if os.path.exists(own):
            own_names = list(load_json(own)['main'].values())[0]['localeDisplayNames']['languages']
            native = own_names.get(code) or own_names.get(base)
        if native and native.lower() == name.lower():
            native = None

        # This language's own translation, or failing that one in the same language and writing system
        # (e.g. 'sr-Cyrl' for 'sr'); never one in another writing system.
        candidates = [samples.get(code), samples.get(base)] + [v for k, v in sorted(samples.items()) if k.split('-')[0] == base]
        sample = next((v for v in candidates if v and main_script(list(v[1])) == script), None)
        if kana:
            name, native, sample = KANA_ONLY[code]['name'], KANA_ONLY[code]['native'], (0, KANA_ONLY[code]['sample'])

        also = ALIASES.get(base, []) + [v for k, v in en_names.items() if k.split('-alt-')[0] in (code, base) and '-alt-' in k]
        entry = {'code': code, 'name': name}
        if also:
            entry['also'] = sorted(set(a for a in also if a != name))
        if native:
            entry['native'] = native
        entry['script'] = script
        entry['letters'] = ''.join(letters)
        if more:
            entry['more'] = ''.join(more)
        if punct:
            entry['punct'] = ''.join(punct)
        if caps:
            entry['caps'] = True
        if sample:
            entry['sample'] = sample[1]
        languages.append(entry)
        used_scripts.setdefault(script, set()).add(code)
        for c in letters + more:
            for part in unicodedata.normalize('NFD', c):
                if unicodedata.category(part) in ('Mn', 'Me'):
                    used_marks.setdefault(part, script)

    # 'no' and 'nb' (Norwegian / Norwegian Bokmål) carry the same letters: keep the more
    # specific entry and let the shorter name find it.
    by_letters = {}
    for e in languages:
        by_letters.setdefault((e['letters'], e.get('more'), e['script']), []).append(e)
    dropped = set()
    for group in by_letters.values():
        for a in group:
            for b in group:
                if a is not b and b['name'].startswith(a['name'] + ' ') and a['code'] not in dropped:
                    b.setdefault('also', []).append(a['name'])
                    dropped.add(a['code'])
    languages = [e for e in languages if e['code'] not in dropped]

    scripts = {}
    fonts = {}
    for script in sorted(used_scripts):
        fam = noto_family(script, available)
        info = {'name': en_scripts.get(script, fud.script_name(script).replace('_', ' '))}
        tag = ot_tag(script)
        if tag:
            info['ot'] = tag
        if script == 'Kana':
            # Noto Sans JP is ~5 MB of mostly kanji; the app ships a kana-only copy (public/fonts/).
            info['name'] = 'Hiragana and katakana'
            info['font'] = {'fontName': 'Noto Sans JP Kana', 'fontUrl': KANA_FONT_URL}
            fonts[script] = TTFont(args.kana_font)
        elif fam:
            path, url = fetch_font(fam, args.font_cache)
            if path:
                info['font'] = {'fontName': ' '.join(re.findall(r'[A-Z][a-z]*', fam)), 'fontUrl': url}
                fonts[script] = TTFont(path)
        if script in COMPLEX_SCRIPTS:
            info['complex'] = True
        if fud.script_horizontal_direction(script, 'LTR') == 'RTL':
            info['rtl'] = True
        scripts[script] = info

    marks = {m: mark_position(m, fonts.get(s)) for m, s in sorted(used_marks.items())}

    out = {
        'source': 'CLDR 49 (exemplar characters), UDHR in Unicode (Article 1), Noto fonts',
        'scripts': scripts,
        'marks': marks,
        'languages': sorted(languages, key=lambda e: e['name']),
    }
    with open(args.out, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print(f"{len(languages)} languages, {len(scripts)} writing systems, {len(marks)} marks, "
          f"{sum(1 for e in languages if 'sample' in e)} with a sample sentence -> {args.out}")


if __name__ == '__main__':
    main()
