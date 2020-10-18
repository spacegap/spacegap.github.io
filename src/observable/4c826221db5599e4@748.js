// https://observablehq.com/@nicola/fake-transparency-for-3d-surfaces@748
import define1 from './a82f06f54ea1d92b@1656.js'

export default function define (runtime, observer) {
  const main = runtime.module()
  main
    .variable(observer('viewof regl'))
    .define('viewof regl', ['createREGL', 'invalidation'], function (
      createREGL,
      invalidation
    ) {
      console.log('reloaded')
      const pixelRatio = devicePixelRatio
      const w = 280
      const h = 500
      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(w * pixelRatio)
      canvas.height = Math.floor(h * pixelRatio)
      canvas.style.width = `${120}px`
      canvas.style.height = `${125}px`
      const regl = createREGL({
        canvas,
        pixelRatio,
        extensions: ['OES_standard_derivatives'],
        optionalExtensions: ['OES_element_index_uint']
      })
      canvas.value = regl
      invalidation.then(() => regl.destroy())
      return canvas
    })
  main
    .variable(observer('regl'))
    .define('regl', ['Generators', 'viewof regl'], (G, _) => G.input(_))
  main.variable(observer('time')).define('time', function () {
    return 3
  })
  main.variable(observer()).define(function () {
    return window.scrollY
  })
  main.variable(observer('opacity')).define('opacity', function () {
    return 0.85
  })
  main.variable(observer('passes')).define('passes', function () {
    return ['Solid surface pass', 'Fake transparency pass']
  })
  main.variable(observer('gridOpacity')).define('gridOpacity', function () {
    return 0
  })
  main.variable(observer('gridWidth')).define('gridWidth', function () {
    return 0.5
  })
  main
    .variable(observer('cartoonEdgeWidth'))
    .define('cartoonEdgeWidth', function () {
      return 2.5
    })
  main
    .variable(observer('cartoonEdgeOpacity'))
    .define('cartoonEdgeOpacity', function () {
      return 1
    })
  main.variable(observer('specular')).define('specular', function () {
    return 1
  })
  main
    .variable(observer())
    .define(
      [
        'camera',
        'buffers',
        'opacity',
        'specular',
        'cartoonEdgeWidth',
        'cartoonEdgeOpacity',
        'gridWidth',
        'gridOpacity',
        'regl',
        'setUniforms',
        'passes',
        'drawMesh',
        'invalidation'
      ],
      function (
        camera,
        buffers,
        opacity,
        specular,
        cartoonEdgeWidth,
        cartoonEdgeOpacity,
        gridWidth,
        gridOpacity,
        regl,
        setUniforms,
        passes,
        drawMesh,
        invalidation
      ) {
        camera.taint()
        const meshProps = {
          buffers,
          opacity,
          specular,
          cartoonEdgeWidth,
          cartoonEdgeOpacity,
          gridWidth,
          gridOpacity
        }
        const frame = regl.frame(() => {
          camera(({ dirty }) => {
            if (!dirty) return
            setUniforms(() => {
              regl.clear({ color: [1, 1, 1, 1] })

              // Draw the solid surface
              if (~passes.indexOf('Solid surface pass')) {
                drawMesh({ ...meshProps, solidPass: true })
              }

              // The second pass with only the wireframe and edges
              if (~passes.indexOf('Fake transparency pass')) {
                drawMesh({ ...meshProps, solidPass: false })
              }
            })
          })
        })
        invalidation.then(() => frame.cancel())
      }
    )
  main
    .variable(observer('createREGL'))
    .define('createREGL', ['require'], function (require) {
      return require('regl')
    })
  main
    .variable(observer('mesh'))
    .define('mesh', ['meshFromFunction'], function (meshFromFunction) {
      return meshFromFunction((u, v) => [u, v], {
        resolution: [151, 151],
        uDomain: [0, 1.5],
        vDomain: [-Math.PI, Math.PI],
        uPeriodic: false,
        vPeriodic: true
      })
    })
  main
    .variable(observer('drawMesh'))
    .define('drawMesh', ['regl'], function (regl) {
      return regl({
        vert: `
    precision highp float;
    attribute vec2 uv;
    uniform mat4 projection, view;
    varying vec3 vPosition, vNormal;
    varying vec2 vUV;
    uniform float time;

    // Our function!
    vec3 f(vec2 uv) {
      float r2 = dot(uv, uv);
      float s = 8.0 * sqrt(r2);
      float t = time * 4.0;
      return vec3(
        uv.x,
        -4.0 / sqrt(t*t+ s * s),
        uv.y
      );
    }

    void main () {
      vUV = uv.x * vec2(cos(uv.y), sin(uv.y));
      vPosition = f(vUV);

      // We differentiate the surface numerically to get the partial
      // derivative wrt u and v, then take the cross product to get
      // the surface normal.
      float dx = 1e-2;
      vec3 dpdu = f(vUV + vec2(dx, 0)) - vPosition;
      vec3 dpdv = f(vUV + vec2(0, dx)) - vPosition;
      vNormal = normalize(cross(dpdu, dpdv));

      gl_Position = projection * view * vec4(vPosition, 1);
    }
  `,
        frag: `
    #extension GL_OES_standard_derivatives : enable
    precision highp float;
    varying vec3 vPosition, vNormal;
    uniform vec3 eye;
    uniform bool solidPass;
    varying vec2 vUV;
    uniform float pixelRatio, opacity, cartoonEdgeWidth, gridOpacity, specular, cartoonEdgeOpacity, gridWidth;

    // This function implements a constant-width grid as a function of
    // a two-dimensional input. This makes it possible to draw a grid
    // which does not line up with the triangle edges.
    // from: https://github.com/rreusser/glsl-solid-wireframe
    float gridFactor (vec2 parameter, float width, float feather) {
      float w1 = width - feather * 0.5;
      vec2 d = fwidth(parameter);
      vec2 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
      vec2 a2 = smoothstep(d * w1, d * (w1 + feather), looped);
      return min(a2.x, a2.y);
    }

    void main () {
      vec3 normal = normalize(vNormal);

      // The dot product of the view direction and surface normal.
      float vDotN = abs(dot(normal, normalize(vPosition - eye)));

      // We divide vDotN by its gradient magnitude in screen space to
      // give a function which goes roughly from 0 to 1 over a single
      // pixel right at glancing angles. i.e. cartoon edges!
      float cartoonEdge = smoothstep(0.75, 1.25, vDotN / fwidth(vDotN) / (cartoonEdgeWidth * pixelRatio));

      // Combine the gridlines and cartoon edges
      float grid = gridFactor(vUV * 10.0, 0.5 * gridWidth * pixelRatio, 0.5);
      float combinedGrid = max(cartoonEdgeOpacity * (1.0 - cartoonEdge), gridOpacity * (1.0 - grid));

      if (solidPass) {
        // If the surface pass, we compute some shading
        float shade = 0.2 + mix(1.2, specular * pow(vDotN, 3.0), 0.5);
        vec3 colorFromNormal = (0.5 - (gl_FrontFacing ? 1.0 : -1.0) * 0.5 * normal);
        vec3 baseColor = gl_FrontFacing ? vec3(12.0/255.0, 80.0/255.0, 255.0/255.0) : vec3(255.0/255.0, 116.0/255.0, 241.0/255.0);

        vec3 color = shade * mix(
            baseColor,
            colorFromNormal,
            0.0
          );
        // Apply the gridlines
        color = mix(color, vec3(0), opacity * combinedGrid);
        gl_FragColor = vec4(pow(color, vec3(0.454)), 1.0);
      } else {
        // If the wireframe pass, we just draw black lines with some alpha
        gl_FragColor = vec4(
          // To get the opacity to mix ~correctly, we use reverse-add blending mode
          // so that white here shows up as black gridlines. This could be simplified
          // by doing a bit more math to get the mixing right with just additive blending.
          vec3(1),
          (1.0 - opacity) * combinedGrid
        );

        if (gl_FragColor.a < 1e-3) discard;
      }
    }
  `,
        primitive: 'triangles',
        uniforms: {
          solidPass: regl.prop('solidPass'),
          opacity: regl.prop('opacity'),
          cartoonEdgeWidth: regl.prop('cartoonEdgeWidth'),
          cartoonEdgeOpacity: regl.prop('cartoonEdgeOpacity'),
          gridOpacity: regl.prop('gridOpacity'),
          gridWidth: regl.prop('gridWidth'),
          specular: regl.prop('specular')
        },
        attributes: {
          uv: regl.prop('buffers.uv')
        },
        depth: {
          enable: regl.prop('solidPass')
        },
        blend: {
          enable: (ctx, props) => !props.solidPass,
          func: {
            srcRGB: 'src alpha',
            srcAlpha: 1,
            dstRGB: 1,
            dstAlpha: 1
          },
          equation: {
            rgb: 'reverse subtract',
            alpha: 'add'
          }
        },
        elements: regl.prop('buffers.elements')
      })
    })
  main
    .variable(observer('setUniforms'))
    .define('setUniforms', ['regl', 'time'], function (regl, time) {
      return regl({
        uniforms: {
          projection: regl.context('projection'),
          view: regl.context('view'),
          eye: regl.context('eye'),
          pixelRatio: regl.context('pixelRatio'),
          time: (ctx, context) => time
        }
      })
    })
  main
    .variable(observer('buffers'))
    .define('buffers', ['regl', 'mesh', 'invalidation'], function (
      regl,
      mesh,
      invalidation
    ) {
      const uv = regl.buffer(mesh.positions.flat())
      const elements = regl.elements(mesh.cells.flat())
      invalidation.then(() => {
        uv.destroy()
        elements.destroy()
      })
      return { uv, elements }
    })
  main
    .variable(observer('meshFromFunction'))
    .define('meshFromFunction', function () {
      return function meshFromFunction (surfaceFn, opts) {
        let i, j, u, v
        opts = opts || {}

        const res = opts.resolution === undefined ? 11 : opts.resolution
        const nbUFaces = Array.isArray(opts.resolution)
          ? opts.resolution[0]
          : res
        const nbVFaces = Array.isArray(opts.resolution)
          ? opts.resolution[1]
          : res

        const uDomain = opts.uDomain === undefined ? [0, 1] : opts.uDomain
        const vDomain = opts.vDomain === undefined ? [0, 1] : opts.vDomain

        let nbBoundaryAdjustedUFaces = nbUFaces
        let nbBoundaryAdjustedVFaces = nbVFaces
        if (!opts.vPeriodic) nbBoundaryAdjustedUFaces += 1
        if (!opts.uPeriodic) nbBoundaryAdjustedVFaces += 1

        const positions = []
        const cells = []

        for (i = 0; i < nbBoundaryAdjustedUFaces; i++) {
          u = uDomain[0] + ((uDomain[1] - uDomain[0]) * i) / nbUFaces
          for (j = 0; j < nbBoundaryAdjustedVFaces; j++) {
            v = vDomain[0] + ((vDomain[1] - vDomain[0]) * j) / nbVFaces
            positions.push(surfaceFn(u, v))
          }
        }

        var faceIndex = 0
        for (i = 0; i < nbUFaces; i++) {
          var iPlusOne = i + 1
          if (opts.vPeriodic) iPlusOne = iPlusOne % nbUFaces
          for (j = 0; j < nbVFaces; j++) {
            var jPlusOne = j + 1
            if (opts.uPeriodic) jPlusOne = jPlusOne % nbVFaces

            cells.push([
              i + nbBoundaryAdjustedUFaces * j,
              iPlusOne + nbBoundaryAdjustedUFaces * j,
              iPlusOne + nbBoundaryAdjustedUFaces * jPlusOne
            ])

            cells.push([
              i + nbBoundaryAdjustedUFaces * j,
              iPlusOne + nbBoundaryAdjustedUFaces * jPlusOne,
              i + nbBoundaryAdjustedUFaces * jPlusOne
            ])
          }
        }

        return { positions, cells }
      }
    })
  main
    .variable(observer('camera'))
    .define('camera', ['createReglCamera', 'regl', 'phi'], function (
      createReglCamera,
      regl,
      phi
    ) {
      const camera = createReglCamera(regl, {
        distance: 10,
        phi: phi,
        theta: 0
      })
      // createInteractions(camera);
      return camera
    })
  main.variable(observer('phi')).define('phi', function () {
    return 0.0
  })
  const child1 = runtime.module(define1)
  main.import('createReglCamera', child1)
  main.import('createInteractions', child1)
  main.variable(observer('LICENSE')).define('LICENSE', function () {
    return 'mit'
  })
  return main
}
