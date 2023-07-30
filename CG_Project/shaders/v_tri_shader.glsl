#version 300 es

precision mediump float;

in vec4 a_position;
in vec4 a_normal;
in vec4 a_color;

uniform mat4 u_camera_mat;
uniform mat4 u_model_mat;

// Light matrices
uniform mat4 light_mat_0;
uniform mat4 light_mat_1;

out vec4 v_position;
out vec4 v_normal;
out vec4 v_color;

out vec4 v_position_in_light_0;
out vec4 v_position_in_light_1;

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
