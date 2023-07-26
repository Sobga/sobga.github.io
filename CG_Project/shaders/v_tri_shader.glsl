precision mediump float;

attribute vec4 a_position;
attribute vec4 a_normal;
attribute vec4 a_color;

uniform mat4 u_camera_mat;
uniform mat4 u_model_mat;

// Light matrices
uniform mat4 light_mat_0;
uniform mat4 light_mat_1;

varying vec4 v_position;
varying vec4 v_normal;
varying vec4 v_color;

varying vec4 v_position_in_light_0;
varying vec4 v_position_in_light_1;

void main(){
    // World position
    v_position = u_model_mat * a_position;

    // Position in NDC in light "cameras"
    v_position_in_light_0 = light_mat_0 * v_position;
    v_position_in_light_1 = light_mat_1 * v_position;

    v_normal = a_normal; // TODO: Handle transformation of normals
    v_color = a_color;
    
    gl_Position = u_camera_mat * v_position;
}
