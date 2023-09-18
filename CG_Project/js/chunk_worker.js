importScripts('../Common/MV.js','colors.js', 'simplex.js', 'noise_sample.js', 'chunk_shared.js', 'marching_cubes.js');

let sampler;

const max_vertex_chunk = get_max_vertex(false) * CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE;
const levels = init_3d_array(CHUNK_SIZE);
const mesher = new ChunkMesher(CHUNK_SIZE);

var vertices;
var normals;
var colors;
var indices;
var buffers;

// Called when worker receives a message from main thread
onmessage = function(e){
    const data = e.data;
    switch (data["type"]){
        // Setup specific samler
        case CHUNK_MSG.SAMPLER:
            sampler = sampler_from_type(data["sampler_type"], data["sampler_args"]);
            break;
        case CHUNK_MSG.GEN_CHUNK:
            buffers = data["buffers"];
            vertices= buffers[0];
            normals = buffers[1];
            colors  = buffers[2];
            indices = buffers[3];

            generate_chunk(data["pos"], data["idx"]);
            break;
        default:
            console.error("No CHUNK_MSG defined for: " + data["type"]);
    }
}

function generate_chunk(pos, idx){
    sample_chunk_levels(pos);
    const vertex_data = generate_vertices(pos, idx);
    const n_vertices = vertex_data[0];
    const n_unique = vertex_data[1]

    compute_chunk_data(n_unique);

    const data = {
        "type" : CHUNK_MSG.GEN_OK,
        "n_vertices": n_vertices,
        "n_unique": n_unique,
        "buffers": buffers
    };
    postMessage(data, buffers.map(buffer => buffer.buffer));
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

function generate_vertices(pos, idx){
    const buffer_offset = idx * max_vertex_chunk;
    return mesher.mesh_chunk(levels, pos, vertices, indices, buffer_offset);
}


function compute_chunk_data(n_unique){
    for (var i = 0; i < n_unique; i++){
        const vertex_start = 3 * i;
        
        const vertex_x = vertices[vertex_start];
        const vertex_y = vertices[vertex_start + 1];
        const vertex_z = vertices[vertex_start + 2];

        const normal = sampler.deriv_norm3_xyz(vertex_x, vertex_y, vertex_z);
        const color = get_color(sampler.sample_1d(vertex_y/16));

        for (var j = 0; j < 3; j++){
            normals[vertex_start + j] = normal[j];
        }

        const color_offset = 4*i;
        for (var j = 0; j < 4; j++){
            colors[color_offset + j] = color[j];
        }
    }
}