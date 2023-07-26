const LIGHT_NEAR = 0.5;
const LIGHT_FAR = 30;
const LIGHT_FOV = 120;
const LIGHT_UP = vec3(0,1,0);
const LIGHT_TEX_OFFSET = 0;
const FBO_SIZE =  1024;

function initFramebufferObject(gl, index, width, height) 
{ 
  var framebuffer = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer); 
  var renderbuffer = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer); 
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height); 
 
  // Create shadow-map texture
  var shadowMap = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + index); gl.bindTexture(gl.TEXTURE_2D, shadowMap); 
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
  if (status !== gl.FRAMEBUFFER_COMPLETE) { console.log('Framebuffer object is incomplete: ' + status.toString()); } 
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.bindRenderbuffer(gl.RENDERBUFFER, null); 
  framebuffer.width = width; framebuffer.height = height; 
  return framebuffer; 
} 

class Spotlight extends Camera{
    constructor(gl, pos, dir, fbo_index){
        super(perspective(LIGHT_FOV, 1, LIGHT_NEAR, LIGHT_FAR));
        this.gl = gl;
        this.pos = pos;
        this.dir = dir;
        //this.emission = vec3(1.5, 1.5, 1.5);
        this.emission = vec3(1, 1, 1)
        this.fbo_index = fbo_index + LIGHT_TEX_OFFSET; // Texture index for framebuffer object
        this.frambuffer = initFramebufferObject(gl, fbo_index, FBO_SIZE, FBO_SIZE);
    }
    
    // Preserve projection matrix
    update_aspect(aspect_ratio){}

    set_light_transform(pos, dir){
        this.pos = pos;
        this.dir = dir;

        //const look_position = vec3(this.pos[0] + this.dir[0], this.pos[1] + this.dir[1], this.pos[2] + this.dir[2]);
        //const extrinsics = lookAt(this.pos, look_position, LIGHT_UP);
        //this.transform = mult(this.intrinsics, extrinsics);
    }

    get_cam_matrix(){
        const look_pos = add(this.pos, this.dir);
        const extrinsics = lookAt(vec3(this.pos), vec3(look_pos), LIGHT_UP);
        return mult(this.intrinsics, extrinsics);
    }

    get_cam_pos(){
        return this.pos;
    }

    compute_shadowmap(shadow_shader, models){
        // Draw to framebuffer instead of canvas
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frambuffer);
        this.gl.viewport(0, 0, FBO_SIZE, FBO_SIZE);
        
        // Select texture to draw to
        //this.gl.bindTexture(gl.TEXTURE_2D, this.frambuffer.texture);
        //this.gl.activeTexture(gl.TEXTURE0 + this.fbo_index);

        // Clear buffer for drawing
        this.gl.clearColor(1, 1, 1, 1); 
        this.gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Update camera matrix
        shadow_shader.set_uniform_value(UNIFORMS.CAMERA_MATRIX, this.get_cam_matrix());

        // Draw models
        for (var i = 0; i < models.length; i++)
            models[i].draw_model(shadow_shader);

        // Unbind to draw to canvas again
        this.gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    /*
    upload_to_shader(shader){
        shader.set_uniform_if_exists(UNIFORMS.LIGHT_EMISSION, this.emission);
        shader.set_uniform_if_exists(UNIFORMS.LIGHT_POSITION, this.pos);
        shader.set_uniform_if_exists(UNIFORMS.LIGHT_DIRECTION, this.dir);
        //shader.set_uniform_if_exists(UNIFORMS.LIGHT_EMISSION, this.emission);
    }*/
}

