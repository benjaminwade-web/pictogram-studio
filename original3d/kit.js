// 3D plumbing for original films: renderer, post effects, text textures. No models, palettes or looks live here.
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const FinishShader = { // film grain, vignette and a little chromatic fringe, all from uniforms
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, grain: { value: 0.05 }, vignette: { value: 0.35 }, fringe: { value: 0.0015 }, tint: { value: [1, 1, 1] } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, grain, vignette, fringe; uniform vec3 tint; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + time*7.0) * 43758.5453); }
    void main(){ vec2 c = vUv - 0.5; float d = length(c);
      vec3 col = vec3(texture2D(tDiffuse, vUv + c*fringe).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - c*fringe).b);
      col *= tint; col *= 1.0 - vignette * smoothstep(0.25, 0.85, d); col += (h(vUv*1000.0) - 0.5) * grain; gl_FragColor = vec4(col, 1.0); }` };

export function makeKit(THREE, S, W, H) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setSize(W, H, false); renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const k = { THREE, S, W, H, renderer, scene: null, camera: null, composer: null, passes: {}, t: 0, RoundedBoxGeometry, mergeGeometries };
  // call once after making scene and camera. opts: {bloom:{strength,radius,threshold}, dof:{focus,aperture,maxblur}, grain, vignette, fringe}
  k.setup = (scene, camera, o = {}) => {
    k.scene = scene; k.camera = camera; const comp = new EffectComposer(renderer); comp.setSize(W, H); comp.setPixelRatio(1);
    comp.addPass(new RenderPass(scene, camera));
    if (o.dof) { k.passes.dof = new BokehPass(scene, camera, { focus: o.dof.focus || 10, aperture: o.dof.aperture || 0.002, maxblur: o.dof.maxblur || 0.01 }); comp.addPass(k.passes.dof); }
    if (o.bloom) { k.passes.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), o.bloom.strength ?? 0.4, o.bloom.radius ?? 0.5, o.bloom.threshold ?? 0.85); comp.addPass(k.passes.bloom); }
    comp.addPass(new OutputPass());
    k.passes.finish = new ShaderPass(FinishShader); Object.assign(k.passes.finish.uniforms.grain, { value: o.grain ?? 0.05 }); k.passes.finish.uniforms.vignette.value = o.vignette ?? 0.35; k.passes.finish.uniforms.fringe.value = o.fringe ?? 0.0015; comp.addPass(k.passes.finish);
    k.composer = comp;
  };
  k.focus = (dist, aperture) => { if (!k.passes.dof) return; k.passes.dof.uniforms.focus.value = dist; if (aperture != null) k.passes.dof.uniforms.aperture.value = aperture; };
  k.renderFrame = t => { if (k.passes.finish) k.passes.finish.uniforms.time.value = t % 10; k.composer ? k.composer.render() : renderer.render(k.scene, k.camera); };
  // a canvas texture with text or any 2D drawing: draw(ctx, w, h)
  k.canvasTexture = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; return tx; };
  k.rng = S.rng;
  return k;
}
