# -*- coding: utf-8 -*-
# АУДИТ СТАТИКА ДОМА (принят от владельца 2026-10-14, такт v11.44 «ИЗМЕРЕНО»).
# Статический обход всех .html: мета-атрибуты, ссылки, размеры, пре-кэш —
# признаки для док-аудита. Не заменяет прогон в браузере.
# Запуск: python3 ИНСТРУМЕНТЫ/аудит_статика_дома.py   (из корня клона репо)
import os,re,json,urllib.parse,collections,sys
root='.'
htmls=[]
for r,ds,fs in os.walk(root):
    if '.git' in r.split(os.sep) or 'node_modules' in r: continue
    for f in fs:
        if f.endswith('.html'): htmls.append(os.path.join(r,f))
rows=[];broken=collections.defaultdict(list);ext=collections.Counter()
def has(p,s,flags=re.I): return re.search(p,s,flags) is not None
for p in sorted(htmls):
    s=open(p,encoding='utf-8',errors='replace').read()
    size=len(s.encode('utf-8'))
    head=s[:20000]
    d={'file':p[2:],'KB':round(size/1024),
      'lang':has(r'<html[^>]*\blang=',head),
      'viewport':has(r'name=["\']viewport',head),
      'zoomblock':has(r'user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?[,"\' ]',head),
      'title':has(r'<title>[^<]{3,}',head),
      'desc':has(r'name=["\']description',head),
      'csp':has(r'http-equiv=["\']Content-Security-Policy',head),
      'h1':len(re.findall(r'<h1[\s>]',s,re.I)),
      'main':has(r'<main[\s>]|role=["\']main',s),
      'img':len(re.findall(r'<img\b',s,re.I)),
      'img_noalt':len([m for m in re.findall(r'<img\b[^>]*>',s,re.I) if not re.search(r'\balt=',m,re.I)]),
      'btn':len(re.findall(r'<button\b',s,re.I)),
      'reduced_motion':has(r'prefers-reduced-motion',s),
      'focus_visible':has(r':focus-visible',s),
      'aria_live':has(r'aria-live|role=["\'](status|alert)',s),
      'skip':has(r'class=["\'][^"\']*skip|href=["\']#(main|content|осн)',s),
      'blank_norel':len([m for m in re.findall(r'<a\b[^>]*target=["\']_blank["\'][^>]*>',s,re.I) if not re.search(r'noopener|noreferrer',m,re.I)]),
      'inline_on':len(re.findall(r'\son(click|change|input|submit|keydown)=',s,re.I)),
      'eval':len(re.findall(r'\beval\(|new Function\(',s)),
      'innerHTML':len(re.findall(r'\.innerHTML\s*=',s)),
      'tabidx_pos':len(re.findall(r'tabindex=["\']?[1-9]',s,re.I)),
      'inline_js_KB':round(sum(len(x) for x in re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>',s,re.S|re.I))/1024),
      'ext_script':[],
      }
    for m in re.findall(r'<script[^>]*\bsrc=["\']([^"\']+)',s,re.I):
        if m.startswith('http'):
            h=urllib.parse.urlparse(m).netloc; d['ext_script'].append(h); ext[h]+=1
    sri=len([m for m in re.findall(r'<script[^>]*\bsrc=["\']https?://[^>]*>',s,re.I) if 'integrity=' in m])
    d['ext_no_sri']=len(d['ext_script'])-sri
    rows.append(d)
    # links
    base=os.path.dirname(p)
    for m in re.findall(r'(?:href|src)=["\']([^"\'#?]+)',s,re.I):
        if re.match(r'(https?:|mailto:|tel:|data:|blob:|javascript:|//)',m): continue
        t=urllib.parse.unquote(m)
        tp=os.path.normpath(os.path.join(base,t)) if not t.startswith('/') else os.path.normpath('.'+t)
        if not os.path.exists(tp): broken[p[2:]].append(m)
json.dump({'rows':rows,'broken':{k:sorted(set(v)) for k,v in broken.items()},'ext':ext},open('/tmp/audit.json','w'),ensure_ascii=False)
n=len(rows)
def cnt(k): return sum(1 for r in rows if r[k])
print('HTML-страниц:',n,' суммарно MB',round(sum(r['KB'] for r in rows)/1024,1))
for k,lab in [('lang','html lang'),('viewport','viewport'),('title','title'),('desc','meta description'),('csp','CSP-мета'),('main','<main>'),('reduced_motion','prefers-reduced-motion'),('focus_visible',':focus-visible'),('aria_live','aria-live/status'),('skip','skip-link')]:
    print(f'{lab:26} {cnt(k):3}/{n}')
print('блок масштаба (user-scalable=no/max-scale=1):',cnt('zoomblock'))
print('без h1:',sum(1 for r in rows if r['h1']==0),' >1 h1:',sum(1 for r in rows if r['h1']>1))
print('img без alt:',sum(r['img_noalt'] for r in rows),'из',sum(r['img'] for r in rows))
print('_blank без rel:',sum(r['blank_norel'] for r in rows),' inline on*=:',sum(r['inline_on'] for r in rows),' eval/Function:',sum(r['eval'] for r in rows),' innerHTML=:',sum(r['innerHTML'] for r in rows),' tabindex>0:',sum(r['tabidx_pos'] for r in rows))
print('внешние скрипты:',dict(ext),' без SRI:',sum(r['ext_no_sri'] for r in rows))
print('--- 12 самых тяжёлых страниц (KB, inline-JS KB)')
for r in sorted(rows,key=lambda r:-r['KB'])[:12]: print(r['KB'],r['inline_js_KB'],r['file'])
print('--- страницы без каких-либо ключевых мета:')
for r in rows:
    miss=[k for k in('lang','viewport','title','desc','csp') if not r[k]]
    if miss: print(r['file'],miss)
print('--- битые локальные ссылки/ресурсы:',sum(len(set(v)) for v in broken.values()),'в',len(broken),'страницах')
for k,v in list(broken.items())[:15]: print(k,sorted(set(v))[:4])
