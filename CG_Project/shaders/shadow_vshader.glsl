precision mediump float;

attribute vec4 a_position;

// Camera matrix for projection
uniform mat4 u_camera_mat;
uniform mat4 u_model_mat;


void main(){
    gl_Position = u_camera_mat * u_model_mat * a_position;
}