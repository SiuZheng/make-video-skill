import React from 'react';
import {AbsoluteFill} from 'remotion';

// Which graphics device is Chrome drawing with? (a test frame: WebGL's renderer string, also logged)
const probe = () => {
  try {
    const gl = document.createElement('canvas').getContext('webgl') as WebGLRenderingContext | null;
    if (!gl) return 'no webgl';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
  } catch (e) {
    return `error: ${e}`;
  }
};

export const GpuProbe: React.FC = () => {
  const r = probe();
  console.log(`GPU_PROBE: ${r}`);
  return <AbsoluteFill style={{background: '#000', color: '#fff', font: '40px sans-serif', padding: 60}}>{r}</AbsoluteFill>;
};
