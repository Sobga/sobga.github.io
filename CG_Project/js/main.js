"use strict";
let gl;

// FPS
let fps_counter;
var fps_sum = 0;
const fps_samples = [];

let canvas;

// Camera fields
const player_cam = new KeyboardCam(vec3(-1, 0.5, 0), vec4(0,0,1,0));
const rotate_cam = new RotateCam(vec3(0,0,0), 20);
let sub_cam;
const cameras = [player_cam];
var camera_index = 0;

const BG_COLOR = vec4(0.2039, 0.1647, 0.7804, 1.0);
const models = [];
let light_manager;

const noise_sampler = new SphereSampler([vec3(0, 0, 15), vec3(0,0, 4)], [7, 2]);
//const noise_sampler = new PlaneSampler();
//const noise_sampler = new SimplexSampler(0);
let chunk_manager;

var last_timestamp = 0;
var last_fps_stamp = 0;

window.onresize = update_resolution;
function update_resolution(){
    // Handles changes in resolution of browser
    const width = window.innerWidth;
    const height = window.innerHeight
    
    const aspect_ratio = width / height;

    canvas.width = width;
    canvas.height = height;
    gl.viewport(0,0, width, height);

    for (var i = 0; i < cameras.length; i++)
        cameras[i].update_aspect(aspect_ratio);
}

// Toggle cameras
window.onkeydown = function(event){
    if (event.code == "KeyX"){
        // Disable old camera
        cameras[camera_index].set_active(false);
        camera_index = (camera_index + 1) % cameras.length;
        
        // Enable new camera
        cameras[camera_index].set_active(true);
        player_cam.pos = vec3(sub_cam.get_cam_pos());
    }
}

window.onload = function init(){
    // Init canvas
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas, {alpha:false});

    fps_counter = document.getElementById("fps");
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Init shaders
    const model_program = initShaders(gl, "shaders/v_tri_shader.glsl", "shaders/f_tri_shader.glsl");
    gl.model_program = model_program;
    const shadow_program = initShaders(gl, "shaders/shadow_vshader.glsl", "shaders/shadow_fshader.glsl");
    gl.model_shader = new ModelShader(gl, model_program);
    gl.shadow_shader = new ShadowShader(gl, shadow_program);
    

    // Initalize fields for model shader
    // TODO: MOVE TO MODEL SHADER?
    gl.model_shader.use_shader();
    gl.model_shader.set_uniform_value(UNIFORMS.LIGHT_AMBIENT, vec3(0.15, 0.15, 0.15));
    gl.model_shader.set_uniform_value(UNIFORMS.SHADOW_SCALE, vec2(1/FBO_SIZE, 1/FBO_SIZE));        

    light_manager = new LightManager(gl);

    // Create submarine
    //sub_cam = new SubmarineCam(gl, lightManager, vec3(0, -16, -8), vec4(-1,0,0,0));
    //sub_cam = new SubmarineCam(gl, lightManager, vec3(-5.785492788345726, 0.5, -4.536038943953013), vec4(-0.7260806560516357, 0, 0.6876094937324524,0));
    sub_cam = new SubmarineCam(gl, light_manager, vec3(0, 1, 0), vec4(0, 0, 1, 0));
    cameras.push(sub_cam);
    sub_cam.set_active(true);
    camera_index = cameras.length - 1; // Set camera index to be submarine camera
    models.push(sub_cam.submarine);
    cameras.push(...sub_cam.submarine.lights)

    // Initialize terrain generation
    chunk_manager = new ChunkManager(gl, noise_sampler, 3);
    models.push(chunk_manager.chunk_generator);
    
    // Ensure cameras have correct resolution/aspect ratio
    update_resolution();
    requestAnimationFrame(render);
}

// Timestamp is given in ms!
function render(timestamp){
    const delta_t = timestamp - last_timestamp;
    const current_cam = cameras[camera_index];

    // Clear screen
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Update FPS counter
    const current_fps = 1 / (delta_t / 1000);
    fps_sum += current_fps;
    fps_samples.push(current_fps);

    if (fps_samples.length > 60)
        fps_sum -= fps_samples.shift();
    
    if ((timestamp - last_fps_stamp)/1000 > 1){
        fps_counter.innerHTML = "FPS: " + Math.floor(fps_sum/fps_samples.length);
        last_fps_stamp = timestamp;
    }

    // Update the chunks
    chunk_manager.update_chunks(sub_cam.submarine.pos);
    
    // Update camera positions and matrices
    for (var i = 0; i < cameras.length; i++){
        cameras[i].update(delta_t);
    }

    const camera_matrix = current_cam.get_cam_matrix();
    
    /* SHADOWS */
    gl.shadow_shader.use_shader();
    light_manager.compute_shadowmaps(gl.shadow_shader, models)
    
    /* MODELS DRAW */
    // Set background color
    gl.clearColor(BG_COLOR[0], BG_COLOR[1], BG_COLOR[2], BG_COLOR[3]);
    
    // Draw models
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.model_shader.use_shader()
    gl.model_shader.set_uniform_value(UNIFORMS.CAMERA_MATRIX, camera_matrix);
    gl.model_shader.set_uniform_value(UNIFORMS.CAMERA_POSITION, current_cam.get_cam_pos());
    
    // Apply lighting
    gl.model_shader.apply_lights(light_manager);
    
    // Draw models
    for (var i = 0; i < models.length; i++)
        models[i].draw_model(gl.model_shader);


    last_timestamp = timestamp;
    requestAnimationFrame(render);
}