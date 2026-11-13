import * as THREE from 'three';

/**
 * Ocean.js
 * ----------------------------------------------------------------------
 * A performance-friendly stylized ocean: a single large plane whose
 * vertices are displaced by layered sine waves in a custom vertex
 * shader, combined with a fresnel-ish rim color and gentle scrolling
 * highlight band in the fragment shader. This avoids expensive FFT
 * water simulation while still reading as "animated, reflective ocean".
 */
export class Ocean {
  constructor(size = 800) {
    this.size = size;
    this.uniforms = {
      uTime: { value: 0 },
      uShallowColor: { value: new THREE.Color('#3fd0e0') },
      uDeepColor: { value: new THREE.Color('#0a4f66') },
      uFoamColor: { value: new THREE.Color('#eaffff') }
    };

    const geometry = new THREE.PlaneGeometry(size, size, 160, 160);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      vertexShader: /* glsl */ `
        uniform float uTime;
        varying float vHeight;
        varying vec2 vUv;

        void main() {
          vUv = uv;
          vec3 pos = position;
          float wave1 = sin(pos.x * 0.05 + uTime * 1.1) * 0.6;
          float wave2 = cos(pos.z * 0.08 + uTime * 0.8) * 0.4;
          float wave3 = sin((pos.x + pos.z) * 0.03 + uTime * 0.5) * 0.5;
          float h = wave1 + wave2 + wave3;
          pos.y += h;
          vHeight = h;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uShallowColor;
        uniform vec3 uDeepColor;
        uniform vec3 uFoamColor;
        uniform float uTime;
        varying float vHeight;
        varying vec2 vUv;

        void main() {
          float mixFactor = smoothstep(-1.0, 1.0, vHeight);
          vec3 base = mix(uDeepColor, uShallowColor, mixFactor);

          // Scrolling highlight bands to fake glinting sunlight on water.
          float glint = sin(vUv.x * 60.0 + uTime * 1.5) * sin(vUv.y * 60.0 - uTime * 1.2);
          glint = smoothstep(0.85, 1.0, glint);
          vec3 color = mix(base, uFoamColor, glint * 0.5);

          gl_FragColor = vec4(color, 0.88);
        }
      `
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'Ocean';
    this.mesh.position.y = -0.4;
  }

  update(dt) {
    this.uniforms.uTime.value += dt;
  }
}
