"""Compile and link the actual shader pairs in Chromium WebGL2, without Three.js.
This checks genuine GPU driver compilation; it does not replace full app testing.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, sys
r = Path(__file__).resolve().parents[1]
sh = r/'src/graphics/shaders'
noise = (sh/'noise4d.glsl').read_text()
v_a = (sh/'artifact.vert.glsl').read_text().replace('#include "./noise4d.glsl"',noise)
f_a = (sh/'artifact.frag.glsl').read_text()
v_p = (sh/'particles.vert.glsl').read_text()
f_p = (sh/'particles.frag.glsl').read_text()
vertex_preamble = '''
precision highp float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
attribute vec3 position;
attribute vec2 uv;
'''
script='''(source) => {
 const canvas = document.querySelector('canvas');
 const gl = canvas.getContext('webgl2', {alpha:true});
 if (!gl) return {available:false,reason:'No WebGL2 context'};
 const outcomes=[];
 for (const pair of source.pairs) {
   const stages=[];
   for(const [kind,raw] of [['vertex', source.preamble + pair.vertex],['fragment',pair.fragment]]) {
     const shader = gl.createShader(kind==='vertex'?gl.VERTEX_SHADER:gl.FRAGMENT_SHADER);
     gl.shaderSource(shader, raw); gl.compileShader(shader);
     stages.push({kind, shader, success:gl.getShaderParameter(shader,gl.COMPILE_STATUS),log:gl.getShaderInfoLog(shader)});
   }
   let linked = false; let linkLog='';
   if(stages.every(s=>s.success)) {
     const program=gl.createProgram();
     gl.attachShader(program, stages[0].shader); gl.attachShader(program, stages[1].shader);
     gl.linkProgram(program);
     linked=gl.getProgramParameter(program,gl.LINK_STATUS);
     linkLog=gl.getProgramInfoLog(program);
     gl.deleteProgram(program);
   }
   outcomes.push({name:pair.name, linked, linkLog, stages:stages.map(({kind,success,log})=>({kind,success,log}))});
   stages.forEach(s=>gl.deleteShader(s.shader));
 }
 return {available:true, outcomes, vendor:gl.getParameter(gl.VERSION)};
}'''
with sync_playwright() as p:
  browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
  page=browser.new_page()
  page.set_content('<!doctype html><html><body><canvas width="256" height="256"></canvas></body></html>')
  result=page.evaluate(script,{'preamble':vertex_preamble,'pairs':[{'name':'artifact','vertex':v_a,'fragment':f_a},{'name':'particles','vertex':v_p,'fragment':f_p}]})
  print(json.dumps(result,indent=2))
  browser.close()
  if not result.get('available'):
    print('UNVERIFIED: Chromium WebGL2 context unavailable',file=sys.stderr)
    sys.exit(2)
  if not all(x['linked'] for x in result['outcomes']): sys.exit(1)
