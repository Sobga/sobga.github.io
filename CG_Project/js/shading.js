const ATTRIBUTES = {
    INDEX: "a_index",
    POSITION: "a_position",
    NORMAL: "a_normal",
    COLOR: "a_color"
}

const UNIFORMS = {
    CAMERA_MATRIX: "u_camera_mat",
    CAMERA_POSITION: "u_camera_pos",
    MODEL_MATRIX: "u_model_mat",
    LIGHT_DIRECTION: "l_dir",
    LIGHT_POSITION: "l_pos",
    LIGHT_EMISSION: "l_e",
    LIGHT_MATRIX: "light_mat",
    SHADOW_MAP: "shadow_map",
    SHADOW_SCALE: "texmapscale",
    LIGHT_AMBIENT: "L_a",
    MATERIAL_DIFFUSE: "k_d",
    MATERIAL_SPECULAR: "k_s",
    PHONG_EXPONENT: "s",
}

const UNIFORM_TYPES = {
    MAT4 : "mat4",
    VEC2 : "vec2",
    VEC3 : "vec3",
    VEC4: "vec4",
    FLOAT: "float",
    TEXTURE_INDEX: "tex_index"
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
            this.add_uniform(UNIFORMS.LIGHT_POSITION + "_" + i, UNIFORM_TYPES.VEC4)
            this.add_uniform(UNIFORMS.LIGHT_DIRECTION + "_" + i, UNIFORM_TYPES.VEC4)
            this.add_uniform(UNIFORMS.LIGHT_EMISSION + "_" + i, UNIFORM_TYPES.VEC3);
            this.add_uniform(UNIFORMS.LIGHT_MATRIX + "_" + i, UNIFORM_TYPES.MAT4);

            this.add_uniform(UNIFORMS.SHADOW_MAP + "_" + i, UNIFORM_TYPES.TEXTURE_INDEX);
        }   

        // Uniform for ambient light
        this.add_uniform(UNIFORMS.LIGHT_AMBIENT, UNIFORM_TYPES.VEC3);
        this.add_uniform(UNIFORMS.SHADOW_SCALE, UNIFORM_TYPES.VEC2);

        // Uniforms for material shading
        this.add_uniform(UNIFORMS.MATERIAL_DIFFUSE, UNIFORM_TYPES.FLOAT);
        this.add_uniform(UNIFORMS.MATERIAL_SPECULAR, UNIFORM_TYPES.FLOAT);
        this.add_uniform(UNIFORMS.PHONG_EXPONENT, UNIFORM_TYPES.FLOAT);

        this.add_uniform(UNIFORMS.CAMERA_POSITION, UNIFORM_TYPES.VEC4);
    }

    apply_lights(lights){
        for (var i = 0; i < 2; i++){
            const light = lights[i];
            this.set_uniform_value(UNIFORMS.LIGHT_POSITION + "_" + i, light.pos);
            this.set_uniform_value(UNIFORMS.LIGHT_DIRECTION + "_" + i, light.dir);
            this.set_uniform_value(UNIFORMS.LIGHT_EMISSION + "_" + i, light.emission);
            this.set_uniform_value(UNIFORMS.LIGHT_MATRIX + "_" + i, light.get_cam_matrix());
        }
    }

    apply_shader(model){
        //super(model);
        for (let a of this.attributes.entries()){
            const attribute_id = a[0];
            const attribute = a[1];

            const buffer = model.get_buffer(attribute_id);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            this.gl.vertexAttribPointer(attribute, buffer.size, buffer.type, false, 0, 0);
            this.gl.enableVertexAttribArray(attribute);
        }


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
/*
const SHAPES = {
    POINT: "Point",
    TRIANGLE: "Triangle",
    CIRCLE: "Circle"
};

const COLORS = [
    vec4(0.0, 0.0, 0.0, 1.0),
    vec4(1.0, 0.0, 0.0, 1.0),
    vec4(1.0, 1.0, 0.0, 1.0),
    vec4(0.0, 1.0, 0.0, 1.0),
    vec4(0.0, 0.0, 1.0, 1.0),
    vec4(1.0, 0.0, 1.0, 1.0),
    vec4(0.0, 1.0, 1.0, 1.0),
    vec4(1.0, 1.0, 1.0, 1.0),
    vec4(0.3921, 0.5843, 0.9294, 1.0),
];


const LINE_INDICES = [
    0, 1,
    0, 3,
    0, 4,
    1, 2,
    1, 5,
    2, 6,
    2, 3,
    3, 7,
    4, 5,
    4, 7,
    5, 6,
    6, 7
];

const CUBE_INDICES = [
    1, 0, 3,
    3, 2, 1,
    2, 3, 7,
    7, 6, 2,
    3, 0, 4,
    4, 7, 3,
    6, 5, 1,
    1, 2, 6,
    4, 5, 6,
    6, 7, 4,
    5, 4, 0,
    0, 1, 5
];*/

/*const CUBE_VERTS = [
    vec4(-0.5, -0.5, 0.5, 1.0),
    vec4(-0.5, 0.5, 0.5, 1.0),
    vec4(0.5, 0.5, 0.5, 1.0),
    vec4(0.5, -0.5, 0.5, 1.0),
    vec4(-0.5, -0.5, -0.5, 1.0),
    vec4(-0.5, 0.5, -0.5, 1.0),
    vec4(0.5, 0.5, -0.5, 1.0),
    vec4(0.5, -0.5, -0.5, 1.0)
]*/