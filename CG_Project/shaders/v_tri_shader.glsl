#version 300 es
#define N_LIGHTS 2

precision mediump float;

in vec4 a_position;
in vec4 a_normal;
in vec4 a_color;

uniform mat4 u_camera_mat;
uniform mat4 u_model_mat;

// Light matrices
uniform mat4 light_mats[N_LIGHTS];
//uniform mat4 light_mat_1;

out vec4 v_position;
out vec4 v_normal;
out vec4 v_color;

out vec4 v_position_in_lights[N_LIGHTS];
//out vec4 v_position_in_light_1;

void main(){
    // World position
    v_position = u_model_mat * a_position;

    // Position in NDC in light "cameras"
    for (int i = 0; i < N_LIGHTS; i++){
        v_position_in_lights[i] = light_mats[i] * v_position;
    }

    v_normal = a_normal; // TODO: Handle transformation of normals
    v_color = a_color;
    
    gl_Position = u_camera_mat * v_position;
}
