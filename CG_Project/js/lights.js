const LIGHT_NEAR = 0.5;
const LIGHT_FAR = 30;
const LIGHT_FOV = 120;
const LIGHT_UP = vec3(0,1,0);
const LIGHT_TEX_OFFSET = 0;
const FBO_SIZE =  1024;
const MAX_LIGHTS = 2;

function initFramebufferObject(gl, index, width, height) { 
    var framebuffer = gl.createFramebuffer(); 
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer); 

    var renderbuffer = gl.createRenderbuffer(); 
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer); 
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height); 
 
    // Create shadow-map texture
    var shadowMap = gl.createTexture(); 
    gl.activeTexture(gl.TEXTURE0 + index); 
    gl.bindTexture(gl.TEXTURE_2D, shadowMap); 
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); 
  
    // Set parameters for texture
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); 
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); 
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); 
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Keep reference to texture
    framebuffer.texture = shadowMap; 
 
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, shadowMap, 0); 
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer); 
    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER); 
    if (status !== gl.FRAMEBUFFER_COMPLETE) { 
        console.log('Framebuffer object is incomplete: ' + status.toString());
    } 
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null); 

    framebuffer.width = width; framebuffer.height = height; 
    return framebuffer; 
} 

function init3DTexture(gl, width, height, n_textures){
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, width, height, n_textures);

    // Set parameters for texture
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR); 
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR); 
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); 
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return texture;
}

function create_depth_texture(gl){
     // create a depth texture
    const depth_texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depth_texture);

    // make a depth buffer and the same size as the targetTexture
    // define size and format of level 0
    const level = 0;
    const internalFormat = gl.DEPTH_COMPONENT24;
    const border = 0;
    const format = gl.DEPTH_COMPONENT;
    const type = gl.UNSIGNED_INT;
    const data = null;
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  FBO_SIZE, FBO_SIZE, border,
                  format, type, data);

    // set the filtering so we don't need mips
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return depth_texture;
}

class LightManager{
    /**
     * 
     * @param {WebGL2RenderingContext} gl 
     */
    constructor (gl){
        this.gl = gl;
        this.shadowmap_tex = init3DTexture(gl, FBO_SIZE, FBO_SIZE, MAX_LIGHTS);
        this.lights = [];
        //this.framebuffers = [];
    }

    get_lights(){
        return this.lights;
    }

    create_spotlight(pos, dir){
        if (this.lights.length >= MAX_LIGHTS)
            throw new Error("Too many lights added");

        // Create frame-buffer for light to render to
        const tex_layer = this.lights.length;
        const level = 0;

        const fbo = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        this.gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.shadowmap_tex, level, tex_layer);

        fbo.rb_depth_buffer = gl.createRenderbuffer(); 
        gl.bindRenderbuffer(gl.RENDERBUFFER, fbo.rb_depth_buffer); 
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT, FBO_SIZE, FBO_SIZE); 
        //gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, fbo.rb_depth_buffer); 
        this.gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, fbo.rb_depth_buffer, level, tex_layer);


        // Create light
        const light = new Spotlight(this.gl, pos, dir, fbo);
        this.lights.push(light);

        // Unbind for safety
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, fbo.rb_depth_buffer);
        return light;
    }

    compute_shadowmaps(shadow_shader, models){
        this.gl.viewport(0, 0, FBO_SIZE, FBO_SIZE);

        for(var i = 0; i < this.lights.length; i++){
            const light = this.lights[i];

            // Draw to framebuffer instead of canvas
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, light.frambuffer);
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, light.frambuffer.rb_depth_buffer);

            //this.gl.drawBuffers([gl.COLOR_ATTACHMENT0, this.gl.DEPTH_COMPONENT]);
            // Clear buffer for drawing
            this.gl.clearColor(1, 1, 1, 1); 
            this.gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            // Update camera matrix
            shadow_shader.set_uniform_value(UNIFORMS.CAMERA_MATRIX, light.get_cam_matrix());

            // Draw models
            for (var i = 0; i < models.length; i++)
                models[i].draw_model(shadow_shader);
        }

        // Unbind to draw to canvas again
        this.gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    }
}

/*
class Spotlight extends Camera{
    constructor(gl, pos, dir, framebuffer){
        super(perspective(LIGHT_FOV, 1, LIGHT_NEAR, LIGHT_FAR));
        this.gl = gl;
        this.pos = pos;
        this.dir = dir;
        this.emission = vec3(20, 20, 20);
        this.frambuffer = framebuffer;
    }
    
    // Preserve projection matrix
    update_aspect(aspect_ratio){}

    set_light_transform(pos, dir){
        this.pos = pos;
        this.dir = dir;
    }

    get_cam_matrix(){
        const look_pos = add(this.pos, this.dir);
        const extrinsics = lookAt(vec3(this.pos), vec3(look_pos), LIGHT_UP);
        return mult(this.intrinsics, extrinsics);
    }

    get_cam_pos(){
        return this.pos;
    }
} */

