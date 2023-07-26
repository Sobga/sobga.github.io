const CHUNK_SIZE = 16;
const CHUNK_HALF = CHUNK_SIZE/2;

const CHUNK_VERTS = [
    vec4(0, 0, 1, 1),
    vec4(0, 1, 1, 1),
    vec4(1, 1, 1, 1),
    vec4(1, 0, 1, 1),
    vec4(0, 0, 0, 1),
    vec4(0, 1, 0, 1),
    vec4(1, 1, 0, 1),
    vec4(1, 0, 0, 1)
]

function init_3d_array(dim){
    const array = [];
    for (var i = 0; i < dim + 1; i++){
        array.push([]);
        for (var j = 0; j < dim + 1; j++){
            array[i].push([]);
            for (var k = 0; k < dim + 1; k++){
                array[i][j].push(1);
            }
        }
    }
    return array;
}

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

    generate_vertices(levels){
        var vertices = [];

        const offset_x = -CHUNK_HALF + this.pos[0] * CHUNK_SIZE;
        const offset_y = -CHUNK_HALF + this.pos[1] * CHUNK_SIZE;
        const offset_z = -CHUNK_HALF + this.pos[2] * CHUNK_SIZE;

        const cube_points = [];
        const cube_levels = [];
        for (var i = 0; i < CHUNK_VERTS.length; i++){
            cube_points.push(vec4(0,0,0,1));
            cube_levels.push(1);
        }

        for (var i = 0; i < CHUNK_SIZE; i++){
            const x = i + offset_x;

            for (var j = 0; j < CHUNK_SIZE; j++){
                const y = j + offset_y;

                for (var k = 0; k < CHUNK_SIZE; k++){
                    const z = k + offset_z;
                
                    // Fetch computed levels
                    for (var m = 0; m < CHUNK_VERTS.length; m++){
                        const cube_offset = CHUNK_VERTS[m];
                    
                        cube_points[m][0] = x + cube_offset[0];
                        cube_points[m][1] = y + cube_offset[1];
                        cube_points[m][2] = z + cube_offset[2];
                        
                        cube_levels[m] = levels[i + cube_offset[0]][j + cube_offset[1]][k + cube_offset[2]];
                    }

                    // Vertices for a single cube
                    var cube_vertices = Polygonise(cube_points, cube_levels, 0);
         
                    // Append new vertices
                    if (cube_vertices.length > 0)
                        vertices.push.apply(vertices, cube_vertices);
                }
            }
        }
        return vertices;
    }
}

class ChunkGenerator extends Model{
    constructor(gl, chunks, sampler, render_distance){
        super(gl);
        this.chunks = chunks;
        this.sampler = sampler;
        this.render_distance = render_distance;
        this.cube_length = 2*render_distance + 1;
        this.current_chunk = null;
        this.current_chunk_vertices = null;

        // Number of vertices for chunk & total vertex count
        this.max_vertex_chunk = get_max_vertex(false) * CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE;
        this.n_chunks = this.chunks.length;
        this.n_vertices = this.n_chunks * this.max_vertex_chunk;

        // Init vertex buffer
        const vertex_buffer = this.add_buffer(ATTRIBUTES.POSITION, 4, gl.FLOAT);
        gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, sizeof['vec4'] * this.n_vertices, gl.STATIC_DRAW);

        // Init normal buffer
        const normal_buffer = this.add_buffer(ATTRIBUTES.NORMAL, 4, gl.FLOAT);
        gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, sizeof['vec4'] * this.n_vertices, gl.STATIC_DRAW);

        // Init color buffer
        const color_buffer = this.add_buffer(ATTRIBUTES.COLOR, 4, gl.FLOAT);
        gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, sizeof['vec4'] * this.n_vertices, gl.STATIC_DRAW);

        //this.free_indices = [0];
        //this.free_positions = [vec3(0,0,0), vec3(0,1,0)];
        this.free_indices = Array.from(Array(this.n_chunks).keys());    
        this.free_positions = get_chunk_positions(this.render_distance, vec3(0,0,0));
        
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
        // Clear from previous generation
        this.chunk_data_ready = false;
        this.free_positions = [];
        this.free_indices = [];

        // Mark each chunk position as not present
        this.chunk_map.forEach((_, key, __) => this.chunk_map.set(key, false));
        for (const chunk of this.chunks){
            // Find index in map and set that to being present
            const chunk_index = this.chunk_index(chunk, offset);
            
            if (this.chunk_map.has(chunk_index))
                this.chunk_map.set(chunk_index, true);
            else{
                // Chunk is not inside render distance anymore. Mark it to be generated again
                chunk.n_vertices = -1;
                this.free_indices.push(chunk.buffer_index);
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
                    this.free_positions.push(chunk_position);
                }
            }
        );
    }

    update_chunks(){
        if (this.free_indices.length == 0)
            return;

        // Spread computation of chunk over 2 frames
        if (this.current_chunk == null){
            // Find next index to generate and chunk position
            const free_index = this.free_indices.shift();
            const position = this.free_positions.shift();
            const chunk = this.chunks[free_index];
            chunk.pos = position;
            this.generate_chunk_data(chunk);
            this.current_chunk = chunk;

        } else{
            // Data is ready for triangulation
            this.chunk_norm_color(this.current_chunk);
            this.current_chunk = null;
        }
    }

    generate_chunk_data(chunk){
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

        // Compute triangulated vertices
        this.current_chunk_vertices = chunk.generate_vertices(this.chunk_levels);
    }

    chunk_norm_color(chunk){
        const vertices = this.current_chunk_vertices;
        const normals = vertices.map((x,_) => normalize(noise_sampler.deriv_norm(x)));
        const colors = vertices.map((vertex, _) => get_color(this.sampler.sample_1d(vertex[1] / 16)));

        chunk.n_vertices = vertices.length;

        // Compute index in buffer
        const index = chunk.buffer_index * this.max_vertex_chunk;

        // Push vertices
        this.set_buffer_sub_data(ATTRIBUTES.POSITION, index * sizeof['vec4'], vertices);

        // Push normals
        this.set_buffer_sub_data(ATTRIBUTES.NORMAL, index * sizeof['vec4'], normals);
        
        // Push colors
        this.set_buffer_sub_data(ATTRIBUTES.COLOR, index * sizeof['vec4'], colors);
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

