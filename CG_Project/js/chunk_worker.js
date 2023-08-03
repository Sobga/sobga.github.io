importScripts('../Common/MV.js','colors.js', 'simplex.js', 'noise_sample.js', 'chunk_shared.js', 'marching_cubes.js');

let sampler;
let shared_vertices;
let shared_normals;
let shared_colors;

const levels = init_3d_array(CHUNK_SIZE);

onmessage = function(e){
    const data = e.data;
    const msg_type = data[0];
    switch (msg_type){
        case CHUNK_MSG.SAMPLER:
            sampler = sampler_from_type(data[1], data[2]);
            postMessage("Received sampler");
            break;
        case CHUNK_MSG.BUFFERS:
            shared_vertices = new Float32Array(data[1]);
            shared_normals = new Float32Array(data[2]);
            shared_colors = new Float32Array(data[3]);
            break;
        case CHUNK_MSG.GEN_CHUNK:
            generate_chunk(data[1]);
            break;
        default:
            console.error("No CHUNK_MSG defined for: " + msg_type);
    }
}


function generate_chunk(pos){
    sample_chunk_levels(pos);
    const n_vertices = generate_vertices(pos);
    compute_chunk_data(n_vertices);

    postMessage([CHUNK_MSG.GEN_OK, n_vertices]);
}


function sample_chunk_levels(pos){
    const offset_x = -CHUNK_HALF + pos[0] * CHUNK_SIZE;
    const offset_y = -CHUNK_HALF + pos[1] * CHUNK_SIZE;
    const offset_z = -CHUNK_HALF + pos[2] * CHUNK_SIZE;

    // Sample levels for chunk
    for (var i = 0; i < CHUNK_SIZE + 1; i++){
        const x = i + offset_x; 

        for (var j = 0; j < CHUNK_SIZE + 1; j++){
            const y = j + offset_y;

            for (var k = 0; k < CHUNK_SIZE + 1; k++){
                const z = k + offset_z;
                levels[i][j][k] = sampler.sample_xyz(x, y, z);
            }
        }
    }
}

function generate_vertices(pos){
    var vertex_count = 0;
    const offset_x = -CHUNK_HALF + pos[0] * CHUNK_SIZE;
    const offset_y = -CHUNK_HALF + pos[1] * CHUNK_SIZE;
    const offset_z = -CHUNK_HALF + pos[2] * CHUNK_SIZE;

    const cube_points = [];
    const cube_levels = [];
    for (var i = 0; i < CHUNK_VERTS.length; i++){
        cube_points.push([0,0,0,1]);
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
                for (var ii = 0; ii < cube_vertices.length; ii++){
                    const vertex = cube_vertices[ii];
                    for (var jj = 0; jj < 4; jj++){
                        shared_vertices[4*vertex_count+jj] = vertex[jj];
                    }
                    vertex_count+=1;
                }
            }
        }
    }
    return vertex_count;
}

/**
 * Computes the remaining data for the vertices stored in the shared_vertices array
 * @param {number} n_vertices 
 * @returns {null} 
 */
function compute_chunk_data(n_vertices){
    //const normals = vertices.map((x,_) => normalize(noise_sampler.deriv_norm(x)));
    //const colors = vertices.map((vertex, _) => get_color(this.sampler.sample_1d(vertex[1] / 16)));
    for (var i = 0; i < n_vertices; i++){
        const vertex_start = 4 * i;
        const vertex_x = shared_vertices[vertex_start];
        const vertex_y = shared_vertices[vertex_start + 1];
        const vertex_z = shared_vertices[vertex_start + 2];

        const normal = sampler.deriv_norm_xyz(vertex_x, vertex_y, vertex_z);
        const color = get_color(sampler.sample_1d(vertex_y/16));

        for (var j = 0; j < 4; j++){
            shared_normals[vertex_start + j] = normal[j];
            shared_colors[vertex_start + j] = color[j];
        }
    }
}