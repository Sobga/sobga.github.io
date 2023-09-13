const ATTRIBUTES = {
    INDEX: "a_index",
    POSITION: "a_position",
    NORMAL: "a_normal",
    COLOR: "a_color"
};

const ATTRIBUTE_LOCATION = {
    POSITION : 0,
    NORMAL: 1,
    COLOR: 2
};

function get_attribute_location(attribute){
    switch (attribute){
        case ATTRIBUTES.POSITION: return ATTRIBUTE_LOCATION.POSITION;
        case ATTRIBUTES.NORMAL: return ATTRIBUTE_LOCATION.NORMAL;
        case ATTRIBUTES.COLOR: return ATTRIBUTE_LOCATION.COLOR;

        default: throw new Error("Undefined attribute");
    }
}

const UNIFORMS = {
    CAMERA_MATRIX: "u_camera_mat",
    CAMERA_POSITION: "u_camera_pos",
    MODEL_MATRIX: "u_model_mat",
    LIGHT_DIRECTION: "l_dir",
    LIGHT_POSITION: "l_pos",
    LIGHT_EMISSION: "l_e",
    LIGHT_MATRIX: "light_mat",
    LIGHT_MATRICES: "light_mats",
    LIGHT_EMISSIONS: "light_emissions",
    LIGHT_DIRECTIONS: "light_dirs",
    LIGHT_POSITIONS: "light_positions",
    SHADOW_MAP: "shadow_map",
    SHADOW_MAPS: "shadow_maps",
    SHADOW_SCALE: "texmapscale",
    LIGHT_AMBIENT: "L_a",
    MATERIAL_DIFFUSE: "k_d",
    MATERIAL_SPECULAR: "k_s",
    PHONG_EXPONENT: "s",
}

const UNIFORM_TYPES = {
    MAT4 : "mat4",
    MAT4V : "mat4v",
    VEC2 : "vec2",
    VEC3 : "vec3",
    VEC4: "vec4",
    FLOAT: "float",
    TEXTURE_INDEX: "tex_index",
    INT: "int",
    INT_ARRAY: "int_array"
}

class Shader{
    constructor(gl, program){
        this.gl = gl;
        this.program = program;
        this.attributes = new Map();
        this.uniforms = new Map();

        // Uniforms for shader
        this.add_uniform(UNIFORMS.CAMERA_MATRIX, UNIFORM_TYPES.MAT4);
        this.add_uniform(UNIFORMS.MODEL_MATRIX, UNIFORM_TYPES.MAT4);
    }

    add_attribute(attribute_id){
        const attribute = this.gl.getAttribLocation(this.program, attribute_id);
        if (attribute == undefined){
            throw "No attribute defined for: " + attribute_id;
        } else{
            this.attributes.set(attribute_id, attribute);
        }

        return attribute;
    }

    // Adds a new uniform entry
    add_uniform(uniform_id, type, value){
        const uniform = this.gl.getUniformLocation(this.program, uniform_id);
        if (uniform == undefined)
            throw "No uniform defined for: " + uniform_id;

        this.uniforms.set(uniform_id, uniform);

        uniform.type = type;
        uniform.value = value;
        return uniform;
    }

    get_uniform(uniform_id){
        const uniform = this.uniforms.get(uniform_id);
        if (uniform == undefined)
            throw "No uniform defined for: " + uniform_id;
        return uniform;
    }

    set_uniform_value(uniform_id, value){
        // Ensure that this is the current program being used?
        const uniform = this.get_uniform(uniform_id);
        uniform.value = value;

        this.upload_uniform(uniform);
    }

    set_uniform_if_exists(uniform_id, value){
        // If uniform doesn't exist for shader, skip it
        if (!this.uniforms.has(uniform_id))
            return false;
            
        this.set_uniform_value(uniform_id, value);
        return true;
    }

    // Uploads the uniform to the shader
    upload_uniform(uniform){
        switch (uniform.type){
            case UNIFORM_TYPES.MAT4:
                this.gl.uniformMatrix4fv(uniform, false, flatten(uniform.value));
                break
            case UNIFORM_TYPES.MAT4V:
                this.gl.uniformMatrix4fv(uniform, false, flatten(uniform.value));
                break;
            case UNIFORM_TYPES.VEC2:
                this.gl.uniform2fv(uniform, flatten(uniform.value));
                break;
            case UNIFORM_TYPES.VEC3:
                this.gl.uniform3fv(uniform, flatten(uniform.value));
                break;
            case UNIFORM_TYPES.VEC4:
                this.gl.uniform4fv(uniform, flatten(uniform.value));
                break;
            case UNIFORM_TYPES.FLOAT:
                this.gl.uniform1f(uniform, uniform.value);
                break;
            case UNIFORM_TYPES.TEXTURE_INDEX:
                this.gl.uniform1i(uniform, uniform.value);
                break;
            case UNIFORM_TYPES.INT:
                this.gl.uniform1i(uniform, uniform.value);
                break;
            case UNIFORM_TYPES.INT_ARRAY:
                this.gl.uniform1iv(uniform, uniform.value);
                break;

            default: throw "No function specified for upload to shader for given uniform type"
        }
    }

    use_shader(){
        this.gl.useProgram(this.program);

        // Reapply all uniforms
        /*for (let u of this.uniforms.entries()){
            const uniform_id = u[0];
            const uniform = u[1];

            if (uniform.value != undefined)
                this.upload_uniform(uniform);
        }*/
    }

