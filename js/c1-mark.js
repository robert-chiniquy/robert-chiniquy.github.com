// Fills the C1 mark in each .c1-mark with slowly moving bands of C1's brand
// colors, the way c1.ai draws its logo with shaders. The <img> inside stays
// as the fallback and keeps the alt text; its alpha becomes the shader's mask.
// One still frame when the system asks for reduced motion.
(function () {
  var FRAME_MS = 50;

  var VERT = "#version 300 es\n" +
    "in vec2 p;\n" +
    "void main() { gl_Position = vec4(p, 0.0, 1.0); }\n";

  var FRAG = `#version 300 es
precision highp float;
uniform sampler2D uMask;
uniform vec2 uRes;
uniform float uTime;
out vec4 outColor;

// Electric Pink, Power Orange, Dark Teal, Brand Violet.
const vec3 PAL[4] = vec3[4](
  vec3(1.0, 0.573, 0.922),
  vec3(0.992, 0.388, 0.0),
  vec3(0.0, 0.204, 0.227),
  vec3(0.392, 0.129, 1.0)
);

vec3 palette(float x) {
  float p = fract(x) * 4.0;
  int i = int(p);
  return mix(PAL[i], PAL[(i + 1) % 4], smoothstep(0.0, 1.0, fract(p)));
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float a = texture(uMask, uv).a;
  vec2 p = uv * 2.0 - 1.0;
  float t = uTime * 0.15;
  // Warp the plane, then read the palette along the diagonal with a ring
  // moving out from the center.
  p += 0.25 * vec2(sin(p.y * 3.0 + t * 1.3), cos(p.x * 2.5 - t));
  float x = 0.35 * (p.x + p.y) + 0.12 * sin(length(p) * 4.0 - t * 2.0) + t * 0.1;
  outColor = vec4(palette(x) * a, a);
}
`;

  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(s));
    }
    return s;
  }

  function start(box) {
    var img = box.querySelector("img");
    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    var gl = canvas.getContext("webgl2", { premultipliedAlpha: true });
    if (!gl) {
      return;
    }
    var dpr = window.devicePixelRatio || 1;
    var w = Math.round(img.clientWidth * dpr);
    var h = Math.round(img.clientHeight * dpr);
    canvas.width = w;
    canvas.height = h;

    // The mark at canvas size; only its alpha is used.
    var mask = document.createElement("canvas");
    mask.width = w;
    mask.height = h;
    mask.getContext("2d").drawImage(img, 0, 0, w, h);

    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
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

    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform2f(gl.getUniformLocation(prog, "uRes"), w, h);
    var time = gl.getUniformLocation(prog, "uTime");
    gl.viewport(0, 0, w, h);

    var visible = true;
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }).observe(box);

    function draw() {
      gl.uniform1f(time, (Date.now() / 1000) % 3600);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function tick() {
      if (visible && !document.hidden) {
        draw();
      }
      setTimeout(tick, FRAME_MS);
    }

    box.append(canvas);
    box.classList.add("c1-mark--drawn");
    if (still) {
      draw();
    } else {
      tick();
    }
  }

  document.querySelectorAll(".c1-mark").forEach(function (box) {
    var img = box.querySelector("img");
    if (img.complete) {
      start(box);
    } else {
      img.addEventListener("load", function () {
        start(box);
      });
    }
  });
})();
