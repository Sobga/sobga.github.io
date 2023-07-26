precision mediump float;

uniform vec4 u_camera_pos;

// Material values
uniform float k_d; // Diffuseness of material
uniform float k_s; // Specularity of material
uniform float s; // Phong exponent

// Light variables for one light 
uniform vec3 l_e_0;
uniform vec4 l_dir_0;
uniform vec4 l_pos_0;
uniform sampler2D shadow_map_0;

uniform vec3 l_e_1;
uniform vec4 l_dir_1;
uniform vec4 l_pos_1;
uniform sampler2D shadow_map_1;

// Scale for framebuffers
uniform vec2 texmapscale;

// Ambient light
uniform vec3 L_a;

// Varying pr. pixel
varying vec4 v_position;
varying vec4 v_normal;
varying vec4 v_color;

// Varying positions in light sources
varying vec4 v_position_in_light_0;
varying vec4 v_position_in_light_1;

#define M_PI 3.1415926535897932384626433832795

const vec4 BG_COLOR = vec4(0.2039, 0.1647, 0.7804, 1.0);
const float FOG_DENSITY = 0.3;
const float MAX_DIST_SQ = 100.0;
const float CUTOFF_ANGLE = M_PI / 3.0;

vec4 spotlight(const in vec4 normal, const in vec3 l_e, const in vec4 l_dir, const in vec4 l_pos){
	vec4 lightness = vec4(0.0, 0.0, 0.0, 1.0);

	vec4 difference = l_pos - v_position;	

	vec4 w_i = normalize(difference); // Direction towards light
	vec4 w_r = 2.0 * (dot(w_i, normal)) * normal - w_i; // Reflected vector
	vec4 w_o = normalize(u_camera_pos - v_position); // Direction towards camera
	vec4 w_h = normalize(w_i + w_o); // Half vector

	float cos_theta = dot(normal, w_i);

	// Compute spotlight intensity	
	float distance_sq = max(dot(difference, difference) * 0.025, 1.0);

	// Light intensity at surface
	float cos_surface = -dot(l_dir, w_i);
	float cos_sq = cos_surface * cos_surface;
	float attenuation = cos_surface < CUTOFF_ANGLE ? cos_sq*cos_sq: 0.0;
	vec3 intensity =  attenuation * l_e / distance_sq;

	// Lambertian lighting
	vec3 L_o = k_d * intensity * max(cos_theta, 0.0);

	// Phong highlight
	vec3 L_BPs = k_s * intensity * pow(max(dot(normal.xyz, w_h.xyz), 0.0), s);
	
	lightness.xyz = L_BPs + L_o;

	return lightness;
}

// Unpack depth stored in shadowmap
float unpackDepth(const in vec4 rgbaDepth) { 
	const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0*256.0), 1.0/(256.0*256.0*256.0)); 
	return dot(rgbaDepth, bitShift); 
} 

vec4 offset_lookup(sampler2D map, vec3 shadowCoord, vec2 offset) { 
	return texture2D(map, shadowCoord.xy + offset*texmapscale); 
}

// Percentage closest filtering 
// https://developer.nvidia.com/gpugems/gpugems/part-ii-lighting-and-shadows/chapter-11-shadow-map-antialiasing
float pcf(const in sampler2D shadow_map, const in vec4 v_position_in_light){
	vec3 shadow_coord = (v_position_in_light.xyz/v_position_in_light.w) / 2.0 + 0.5;

	vec4 rgbaDepth = offset_lookup(shadow_map, shadow_coord, vec2(0.0, 0.0)); 
	float map_depth = unpackDepth(rgbaDepth);
	//if (shadow_coord.x < 0.0 || shadow_coord.x > 1.0 || shadow_coord.y < 0.0 || shadow_coord.y > 1.0)
	//return 0.0;
	
	float n_free = 0.0;
	for (float y = -1.5; y <= 1.5; y += 1.0){
		for (float x = -1.5; x <= 1.5; x += 1.0){
			vec4 rgbaDepth = offset_lookup(shadow_map, shadow_coord, vec2(x, y)); 
			float map_depth = unpackDepth(rgbaDepth);
			n_free += (shadow_coord.z > map_depth + 0.0015) ? 0.0 : 1.0;
		}
	}
	return max(n_free / 16.0, 0.0);
}

// https://docs.microsoft.com/en-us/windows/win32/direct3d9/fog-formulas
float depthfog(){
	vec4 delta_pos = u_camera_pos - v_position;
	float distance_sq = dot(delta_pos, delta_pos) / MAX_DIST_SQ;
	return 1.0-clamp(1.0 / exp(FOG_DENSITY * FOG_DENSITY * distance_sq), 0.0, 1.0);
}

void main(){
    vec4 normal = normalize(v_normal);
    
	// Compute light contribution from one spotlight
	vec4 lightness_0 = spotlight(normal, l_e_0, l_dir_0, l_pos_0);
	float visibility_0 = pcf(shadow_map_0, v_position_in_light_0);

	// Compute light from other spotlight
	vec4 lightness_1 = spotlight(normal, l_e_1, l_dir_1, l_pos_1);
	float visibility_1 = pcf(shadow_map_1, v_position_in_light_1);

	// Pure viewcolor
	vec4 view_color = vec4(0);
	view_color.xyz = v_color.xyz * L_a;
	view_color += v_color * (lightness_0 * visibility_0 + lightness_1 * visibility_1);

	gl_FragColor = view_color;
	gl_FragColor = mix(view_color, BG_COLOR, depthfog());
}
