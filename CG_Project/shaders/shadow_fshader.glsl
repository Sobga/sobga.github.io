#version 300 es
precision mediump float;

out vec4 out_color;

void main(){
    const vec4 bitShift = vec4(1.0, 256.0, 256.0*256.0, 256.0*256.0*256.0); 
    const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0); 
    vec4 rgbaDepth = fract(gl_FragCoord.z*bitShift); 
    rgbaDepth -= rgbaDepth.gbaa*bitMask; 
    out_color = rgbaDepth; 
} 