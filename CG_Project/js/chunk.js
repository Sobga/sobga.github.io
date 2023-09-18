function get_chunk_positions(render_distance, offset){
    // Computes the chunks inside the render distance
    const positions = []
    const r_sq = render_distance * render_distance;
    for (var x = -render_distance; x <= render_distance; x++){
        for (var y = -render_distance; y <= render_distance; y++){
            const xy_sq = x*x + y*y;
            if (xy_sq > r_sq)
                continue;

            for (var z = -render_distance; z <= render_distance; z++){
                if (xy_sq + z*z < r_sq)
                    positions.push(vec3(x + offset[0],y + offset[1],z + offset[2]));
            }
        }
    }
    return positions;
}

class ChunkEntry{
    // Center of cube
    constructor(pos, index){
        this.pos = pos;
        this.buffer_index = index;
        this.n_unique = -1;
        this.n_vertices = -1;
        this.is_ready = false;
    }
}

class ChunkGenerator extends Model{
    constructor(gl, chunks, sampler, render_distance){
        super(gl, null, true);
        this.chunks = chunks;
        this.sampler = sampler;
        this.render_distance = render_distance;
        this.cube_length = 2*render_distance + 1;
        this.t_start = performance.now();
        this.mesher = new ChunkMesher(CHUNK_SIZE);

        // Number of vertices for chunk & total vertex count
        this.max_vertex_chunk = get_max_vertex(false) * CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE;
        this.vertex_storage = new Float32Array(4 * this.max_vertex_chunk);
        this.normal_storage = new Float32Array(4 * this.max_vertex_chunk);
        this.color_storage = new Float32Array(4 * this.max_vertex_chunk);
        this.index_storage = new Uint32Array(this.max_vertex_chunk);
        
        const max_vertices = this.chunks.length * this.max_vertex_chunk; // Maximum number of vertices in total
        
        // Init vertex buffer
        const vertex_buffer = this.get_buffer(ATTRIBUTES.POSITION);
        gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, sizeof['vec3'] * max_vertices, gl.DYNAMIC_DRAW);

