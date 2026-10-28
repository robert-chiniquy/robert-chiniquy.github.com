// Light rays in the dark frame around the page, on while <html> has
// data-rays (the Space key in js/keys.js). A WebGL2 canvas sits behind the
// page and redraws a few times a second.
//
// The shader is the underwater-rays part of a Ghostty terminal shader of mine,
// which adapts https://www.shadertoy.com/view/lljGDt. That shader's glitch
// and color-split passes act on the terminal's own image and are left out.
(function () {
  var root = document.documentElement;
  // Ghostty's time constants are tuned for a terminal left open for hours;
  // this runs them faster so the rays move while someone reads a page.
  var TIME_SCALE = 20;
  var FRAME_MS = 100;
  // When the rays come on they start still and speed up to TIME_SCALE over
  // this many seconds.
  var EASE_S = 12;
  // Canvas pixels per device pixel. The rays are soft, so a half-size canvas
  // scaled up looks the same.
  var SCALE = 0.5;

  var VERT = "#version 300 es\n" +
    "in vec2 p;\n" +
    "void main() { gl_Position = vec4(p, 0.0, 1.0); }\n";

  var FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;    // viewport in device pixels
uniform float uScale; // canvas pixels per device pixel
uniform float uTime;
uniform vec3 uFrame;  // the frame color the rays are added to
out vec4 outColor;

const vec3 PAL[8] = vec3[8](
  vec3(1.00, 0.00, 0.973),   // #ff00f8
  vec3(0.984, 0.718, 0.145), // #fbb725
  vec3(0.361, 0.925, 1.00),  // #5cecff
  vec3(1.00, 0.00, 0.973),
  vec3(0.361, 0.925, 1.00),
  vec3(0.361, 0.925, 1.00),
  vec3(0.753, 0.502, 0.816), // #c080d0
  vec3(0.670, 0.376, 0.929)  // #ab60ed
);

float hash21(vec2 p) {
  p = fract(p * vec2(233.34, 851.73));
  p += dot(p, p + 23.45);
  return fract(p.x * p.y);
}

// +/- 10% speed, drifting to a new random value about once a minute.
float speedVariance() {
  float s = uTime * 0.0167;
  float s0 = floor(s);
  float b = smoothstep(0.25, 0.75, fract(s));
  float r0 = fract(sin(s0 * 78.233 + 12.9898) * 43758.5453);
  float r1 = fract(sin((s0 + 1.0) * 78.233 + 12.9898) * 43758.5453);
  return 1.0 + (clamp(mix(r0, r1, b), 0.0, 1.0) - 0.5) * 0.2;
}

// Blend of the L2 and L1 norms, for angular ray ends.
float diamondLength(vec2 v) {
  return mix(length(v), (abs(v.x) + abs(v.y)) * 0.707, 0.3);
}

float rayStrength(vec2 src, vec2 dir, vec2 coord, float sa, float sb, float speed) {
  vec2 d = coord - src;
  float dist = diamondLength(d);
  float maxD = uRes.y * 3.5;
  float dr = clamp(dist / maxD, 0.0, 1.0);

  // Bend the ray sideways, more with distance from its source.
  vec2 perp = normalize(vec2(-d.y, d.x));
  float f = dist * 0.002 * (sa + sb) * 0.5 + uTime * speed * 0.5;
  float bend = (sin(f * 0.3) * 500.0 + cos(f * 0.51) * 250.0) * dr * dr;
  vec2 bd = coord + perp * bend - src;

  float ca = dot(normalize(bd), dir);
  float dither = hash21(coord) * 0.015 - 0.0075;
  float ph = ca * (sa + sb) * 0.1 * (1.0 + dr * 2.0) + uTime * speed;
  float ray = clamp(1.15 + 0.75 * sin(ph) + dither, 0.0, 1.0);

  float cut = clamp(0.55 + (fract(sa * 0.1 + sb * 0.07) - 0.5) * 0.4, 0.2, 0.9);
  ray = clamp((ray - cut) / (1.0 - cut), 0.0, 1.0);
  return ray * (1.0 - smoothstep(0.0, maxD, dist));
}

// Two rays from one source below the bottom edge that wanders slowly.
float rayMask(vec2 coord, float sv) {
  float t1 = uTime * 0.002;
  vec2 src = vec2(0.55, -0.35) * uRes + vec2(
    (sin(t1) + sin(t1 * 1.618) * 0.7) * uRes.x * 0.4,
    (sin(t1 * 0.7071) + cos(t1 * 1.2247) * 0.5) * uRes.y * 0.15);
  vec2 base = normalize(vec2(1.0, -0.06));
  float rot = uTime * 0.000007;
  float r = 0.0;
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float a = fi * 0.5 * 3.14159 * 0.4 - 0.2 * 3.14159 + rot;
    float c = cos(a);
    float s = sin(a);
    vec2 dir = vec2(base.x * c - base.y * s, base.x * s + base.y * c);
    float sa = 36.2214 + fi * 13.7;
    float sb = 21.11349 + fi * 7.3;
    float speed = (1.0 + fi * 0.1) * 0.0000015 * sv;
    float w = mix(0.8, 1.0, 1.0 - abs(fi - 0.5) / 2.0);
    r += w * rayStrength(src, dir, coord, sa, sb, speed);
  }
  r /= 2.0;
  // Terraced edges: five intensity steps, 70% stepped.
  r = mix(r, floor(r * 5.0) / 5.0, 0.7);
  return clamp(r, 0.0, 1.0);
}

vec3 rays(vec2 coord, float r) {
  // Neighbor intensities two device pixels away, from screen derivatives.
  float k = 2.0 * uScale;
  float dx = dFdx(r);
  float dy = dFdy(r);
  vec4 nb = clamp(vec4(r - dx * k, r + dx * k, r + dy * k, r - dy * k), 0.0, 1.0);

  // Diagonal stripes of palette colors that hold, then switch quickly.
  vec2 uv = coord / uRes;
  float h = fract(sin(floor(uTime * 0.001) * 12.9898) * 43758.5453);
  float sw = 0.5 + h * 1.5;
  float wave = sin(uv.x * 6.28318 + uTime * 0.014) * 0.08 +
               cos(uv.y * 4.71239 + uTime * 0.021) * 0.05;
  float ci = mod((uv.x + uv.y * 0.7 + wave) * sw + uTime * 0.0014, 8.0);
  int idx = int(floor(ci));
  float bl = fract(ci);
  float ts = 0.88 + fract(sin(float(idx) * 12.9898) * 43758.5453) * 0.08;
  bool switching = bl >= ts;
  if (switching) {
    float n = (bl - ts) / (1.0 - ts);
    bl = n * n * (3.0 - 2.0 * n);
  } else {
    bl = 0.0;
  }
  vec3 col = mix(PAL[idx % 8], PAL[(idx + 1) % 8], bl);
  if (switching) {
    float pp = uTime * 0.028 * 6.28318;
    float so = (uv.x * 2.0 + uv.y * 3.0) * 6.28318;
    float p1 = pow(sin(pp + so) * 0.5 + 0.5, 3.0);
    float p2 = pow(sin(pp * 1.618 + so * 0.618) * 0.5 + 0.5, 3.0);
    col *= 1.0 + max(p1, p2) * smoothstep(ts, 1.0, bl + ts) * 1.2;
  }
  col *= r;

  if (r >= 0.005) {
    float act = smoothstep(0.0, 0.02, r);

    // Beam depth: brighter edges, a highlight on one side, a darker core.
    float lu = (nb.x + nb.z) * 0.5;
    float rd = (nb.y + nb.w) * 0.5;
    float e = abs(lu - rd);
    float hl = smoothstep(0.0, 0.3, rd - lu + 0.30);
    float core = min(min(nb.x, nb.y), min(nb.z, nb.w)) * r;
    vec3 deep = col + col * e * 6.075 + vec3(1.0, 0.95, 0.9) * hl * e * 0.3;
    deep *= 1.0 - core * 2.43;
    col = mix(col, deep, act);

    // Intensity as a height field, lit from above right, with a warm
    // scatter term and rim light.
    vec3 n = normalize(vec3(-(nb.y - nb.x) * 4.0, -(nb.z - nb.w) * 4.0, 1.0));
    vec3 L = normalize(vec3(0.4, -0.6, 0.7));
    float diffuse = max(dot(n, L), 0.0) * 2.25;
    float back = max(dot(n, -L), 0.0);
    float rim = pow(1.0 - abs(n.z), 2.0) * 1.35;
    vec3 scatter = vec3(1.0, 0.85, 0.7) * r * 1.35 * (0.5 + back * 0.5);
    vec3 lit = col * (0.7 + diffuse * 0.6) + col * rim + scatter * r;
    col = mix(col, lit, act);
  }

  // Brighter toward the bottom, where the rays come from.
  return col * (0.35 + (1.0 - uv.y) * 0.65);
}

void main() {
  vec2 coord = gl_FragCoord.xy / uScale;
  vec2 uv = coord / uRes;
  float sv = speedVariance();
  float r = rayMask(coord, sv);
  vec3 c = rays(coord, r) * 0.45;

  // Slow vertical pulse.
  float gp = sin(uTime * 0.0001 + uv.y * 4.0) * 0.5 + 0.5;
  c *= 1.0 + gp * gp * 0.3;

  // Shimmer: a second color field mixed in where the rays are.
  float wd = sin(uv.x * 6.28318 + uTime * 0.000024) * 0.08 +
             cos(uv.y * 4.71239 + uTime * 0.000039) * 0.05;
  float cb = fract((uv.x + uv.y * 0.7 + wd) * 2.5 + uTime * 0.0000015);
  vec3 sh = mix(
    mix(vec3(0.36, 0.93, 1.0), PAL[7], smoothstep(0.0, 0.33, cb)),
    mix(vec3(0.98, 0.72, 0.15), vec3(1.0, 0.0, 0.6), smoothstep(0.33, 0.66, cb)),
    smoothstep(0.33, 1.0, cb));
  c = mix(c, sh, r * 0.4);

  // Ghostty dims this to about 0.38 to keep text over it readable; the frame
  // has no text, so only the slow brightness swing is kept.
  c = clamp(c, 0.0, 1.0) * (0.9 + sin(uTime * 0.0001) * 0.1);

  // Faint stepped spiral lines around the center.
  vec2 cen = uv - 0.5;
  float qa = floor(atan(cen.y, cen.x) * 4.0 / 3.14159) / 4.0 * 3.14159;
  float sp = qa + (abs(cen.x) + abs(cen.y)) * 1.16 + uTime * 0.000004 * sv;
  float pat = fract(sp * 3.0);
  float g = (step(0.92, pat) + step(pat, 0.08)) * 0.072;
  c += vec3(g * 0.8, g * 0.6, g);

  outColor = vec4(uFrame + c, 1.0);
}
`;

  var canvas = null;
  var gl = null;
  var loc = null;
  var timer = 0;
  // Shader time and the wall-clock moment it was last advanced, in seconds.
  var t = 0;
  var last = 0;
  var startedAt = 0;

  // Cubic ease in and out, 0 to 1.
  function ease(x) {
    x = Math.min(Math.max(x, 0), 1);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(s));
    }
    return s;
  }

  function setup() {
    canvas = document.createElement("canvas");
    canvas.className = "rays";
    canvas.setAttribute("aria-hidden", "true");
    gl = canvas.getContext("webgl2", { alpha: false, antialias: false });
    if (!gl) {
      canvas = null;
      return false;
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var p = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(p);
    gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
    loc = {
      res: gl.getUniformLocation(prog, "uRes"),
      scale: gl.getUniformLocation(prog, "uScale"),
      time: gl.getUniformLocation(prog, "uTime"),
      frame: gl.getUniformLocation(prog, "uFrame")
    };
    document.body.prepend(canvas);
    return true;
  }

  // The frame color (html's background) as 0..1 RGB, read each frame so a
  // theme switch with the d key carries over.
  function frameColor() {
    var probe = getComputedStyle(root).backgroundColor.match(/\d+(\.\d+)?/g);
    return [probe[0] / 255, probe[1] / 255, probe[2] / 255];
  }

  function draw() {
    var dpr = window.devicePixelRatio || 1;
    var w = Math.round(window.innerWidth * dpr * SCALE);
    var h = Math.round(window.innerHeight * dpr * SCALE);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    var now = Date.now() / 1000;
    t += (now - last) * TIME_SCALE * ease((now - startedAt) / EASE_S);
    last = now;
    gl.uniform2f(loc.res, window.innerWidth * dpr, window.innerHeight * dpr);
    gl.uniform1f(loc.scale, SCALE);
    gl.uniform1f(loc.time, t);
    gl.uniform3fv(loc.frame, frameColor());
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function tick() {
    if (!document.hidden) {
      draw();
    }
    timer = setTimeout(tick, FRAME_MS);
  }

  function sync() {
    var on = root.hasAttribute("data-rays");
    if (on && !canvas && !setup()) {
      return;
    }
    if (!canvas) {
      return;
    }
    canvas.hidden = !on;
    clearTimeout(timer);
    if (on) {
      // Start from wall-clock time, so the picture continues across page
      // loads instead of starting over, then ease the speed up from zero.
      last = startedAt = Date.now() / 1000;
      t = (last % 7200) * TIME_SCALE;
      tick();
    }
  }

  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ["data-rays"] });
  sync();
})();
