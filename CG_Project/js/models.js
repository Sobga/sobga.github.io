const MODEL_FWD = vec4(0,0,1,0);
const MODEL_PATH = "./Models/"

class ModelMaterial{
    constructor(k_d, k_s, s){
        this.k_d = k_d;     // Diffuse reflection
        this.k_s = k_s;     // Specular reflection 
        this.s = s;         // Phong exponent
    }
}

class Model{
    /**
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {ModelMaterial} material 
     * @param {boolean} indexed 
     */
    constructor(gl, material, indexed = false){
        this.gl = gl;
        this.transform = mat4();
        this.pos = vec3();
        this.buffers = new Map();

        // Create VAO and add required buffers
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);
        this.add_buffer(ATTRIBUTES.POSITION, 3, gl.FLOAT);
        this.add_buffer(ATTRIBUTES.NORMAL, 3, gl.FLOAT);
        this.add_buffer(ATTRIBUTES.COLOR, 4, gl.FLOAT);
        if (indexed)
            this.add_buffer(ATTRIBUTES.INDEX, 1, gl.UNSIGNED_INT, true);

        // Create default material
        if (material == undefined || material == null)
            this.material = new ModelMaterial(0.8, 0.2, 5);
        else
            this.material = material;
    }

    add_buffer(attribute, size, type, indexed = false){
        const buffer = this.gl.createBuffer();
        if (!buffer || buffer == -1)
            throw "Failed to create buffer object";
        
        if (indexed){
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
        } else{
            const attribute_location = get_attribute_location(attribute);
            this.gl.enableVertexAttribArray(attribute_location);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            this.gl.vertexAttribPointer(attribute_location, size, type, false, 0, 0);
        }

        // Initialize and remember buffer
        buffer.type = type;
        buffer.size = size;
        buffer.is_indexed = indexed;
        this.buffers.set(attribute, buffer);
        
        return buffer;
    }

    set_buffer_data(buffer_id, data){
        const buffer = this.get_buffer(buffer_id);
        const target = buffer.is_indexed ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER;

        this.gl.bindBuffer(target, buffer);
        this.gl.bufferData(target, data, this.gl.STATIC_DRAW);
    }

    set_buffer_sub_data(buffer_id, index, data){
        this.gl.bindBuffer(gl.ARRAY_BUFFER, this.get_buffer(buffer_id));
        this.gl.bufferSubData(gl.ARRAY_BUFFER, index, flatten(data));
    }

    set_buffer_sub_data_length(buffer_id, index, data, length){
        const buffer = this.get_buffer(buffer_id);
        const target = buffer.is_indexed ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER;
        this.gl.bindBuffer(target, buffer);
        this.gl.bufferSubData(target, index, data, 0, length);
    }

    get_buffer(buffer_id){
        return this.buffers.get(buffer_id);
    }

    get_normal_transform(){
        // Take the transpose of the inverse of the upper left 3x3 model matrix to get normal transformation
        const model_mat3 = mat3();
        for (var i = 0; i < 3; i++){
            for (var j = 0; j < 3; j++)
                model_mat3[i][j] = this.transform[i][j];
        }
        const model_mat_normals3 = transpose(inverse(model_mat3));
        const model_mat_normals = mat4();
        for (var i = 0; i < 3; i++){
            for (var j = 0; j < 3; j++)
                model_mat_normals[i][j] = model_mat_normals3[i][j];
        }
        return model_mat_normals;
    }

    // Overwrite for proper drawing
    draw(){}

    draw_model(shader){
        this.gl.bindVertexArray(this.vao);
        // Upload uniforms
        shader.apply_shader(this);
        shader.set_uniform_value(UNIFORMS.MODEL_MATRIX, this.transform);

        this.draw();
        this.gl.bindVertexArray(null);
    }
}

class ModelMesh extends Model{
    constructor(gl, model_name){
        super(gl, null, true);
        this.obj_doc = null;
        this.n_vertices = -1;

        readOBJFile(MODEL_PATH + model_name, this, 1, false);
    }

    draw(){
        if (this.obj_doc != null && this.obj_doc.isMTLComplete()){
            onReadComplete(this, this.obj_doc);
            this.obj_doc = null;
        }
        if (this.n_vertices < 0)
            return;

        gl.drawElements(gl.TRIANGLES, this.n_vertices, gl.UNSIGNED_INT, 0);
    }
}

class Submarine extends Model{
    constructor(gl, lightManager, pos, dir){
        super(gl);
        this.pos = pos;
        this.dir = dir;
        this.lights = [];

        const light_offsets = [vec4(-0.94, -1, 1.03, 1), vec4(0.94, -1, 1.03, 1)];
        const light_directions = [vec4(0, 0, 1, 0), vec4(0, 0, 1, 0)]

        // Initialize light sources
        for (var i = 0; i < light_offsets.length; i++){
            const light = lightManager.create_spotlight(light_offsets[i], light_directions[i]);
            light.offset = light_offsets[i];
            light.start_direction = light_directions[i];
            this.lights.push(light);
        }

        this.hull = new SubmarineHull(gl);
        this.propeller = new SubmarinePropeller(gl);
        this.set_model_transform(pos, dir, new Quaternion(), mat4());
    }

    // Sets the transform for the submarine.
    set_model_transform(pos, dir, q_rot, transform){
        this.pos = pos;
        this.dir = dir;
        this.transform = transform;

        this.hull.set_model_transform(transform);
        this.propeller.set_model_transform(dir, q_rot, transform);

        // Update all light sources
        for (var i = 0; i < this.lights.length; i++){
            const light = this.lights[i];

            const pos = mult(transform, light.offset);
            const l_dir = mult(transform, light.start_direction);
            light.set_light_transform(pos, l_dir);
        }

    }

    draw_model(shader){
        this.hull.draw_model(shader)
        this.propeller.draw_model(shader)
    }
}

class SubmarineHull extends ModelMesh{
    constructor(gl){
        super(gl, "submarine_v3.obj");
    }

    set_model_transform(transform){
        this.transform = transform;
    }
   
}

class SubmarinePropeller extends ModelMesh{
    constructor(gl){
        super(gl, "submarine_propeller.obj");
        this.angle = Math.PI;
        this.axis = new Quaternion();
    }

    set_model_transform(dir, q_rot, transform){
        this.transform = mult(transform, rotateZ(-180 * this.angle/ Math.PI));
    }

    update(speed, delta_t){
        this.angle += speed * delta_t;
    }
}