        // Init normal buffer
        const normal_buffer = this.get_buffer(ATTRIBUTES.NORMAL);
        gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, sizeof['vec3'] * max_vertices, gl.DYNAMIC_DRAW);

        // Init color buffer
        const color_buffer = this.get_buffer(ATTRIBUTES.COLOR);
        gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, sizeof['vec4'] * max_vertices, gl.DYNAMIC_DRAW);

        // Init index buffer
        const index_buffer = this.get_buffer(ATTRIBUTES.INDEX);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, 4 * max_vertices, gl.DYNAMIC_DRAW);


        this.missing_indices = Array.from(Array(this.chunks.length).keys());    
        this.chunk_queue = get_chunk_positions(this.render_distance, vec3(0,0,0));
        
        // Map to determine which chunks are missing when center is moved
        this.chunk_map = new Map();
        for (const chunk of this.chunks){
            this.chunk_map.set(this.chunk_index(chunk, vec3(0,0,0)), false);
        }

        this.chunk_levels = init_3d_array(CHUNK_SIZE);
    }

    chunk_index_xyz(x, y, z, offset){
        const px = x - offset[0];
        const py = y - offset[1];
        const pz = z - offset[2];

        return px + this.render_distance + (py + this.render_distance) * this.cube_length + (pz + this.render_distance) * this.cube_length * this.cube_length;
    }
    
    chunk_index(chunk, offset){
        return this.chunk_index_xyz(chunk.pos[0], chunk.pos[1], chunk.pos[2], offset);
    }

    inverse_chunk_index(index){
        const chunk_sq = this.cube_length * this.cube_length;

        const x = index % this.cube_length - this.render_distance;
        const y = Math.floor((index % chunk_sq) / this.cube_length) - this.render_distance;
        const z = Math.floor(index/chunk_sq) - this.render_distance;

        return vec3(x,y,z);
    }

    start_generator(offset){
        this.t_start = performance.now();

        // Clear from previous generation
        this.chunk_data_ready = false;
        this.chunk_queue = [];
        this.missing_indices = [];

        // Mark each chunk position as not present
        this.chunk_map.forEach((_, key, __) => this.chunk_map.set(key, false));
        for (const chunk of this.chunks){
            // Find index in map and set that to being present
            const chunk_index = this.chunk_index(chunk, offset);
            
            if (this.chunk_map.has(chunk_index))
                this.chunk_map.set(chunk_index, true);
            else{
                // Chunk is not inside render distance anymore. Mark it to be generated again
                chunk.is_ready = false;
                this.missing_indices.push(chunk.buffer_index);
            }
        }

        // Compute missing positions
        this.chunk_map.forEach(
            (is_present, element, _) => {
                if (!is_present){
                    const chunk_position = this.inverse_chunk_index(element);
                    chunk_position[0] += offset[0];
                    chunk_position[1] += offset[1];
                    chunk_position[2] += offset[2];
                    this.chunk_queue.push(chunk_position);
                }
            }
        );
    }

    update_chunks(){
        // Are we done generating?
        if (this.missing_indices.length == 0){
            if (this.t_start != null){
                const t_end = performance.now();
                console.log(`Generating chunks took ${t_end-this.t_start}ms`);
                this.t_start = null;
            }
            return;
        }
            
        // Find empty chunk
        const free_index = this.missing_indices.shift();    
        const chunk = this.chunks[free_index];
        chunk.pos = this.chunk_queue.shift();
        
        // Generate and upload data
        this.sample_chunk_levels(chunk);
        this.generate_vertices(chunk);
        this.compute_chunk_data(chunk);
        this.upload_chunk_data(chunk);
    }

    sample_chunk_levels(chunk){
        const offset_x = -CHUNK_HALF + chunk.pos[0] * CHUNK_SIZE;
        const offset_y = -CHUNK_HALF + chunk.pos[1] * CHUNK_SIZE;
        const offset_z = -CHUNK_HALF + chunk.pos[2] * CHUNK_SIZE;

        // Sample levels for chunk
        for (var i = 0; i < CHUNK_SIZE + 1; i++){
            const x = i + offset_x; 

            for (var j = 0; j < CHUNK_SIZE + 1; j++){
                const y = j + offset_y;

                for (var k = 0; k < CHUNK_SIZE + 1; k++){
                    const z = k + offset_z;
                    this.chunk_levels[i][j][k] = this.sampler.sample_xyz(x, y, z);
                }
            }
        }
    }

    generate_vertices(chunk){
        const buffer_offset = chunk.buffer_index * this.max_vertex_chunk;
        const data = this.mesher.mesh_chunk(this.chunk_levels, chunk, buffer_offset);
        const vertices = data[0];
        const indices = data[1];

        for (var i = 0; i < vertices.length; i++){
            const storage_offset = 3*i;
            const vertex = vertices[i];
            this.vertex_storage[storage_offset] = vertex[0];
            this.vertex_storage[storage_offset + 1] = vertex[1];
            this.vertex_storage[storage_offset + 2] = vertex[2];
        }

        for (var i = 0; i < indices.length; i++){
            this.index_storage[i] = indices[i];
        }

        chunk.n_unique = vertices.length;
        chunk.n_vertices = indices.length;
        /*
        for (var i = 0; i < indices.length; i++){
            const vertex = vertices[indices[i] - buffer_offset];
            const storage_offset = 3*i;
            this.vertex_storage[storage_offset]   = vertex[0];
            this.vertex_storage[storage_offset+1] = vertex[1];
            this.vertex_storage[storage_offset+2] = vertex[2];
        }*/

        //console.log(`Indexing saved: ${100*(1 - vertices.length/indices.length)>>>0}% vertices.`);
    }

    compute_chunk_data(chunk){
        for (var i = 0; i < chunk.n_unique; i++){
            const vertex_start = 3 * i;
            
            const vertex_x = this.vertex_storage[vertex_start];
            const vertex_y = this.vertex_storage[vertex_start + 1];
            const vertex_z = this.vertex_storage[vertex_start + 2];

            const normal = this.sampler.deriv_norm3_xyz(vertex_x, vertex_y, vertex_z);
            const color = get_color(this.sampler.sample_1d(vertex_y/16));

            for (var j = 0; j < 3; j++){
                this.normal_storage[vertex_start + j] = normal[j];
            }

            const color_offset = 4*i;
            for (var j = 0; j < 4; j++){
                this.color_storage[color_offset + j] = color[j];
            }
        }
    }

    upload_chunk_data(chunk){
        // Compute index in buffer
        const buffer_offset = chunk.buffer_index * this.max_vertex_chunk;
        const byte_length   = sizeof['vec3'] * chunk.n_unique;
        const buffer_index  = sizeof['vec3'] * buffer_offset;

        const color_length  = sizeof['vec4'] * chunk.n_unique;
        const color_index   = sizeof['vec4'] * buffer_offset;

        // Push vertices
        this.set_buffer_sub_data_length(ATTRIBUTES.POSITION, buffer_index, this.vertex_storage, byte_length);

        // Push normals
        this.set_buffer_sub_data_length(ATTRIBUTES.NORMAL, buffer_index, this.normal_storage, byte_length);
        
        // Push colors
        this.set_buffer_sub_data_length(ATTRIBUTES.COLOR, color_index, this.color_storage, color_length);

        // Push indices
        this.set_buffer_sub_data_length(ATTRIBUTES.INDEX, buffer_offset, this.index_storage, chunk.n_vertices);
        chunk.is_ready = true;
    }

    draw(){
        for (const chunk of this.chunks){
            // The current chunk must have data in the buffers
            if (!chunk.is_ready)
                continue;
            this.gl.drawElements(this.gl.TRIANGLES, chunk.n_vertices, this.gl.UNSIGNED_INT, chunk.buffer_index * this.max_vertex_chunk);
            //gl.drawElements(gl.TRIANGLES, this.n_vertices, gl.UNSIGNED_INT, 0);
        }
    }
}

function outside(element){
    return Math.abs(element) > 0.75;
}

class ChunkManager{
    // TODO: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer

    // Store 3x3 chunks which is the "safe" zone 
    constructor(gl, sampler, render_distance){
        this.chunks = get_chunk_positions(render_distance, vec3(0,0,0)).map((position, index) => new ChunkEntry(position, index));  
        this.chunk_generator = new ChunkGenerator(gl, this.chunks, sampler, render_distance);
        this.render_distance = render_distance;
        this.center = vec3(0,0,0);
    }

    // Called once each frame
    update_chunks(pos){
        // Determine if still inside "safe" zone
        const offset = [];
        for (var i = 0; i < 3; i++)
                offset[i] = (pos[i] - this.center[i] * CHUNK_SIZE)/ CHUNK_SIZE;

        if (offset.some(outside)){
            // Set center to new centered chunk
            for (var i = 0; i < 3; i++){
                const new_pos = (pos[i] + CHUNK_HALF) / CHUNK_SIZE;
                this.center[i] = Math.floor(new_pos);
            }

            // Signal that chunks must be generated again
            this.chunk_generator.start_generator(this.center);
        } else
            // Let chunk generator generate a new chunk if needed
            this.chunk_generator.update_chunks();
    }

    draw_chunks(shader){
        this.chunk_generator.draw_model(shader);
    }
}
