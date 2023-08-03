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
        this.n_vertices = -1;
    }
}

class ChunkGenerator extends Model{
    constructor(gl, chunks, sampler, render_distance){
        super(gl);
        this.chunks = chunks;
        this.sampler = sampler;
        this.render_distance = render_distance;
        this.cube_length = 2*render_distance + 1;
        
        this.chunk_worker = new Worker("js/chunk_worker.js");
        this.active_chunk = null;
        const this_local = this;

        // Called when chunk has finished building
        this.chunk_worker.onmessage = function(e){
            const data = e.data
            const msg_type = data[0];
            
            if (msg_type != CHUNK_MSG.GEN_OK){
                console.log(e.data);
                return;
            }

            this_local.upload_chunk_data(this_local.active_chunk, data[1]);
        }
        
        // Send used sampler
        this.chunk_worker.postMessage([CHUNK_MSG.SAMPLER, sampler.sampler_type(), sampler.sampler_args()]);

        // Number of vertices for chunk & total vertex count
        this.max_vertex_chunk = get_max_vertex(false) * CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE;

        // Create sharedbuffers to send to WebWorker
        const shared_vertices   = new SharedArrayBuffer(4*this.max_vertex_chunk);
        const shared_normals    = new SharedArrayBuffer(4*this.max_vertex_chunk);
        const shared_colors     = new SharedArrayBuffer(4*this.max_vertex_chunk);

        this.chunk_worker.postMessage([CHUNK_MSG.BUFFERS, shared_vertices, shared_normals, shared_colors]);

        // Create own view of shared arrays
        this.vertex_storage = new Float32Array(shared_vertices);
        this.normal_storage = new Float32Array(shared_normals);
        this.color_storage = new Float32Array(shared_colors);
        
        const max_vertices = this.chunks.length * this.max_vertex_chunk; // Maximum number of vertices in total
        
        // Init vertex buffer on GPU
        const vertex_buffer = this.add_buffer(ATTRIBUTES.POSITION, 4, gl.FLOAT);
        gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, sizeof['vec4'] * max_vertices, gl.STATIC_DRAW);

        // Init normal buffer
        const normal_buffer = this.add_buffer(ATTRIBUTES.NORMAL, 4, gl.FLOAT);
        gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, sizeof['vec4'] * max_vertices, gl.STATIC_DRAW);

        // Init color buffer
        const color_buffer = this.add_buffer(ATTRIBUTES.COLOR, 4, gl.FLOAT);
        gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, sizeof['vec4'] * max_vertices, gl.STATIC_DRAW);

        this.missing_indices = Array.from(Array(this.chunks.length).keys());    
        this.chunk_queue = get_chunk_positions(this.render_distance, vec3(0,0,0));
        
        // Map to determine which chunks are missing when center is moved
        this.chunk_map = new Map();
        for (const chunk of this.chunks){
            this.chunk_map.set(this.chunk_hash(chunk, vec3(0,0,0)), false);
        }
    }

    chunk_hash_xyz(x, y, z, offset){
        const px = x - offset[0];
        const py = y - offset[1];
        const pz = z - offset[2];

        return px + this.render_distance + (py + this.render_distance) * this.cube_length + (pz + this.render_distance) * this.cube_length * this.cube_length;
    }
    
    chunk_hash(chunk, offset){
        return this.chunk_hash_xyz(chunk.pos[0], chunk.pos[1], chunk.pos[2], offset);
    }

    inverse_chunk_hash(index){
        const chunk_sq = this.cube_length * this.cube_length;

        const x = index % this.cube_length - this.render_distance;
        const y = Math.floor((index % chunk_sq) / this.cube_length) - this.render_distance;
        const z = Math.floor(index/chunk_sq) - this.render_distance;

        return vec3(x,y,z);
    }

    start_generator(offset){
        // Clear from previous generation
        this.chunk_queue = [];
        this.missing_indices = [];

        // Mark each chunk position as not present
        this.chunk_map.forEach((_, key, __) => this.chunk_map.set(key, false));
        for (const chunk of this.chunks){
            // Find index in map and set that to being present
            const chunk_index = this.chunk_hash(chunk, offset);
            
            if (this.chunk_map.has(chunk_index))
                this.chunk_map.set(chunk_index, true);
            else{
                // Chunk is not inside render distance anymore. Mark it to be generated again
                chunk.n_vertices = -1;
                this.missing_indices.push(chunk.buffer_index);
            }
        }

        // Find missing positions and add to queue
        this.chunk_map.forEach(
            (is_present, element, _) => {
                if (!is_present){
                    const chunk_position = this.inverse_chunk_hash(element);
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
        if (this.missing_indices.length == 0 || this.active_chunk != null)
            return;

        // Find empty chunk
        const free_index = this.missing_indices.shift();    
        const chunk = this.chunks[free_index];
        chunk.pos = this.chunk_queue.shift();

        this.active_chunk = chunk;

        // Send to worker
        this.chunk_worker.postMessage([CHUNK_MSG.GEN_CHUNK, chunk.pos]);
    }

    upload_chunk_data(chunk, n_vertices){
        // Compute index in buffer
        const buffer_index = chunk.buffer_index * this.max_vertex_chunk * sizeof['vec4'];

        // Push vertices
        //this.set_buffer_sub_data(ATTRIBUTES.POSITION, index, vertices);
        this.set_buffer_sub_data_length(ATTRIBUTES.POSITION, buffer_index, this.vertex_storage, 4*n_vertices);

        // Push normals
        //this.set_buffer_sub_data(ATTRIBUTES.NORMAL, index * sizeof['vec4'], normals);
        this.set_buffer_sub_data_length(ATTRIBUTES.NORMAL, buffer_index, this.normal_storage, 4*n_vertices);
        
        // Push colors
        //this.set_buffer_sub_data(ATTRIBUTES.COLOR, index * sizeof['vec4'], colors);
        this.set_buffer_sub_data_length(ATTRIBUTES.COLOR, buffer_index, this.color_storage, 4*n_vertices);
        chunk.n_vertices = n_vertices;
        this.active_chunk = null;
    }

    draw(){
        for (const chunk of this.chunks){
            // The current chunk must have data in the buffers
            if (chunk.n_vertices < 0)
                continue;
            this.gl.drawArrays(this.gl.TRIANGLES, chunk.buffer_index * this.max_vertex_chunk, chunk.n_vertices);
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
