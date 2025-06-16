const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl');

const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
const programInfo = {
  program: shaderProgram,
  attribLocations: {
    vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
  },
  uniformLocations: {
    isActive: gl.getUniformLocation(shaderProgram, 'isActive'),
    jitterAmount: gl.getUniformLocation(shaderProgram, 'jitterAmount'),
    noiseIntensity: gl.getUniformLocation(shaderProgram, 'noiseIntensity'),
    radioDistortionIntensity: gl.getUniformLocation(shaderProgram, 'radioDistortionIntensity'),
    scanLineIntensity: gl.getUniformLocation(shaderProgram, 'scanLineIntensity'),
    grainIntensity: gl.getUniformLocation(shaderProgram, 'grainIntensity'),
  },
};

function setUniforms(gl, programInfo) {
  gl.useProgram(programInfo.program);

  gl.uniform1i(programInfo.uniformLocations.isActive, true);
  gl.uniform1f(programInfo.uniformLocations.jitterAmount, 0.005);
  gl.uniform1f(programInfo.uniformLocations.noiseIntensity, 1.0);
  gl.uniform1f(programInfo.uniformLocations.radioDistortionIntensity, 0.1);
  gl.uniform1f(programInfo.uniformLocations.scanLineIntensity, 0.3);
  gl.uniform1f(programInfo.uniformLocations.grainIntensity, 0.1);
}

function render() {
  setUniforms(gl, programInfo);
  // Render the scene
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    gl.uniform1i(programInfo.uniformLocations.isActive, false);
  } else {
    gl.uniform1i(programInfo.uniformLocations.isActive, true);
  }
  render();
});

window.addEventListener('focus', () => {
  gl.uniform1i(programInfo.uniformLocations.isActive, true);
  render();
});

window.addEventListener('blur', () => {
  gl.uniform1i(programInfo.uniformLocations.isActive, false);
  render();
});

render();