    // Prepare attributes for model before drawing
    apply_shader(model){
        for (let a of this.attributes.entries()){
            const attribute_id = a[0];
            const attribute = a[1];

            const buffer = model.get_buffer(attribute_id);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            this.gl.vertexAttribPointer(attribute, buffer.size, buffer.type, false, 0, 0);
            this.gl.enableVertexAttribArray(attribute);
        }
    }
}

class ModelShader extends Shader{
    constructor(gl, program){
        super(gl, program);

        // Attributes for vertices for model
        this.add_attribute(ATTRIBUTES.POSITION);
        this.add_attribute(ATTRIBUTES.NORMAL);
        this.add_attribute(ATTRIBUTES.COLOR);

        // Uniforms for spot-lights
        for (var i = 0; i < 2; i++){
            //this.add_uniform(UNIFORMS.LIGHT_POSITION + "_" + i, UNIFORM_TYPES.VEC4)
            //this.add_uniform(UNIFORMS.LIGHT_DIRECTION + "_" + i, UNIFORM_TYPES.VEC4)
            //this.add_uniform(UNIFORMS.LIGHT_EMISSION + "_" + i, UNIFORM_TYPES.VEC3);
            //this.add_uniform(UNIFORMS.LIGHT_MATRIX + "_" + i, UNIFORM_TYPES.MAT4);
        }

        this.add_uniform(UNIFORMS.SHADOW_MAPS, UNIFORM_TYPES.INT);
        this.add_uniform(UNIFORMS.LIGHT_POSITIONS, UNIFORM_TYPES.VEC4);
        this.add_uniform(UNIFORMS.LIGHT_DIRECTIONS, UNIFORM_TYPES.VEC4);
        this.add_uniform(UNIFORMS.LIGHT_EMISSIONS, UNIFORM_TYPES.VEC3);
        this.add_uniform(UNIFORMS.LIGHT_MATRICES, UNIFORM_TYPES.MAT4V);

        // Scale of shadow-maps
        this.add_uniform(UNIFORMS.SHADOW_SCALE, UNIFORM_TYPES.VEC2);

        // Uniform for ambient light
        this.add_uniform(UNIFORMS.LIGHT_AMBIENT, UNIFORM_TYPES.VEC3);

        // Uniforms for material shading
        this.add_uniform(UNIFORMS.MATERIAL_DIFFUSE, UNIFORM_TYPES.FLOAT);
        this.add_uniform(UNIFORMS.MATERIAL_SPECULAR, UNIFORM_TYPES.FLOAT);
        this.add_uniform(UNIFORMS.PHONG_EXPONENT, UNIFORM_TYPES.FLOAT);

        this.add_uniform(UNIFORMS.CAMERA_POSITION, UNIFORM_TYPES.VEC4);
    }

    apply_lights(lights){
        const n_lights = 2; // TODO: Get from lighting manager
        const light_positions = new Float32Array(4*n_lights);
        const light_dirs = new Float32Array(4*n_lights);
        const light_emissions = new Float32Array(3*n_lights);
        const light_matrices = new Float32Array(16*n_lights);

        for (var i = 0; i < n_lights; i++){
            const light = lights[i];
            
            for (var j = 0; j < 4; j++){
                light_positions[4*i + j] = light.pos[j];
                light_dirs[4*i + j] = light.dir[j];
            }
            for (var j = 0; j < 3; j++){
                light_emissions[3*i + j] = light.emission[j];
            }
            //this.set_uniform_value(UNIFORMS.LIGHT_POSITION + "_" + i, light.pos);
            //this.set_uniform_value(UNIFORMS.LIGHT_DIRECTION + "_" + i, light.dir);

            //this.set_uniform_value(UNIFORMS.LIGHT_EMISSION + "_" + i, light.emission);
            

            // Flatten light matrix into array
            const light_mat = light.get_cam_matrix();
            for (var j = 0; j < 16; j++){
                light_matrices[16*i+j] = light_mat[j & 3][j >> 2];
            }
            //this.set_uniform_value(UNIFORMS.LIGHT_MATRIX + "_" + i, );
        }
        
        // Upload uniforms
        this.set_uniform_value(UNIFORMS.LIGHT_POSITIONS, light_positions);
        this.set_uniform_value(UNIFORMS.LIGHT_DIRECTIONS, light_dirs);
        this.set_uniform_value(UNIFORMS.LIGHT_EMISSIONS, light_emissions);
        this.set_uniform_value(UNIFORMS.LIGHT_MATRICES, light_matrices);

    }

    apply_shader(model){
        //super(model);
        /*for (let a of this.attributes.entries()){
            const attribute_id = a[0];
            const attribute = a[1];

            const buffer = model.get_buffer(attribute_id);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            this.gl.vertexAttribPointer(attribute, buffer.size, buffer.type, false, 0, 0);
            this.gl.enableVertexAttribArray(attribute);
        }*/

        // Handle material properties of object
        this.set_uniform_value(UNIFORMS.MATERIAL_DIFFUSE, model.material.k_d);
        this.set_uniform_value(UNIFORMS.MATERIAL_SPECULAR, model.material.k_s);
        this.set_uniform_value(UNIFORMS.PHONG_EXPONENT, model.material.s);
    }
}

class ShadowShader extends Shader{
    constructor(gl, program){
        super(gl, program);

        this.add_attribute(ATTRIBUTES.POSITION);
    }
}