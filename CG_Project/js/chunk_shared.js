const CHUNK_SIZE = 16;
const CHUNK_HALF = CHUNK_SIZE/2;

const CHUNK_MSG = {
    SAMPLER: 0,
    BUFFERS: 1,
    GEN_CHUNK: 2,
    GEN_OK: 3
}

const CHUNK_VERTS = [
    [0, 0, 1, 1],
    [0, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 0, 1, 1],
    [0, 0, 0, 1],
    [0, 1, 0, 1],
    [1, 1, 0, 1],
    [1, 0, 0, 1]
]


// TODO: Use flat array and bitmask into it?
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





