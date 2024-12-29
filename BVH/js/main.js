"use strict";
// let main;
window.onload = init;

async function init(){
    const objFile = await (fetch('../AB_COMMON/models/bunny.obj').then(response => response.text()));
    const model =  parseOBJ(objFile);

    // Normalize model to have coordinates 0 - 1
    const modelScale = 1/Math.max(...model.boundingBox.size().values);
    model.transformVertices(v => v.subtract(model.boundingBox.min).scale(modelScale));

    // Create bbox-tree
    const boxes = toBoundedTriangles(model);
    const groupedBoxes = groupBoxes(boxes);
    const corners = new Float32Array(3*2*boxes.length);
    for (let i = 0; i < boxes.length; i++){
        corners.set(boxes[i].min.values, 3*i);
        corners.set(boxes[i].max.values, 3*(i+1));
    }

    // Get WebGPU context
    const canvas = document.querySelector('canvas');
    const adapter = await navigator.gpu?.requestAdapter();
    const device = await adapter?.requestDevice();
    const context = canvas.getContext('webgpu');

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device,
        format: presentationFormat,
    });


    // Upload vertices
    const minMaxCornerBuffer = device.createBuffer({
        label: 'CornerBuffer',
        size: corners.byteLength,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true
    });
    new Float32Array(minMaxCornerBuffer.getMappedRange()).set(corners);
    minMaxCornerBuffer.unmap();

    // Create cube buffers
    const cubeVertices = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        1, 0, 1,
        0, 0, 1,
        0, 1, 0,
        1, 1, 0,
        1, 1, 1,
        0, 1, 1,
    ]);
    const cubeIndices = new Uint16Array([
        0, 1, 2, // Bottom
        0, 2, 3,
        1, 6, 2, // Right
        1, 5, 6,
        2, 7, 3, // Front
        2, 6, 7,
        0, 3, 7, // Left
        0, 7, 4,
        0, 4, 5, // Back
        0, 5, 1,
        4, 6, 5, // Top
        4, 7, 6
    ]);
    const cubeBuffer = device.createBuffer({
        label: 'CubeBuffer',
        size: corners.byteLength,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true
    });
    new Float32Array(cubeBuffer.getMappedRange()).set(cubeVertices);
    cubeBuffer.unmap();

    const indexBuffer = device.createBuffer({
        label: 'Index buffer',
        size: cubeIndices.byteLength,
        usage: GPUBufferUsage.INDEX,
        mappedAtCreation: true
    });
    new Uint16Array(indexBuffer.getMappedRange()).set(cubeIndices);
    indexBuffer.unmap();


    const shaderModule = device.createShaderModule({
        label: 'Cube shaders',
        code: `
        struct Vertex{
            @location(0) cubePosition: vec3f,
            @location(1) minCorner: vec3f,
            @location(2) maxCorner: vec3f
        }
        
        struct VertexOutput{
            @builtin(position) position : vec4f,
            @location(0) color: vec4f
        }
        
        @vertex
        fn main_vs(vert: Vertex) -> VertexOutput{
            var vsOut: VertexOutput;
            vsOut.color = vec4f(1., 0., 0., 1.);
            vsOut.position = vec4f(vert.cubePosition, 1.);
        }
        
        @fragment
        fn main_fs(fsInput: VertexOutput) -> @location(0) vec4f{
            return fsInput.color;
        }
        `
    })
}

class SimpleModel{
    /**
     * @param {Vec3[]} vertices
     * @param {number[]} indices */
    constructor(vertices, indices) {
        this.vertices = vertices;
        this.indices = indices;
        this.boundingBox = BoundingBox3D.fromPositions(vertices);
    }

    /** @param {(Vec3) => Vec3} transform */
    transformVertices(transform){
        this.vertices = this.vertices.map(vertex => transform(vertex));
        this.boundingBox = BoundingBox3D.fromPositions(this.vertices);
    }
}

/**
 * @param {string} objFile
 * @return {SimpleModel}
 *  */
function parseOBJ(objFile){
    const lines = objFile.split('\n');
    const vertices = [];
    const indices = [];
    for (const line of lines){
        const elements = line.split(' ');
        switch (elements[0]){
            case '#': continue;
            case 'v': vertices.push(new Vec3(
                    Number.parseFloat(elements[1]),
                    Number.parseFloat(elements[2]),
                    Number.parseFloat(elements[3])
                ));
                break;
            case 'f':
                indices.push(Number.parseInt(elements[1]) - 1);
                indices.push(Number.parseInt(elements[2]) - 1);
                indices.push(Number.parseInt(elements[3]) - 1);
        }
    }
    return new SimpleModel(vertices, indices);
}


/** @param {SimpleModel} model
 * @return {BoundingBox3D[]} */
function toBoundedTriangles(model){
    const boundingBoxes = [];
    for (let i = 0; i < model.indices.length/3; i++){
        const p = model.vertices[model.indices[3*i]];
        const q = model.vertices[model.indices[3*i + 1]];
        const r = model.vertices[model.indices[3*i + 2]];

        boundingBoxes.push(BoundingBox3D.fromPositions([p, q, r]));
    }
    return boundingBoxes;
}

/** @param {BoundingBox3D[]} boxes */
function groupBoxes(boxes){

}