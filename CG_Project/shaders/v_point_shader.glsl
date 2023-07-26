precision mediump float;

attribute vec4 a_position;
attribute float a_level;

uniform mat4 u_camera_mat;
varying vec4 v_color;


void main(){
    gl_Position = u_camera_mat * a_position;
    gl_PointSize = 15.0;

    v_color =  vec4(0.7412, 0.6784, 0.6784, 1.0);
    v_color.a = 1.0;
}
