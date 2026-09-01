#!/usr/bin/env python3
"""
check_app.py — Chequeo estático para AssendApp (v2)

Detecta (sin necesitar navegador):
  1. Funciones llamadas en onclick="..." que NO existen en script.js
  2. document.getElementById('X') donde 'X' no aparece como id="X" en
     NINGÚN archivo del proyecto — ni en el HTML estático, ni dentro de
     plantillas de HTML embebidas en el propio script.js
  3. Paréntesis / llaves desbalanceadas en script.js

Uso:
    cd /home/Shmuel/ofi
    python3 check_app.py
"""

import re
import sys
import argparse
import glob
import os

def leer(path):
    with open(path, encoding='utf-8', errors='replace') as f:
        return f.read()

def extraer_funciones_definidas(js):
    nombres = set(re.findall(r'\bfunction\s+([A-Za-z_$][\w$]*)\s*\(', js))
    nombres |= set(re.findall(r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?function\s*\(', js))
    nombres |= set(re.findall(r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>', js))
    return nombres

PALABRAS_CLAVE_JS = {
    'if','for','while','switch','return','typeof','new','delete','void',
    'function','async','await','else','do','try','catch','finally',
    'throw','instanceof','in','of','yield','let','const','var','class',
    'this','super','null','true','false','undefined',
}

def extraer_llamadas_onclick(texto):
    llamadas = []
    patron_attr = re.compile(r'on(?:click|touchstart|touchend|change|input|mousedown|mouseup)\s*=\s*"([^"]*)"')
    patron_llamada_pura = re.compile(r'^\s*([A-Za-z_$][\w$]*)\s*\(')
    for m in patron_attr.finditer(texto):
        cuerpo = m.group(1)
        for parte in cuerpo.split(';'):
            fm = patron_llamada_pura.match(parte)
            if fm:
                nombre = fm.group(1)
                if nombre not in PALABRAS_CLAVE_JS and not nombre.startswith('_'):
                    llamadas.append(nombre)
    return llamadas

def extraer_getbyid(texto):
    return re.findall(r"getElementById\(\s*['\"]([^'\"]+)['\"]\s*\)", texto)

def extraer_ids_definidos(texto):
    return set(re.findall(r'\bid\s*=\s*["\']([^"\']+)["\']', texto))

def extraer_ids_creados_dinamicamente(js):
    return set(re.findall(r"\.id\s*=\s*['\"]([^'\"]+)['\"]", js))

def chequear_balance(js):
    pares = {'(': ')', '{': '}', '[': ']'}
    cierre_a_apertura = {v: k for k, v in pares.items()}
    pila = []
    en_string = None
    en_comentario_linea = False
    en_comentario_bloque = False
    i = 0
    n = len(js)
    linea = 1
    problemas = []
    while i < n:
        c = js[i]
        if c == '\n':
            linea += 1
            en_comentario_linea = False
        if en_comentario_linea:
            i += 1; continue
        if en_comentario_bloque:
            if c == '*' and i+1 < n and js[i+1] == '/':
                en_comentario_bloque = False
                i += 2; continue
            i += 1; continue
        if en_string:
            if c == '\\':
                i += 2; continue
            if c == en_string:
                en_string = None
            i += 1; continue
        if c == '/' and i+1 < n and js[i+1] == '/':
            en_comentario_linea = True; i += 2; continue
        if c == '/' and i+1 < n and js[i+1] == '*':
            en_comentario_bloque = True; i += 2; continue
        if c == '/' and i+1 < n and js[i+1] not in ('/', '*'):
            j = i - 1
            while j >= 0 and js[j] in ' \t':
                j -= 1
            anterior = js[j] if j >= 0 else ''
            if anterior in ('(', ',', '=', ':', ';', '[', '!', '&', '|', '?', '\n', '') or js[max(0,j-6):j+1].strip().endswith('return'):
                k = i + 1
                escaped = False
                dentro_clase = False
                while k < n:
                    ck = js[k]
                    if escaped:
                        escaped = False
                    elif ck == '\\':
                        escaped = True
                    elif ck == '[':
                        dentro_clase = True
                    elif ck == ']':
                        dentro_clase = False
                    elif ck == '/' and not dentro_clase:
                        break
                    elif ck == '\n':
                        break
                    k += 1
                if k < n and js[k] == '/':
                    i = k + 1
                    continue
        if c in ("'", '"', '`'):
            en_string = c; i += 1; continue
        if c in pares:
            pila.append((c, linea))
        elif c in cierre_a_apertura:
            if not pila:
                problemas.append(f"línea ~{linea}: cierre '{c}' sin apertura correspondiente")
            elif pila[-1][0] != cierre_a_apertura[c]:
                apertura, linea_ap = pila.pop()
                problemas.append(f"línea ~{linea}: se esperaba cierre de '{apertura}' (abierto en línea {linea_ap}), pero se encontró '{c}'")
            else:
                pila.pop()
        i += 1
    for apertura, linea_ap in pila:
        problemas.append(f"línea ~{linea_ap}: '{apertura}' nunca se cerró")
    return problemas

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--js', default=None)
    ap.add_argument('--html', default=None)
    args = ap.parse_args()

    js_path = args.js or _buscar('public/js/script.js', 'js/script.js', 'script.js')
    html_paths = []
    if args.html:
        html_paths = glob.glob(args.html)
    else:
        for candidato in ['public/index.html', 'index.html']:
            if os.path.isfile(candidato):
                html_paths = [candidato]
                break

    if not js_path or not os.path.isfile(js_path):
        print(f"❌ No encontré script.js. Usa --js RUTA")
        sys.exit(1)
    if not html_paths:
        print(f"❌ No encontré index.html. Usa --html RUTA")
        sys.exit(1)

    js = leer(js_path)
    html = leer(html_paths[0])

    print(f"📄 JS:   {js_path}")
    print(f"📄 HTML: {html_paths[0]}")
    print()

    print("═" * 60)
    print("1) BALANCE DE LLAVES/PARÉNTESIS en script.js")
    print("═" * 60)
    problemas_balance = chequear_balance(js)
    if not problemas_balance:
        print("✅ Todo balanceado correctamente.")
    else:
        print(f"⚠️  {len(problemas_balance)} problema(s):")
        for p in problemas_balance[:20]:
            print("   -", p)
        print("\n   (si esto sale pero la app funciona bien en el navegador, probablemente")
        print("    es un patrón raro que confunde al contador. Trátalo como pista, no certeza.)")
    print()

    print("═" * 60)
    print("2) FUNCIONES onclick/ontouchstart/etc. QUE NO EXISTEN")
    print("═" * 60)
    definidas = extraer_funciones_definidas(js)
    llamadas_html = extraer_llamadas_onclick(html)
    llamadas_js = extraer_llamadas_onclick(js)
    todas_llamadas = set(llamadas_html) | set(llamadas_js)

    faltantes = sorted(n for n in todas_llamadas if n not in definidas)
    if not faltantes:
        print("✅ Todas las funciones usadas en onclick existen en script.js.")
    else:
        print(f"⚠️  {len(faltantes)} función(es) llamadas pero NO definidas:")
        for f in faltantes:
            print(f"   - {f}(...)")
        print("\n   (revisa si es un typo, o si la función vive en otro archivo .js que no analicé)")
    print()

    print("═" * 60)
    print("3) getElementById('...') CON ID QUE NO APARECE EN NINGÚN LADO")
    print("═" * 60)
    ids_definidos = extraer_ids_definidos(html) | extraer_ids_definidos(js)
    ids_dinamicos = extraer_ids_creados_dinamicamente(js)
    ids_usados = extraer_getbyid(js)

    huerfanos = sorted(set(i for i in ids_usados if i not in ids_definidos and i not in ids_dinamicos))
    if not huerfanos:
        print("✅ Todos los ids usados existen (en HTML, en plantillas de JS, o se crean dinámicamente).")
    else:
        print(f"⚠️  {len(huerfanos)} id(s) que de verdad no encontré en ningún lado:")
        for i in huerfanos:
            print(f"   - '{i}'")
    print()

    print("═" * 60)
    total = len(problemas_balance) + len(faltantes) + len(huerfanos)
    if total == 0:
        print("✅ TODO LIMPIO — no se encontraron problemas.")
    else:
        print(f"⚠️  TOTAL: {total} cosa(s) para revisar (ver detalle arriba).")
    print("═" * 60)

def _buscar(*candidatos):
    for c in candidatos:
        if os.path.isfile(c):
            return c
    return None

if __name__ == '__main__':
    main()
