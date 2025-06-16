const vertexShaderSource = `
attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_position * 0.5 + 0.5;
}
`;

const fragmentShaderSource = `
precision mediump float;
uniform float iTime;
uniform vec2 iResolution;
uniform sampler2D iChannel0;
varying vec2 v_texCoord;

vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
    return mod289(((x*34.0)+1.0)*x);
}

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 uv = v_texCoord;
    float time = iTime * 0.5;

    if (mod(iTime, 5.0) < 0.1) {
        gl_FragColor = vec4(
            rand(uv * iTime),
            rand(uv * iTime + 0.5),
            rand(uv * iTime + 1.0),
            1.0
        );
        return;
    }

    vec2 jitter = vec2(rand(vec2(time)) - 0.5, rand(vec2(time + 0.5)) - 0.5) * 0.005;
    uv += jitter;

    float noise = max(0.0, snoise(vec2(time, uv.y * 0.3)) - 0.3) * (1.0 / 0.7);
    noise += (snoise(vec2(time * 10.0, uv.y * 2.4)) - 0.5) * 0.15;

    float radio_distortion = sin(uv.y * 200.0 + time * 10.0) * 0.1;
    float xpos = clamp(uv.x - noise * noise * 0.25 + radio_distortion, 0.001, 0.999);

    vec4 texColor = texture2D(iChannel0, vec2(xpos, uv.y));

    float scan_line = sin(uv.y * 150.0 + time * 5.0) * 0.3 + 0.7;
    texColor.rgb *= mix(scan_line, 1.0, smoothstep(0.8, 1.0, noise));

    texColor.rgb = mix(texColor.rgb, vec3(rand(vec2(uv.y * time))), noise * 0.3).rgb;

    float chroma_offset = 0.02 * noise;
    vec3 channels;
    channels.r = texColor.r;
    channels.g = texture2D(iChannel0, vec2(xpos + chroma_offset, uv.y)).g;
    channels.b = texture2D(iChannel0, vec2(xpos - chroma_offset, uv.y)).b;

    float grain = rand(uv * time) * 0.1;
    vec3 sepia = channels * vec3(1.0, 0.8, 0.6);
    gl_FragColor = vec4(mix(sepia, channels, 0.7) + grain, 1.0);
}
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}

function main() {
    const canvas = document.getElementById('canvas');
    const gl = canvas.getContext('webgl');

    if (!gl) {
        console.error('WebGL not supported');
        return;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(gl, vertexShader, fragmentShader);

    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
    const iTimeLocation = gl.getUniformLocation(program, 'iTime');
    const iResolutionLocation = gl.getUniformLocation(program, 'iResolution');
    const iChannel0Location = gl.getUniformLocation(program, 'iChannel0');

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
        -1, -1,
        1, -1,
        -1, 1,
        -1, 1,
        1, -1,
        1, 1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    const pixel = new Uint8Array([139, 69, 19, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    function render(time) {
        time *= 0.001;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(program);

        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

        gl.uniform1f(iTimeLocation, time);
        gl.uniform2f(iResolutionLocation, gl.canvas.width, gl.canvas.height);
        gl.uniform1i(iChannel0Location, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

main();
