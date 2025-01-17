"use strict";
// let main;
window.onload = init;

async function init(){
    const objFile = await (fetch('../AB_COMMON/models/bunny.obj').then(response => response.text()));
    const model =  parseOBJ(objFile);
    let angle = 0;

    // Normalize model to have coordinates 0 - 1
    const modelScale = 1/Math.max(...model.boundingBox.size().values);
    model.transformVertices(v => v.subtract(model.boundingBox.min).scale(modelScale));

    // Create bbox-tree
    const boxes = toBoundedTriangles(model);
    const groupedBoxes = groupBoxes(boxes);
    const corners = new Float32Array(3*2*boxes.length);
    for (let i = 0; i < boxes.length; i++){
        corners.set(boxes[i].min.values, 6*i);
        corners.set(boxes[i].max.values, 6*i+3);
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

    const camera = new Camera().setPosition(new Vec3(0, 0, -3), new Vec3(0, 0, 1)).setPerspective(60, 1, 0.1, 100);
    const cameraBuffer = device.createBuffer({
        label: 'Camera buffer',
        size: 16 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
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
        0, 1, 0,
        1, 1, 0,
        0, 0, 1,
        1, 0, 1,
        0, 1, 1,
        1, 1, 1,
    ]);
    const cubeIndices = new Uint16Array([
        0, 2, 1, // Front
        1, 2, 3,
        0, 1, 4, // Bottom
        1, 5, 4,
        0, 4, 6, // Right
        0, 6, 2,
        4, 7, 6, // Back
        4, 5, 7,
        1, 3, 5, // Left,
        3, 7, 5,
        2, 6, 7, // Top
        2, 7, 3

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
        struct Camera{
            viewProjection: mat4x4<f32>,
        }
        
        struct Vertex{
            @builtin(vertex_index) vIdx: u32,
            @location(0) cubePosition: vec3f,
            @location(1) minCorner: vec3f,
            @location(2) maxCorner: vec3f
        }
        
        struct VertexOutput{
            @builtin(position) position : vec4f,
            @location(0) color: vec4f
        }
        
        
        @group(0) @binding(0) var<uniform> camera: Camera;
        @vertex
        fn main_vs(vert: Vertex) -> VertexOutput{
            var vsOut: VertexOutput;
            vsOut.color = vec4f(vert.cubePosition, 1.);
//            vsOut.color = vec4f(select(vec3(1., 0., 0.), vec3(0., 1., 0.), face), 1.);
            vsOut.position = camera.viewProjection * vec4(
                select(vert.minCorner.x, vert.maxCorner.x, (vert.vIdx & 1) > 0),
                select(vert.minCorner.y, vert.maxCorner.y, (vert.vIdx & 2) > 0),
                select(vert.minCorner.z, vert.maxCorner.z, (vert.vIdx & 4) > 0),
                1
            );
            return vsOut;
        }
        
        @fragment
        fn main_fs(fsInput: VertexOutput) -> @location(0) vec4f{
            return fsInput.color;
//                fsInput.color
//            return vec4f(select(vec3(1., 0., 0.), vec3(0., 1., 0.), face), 1.);;
        }
        `
    })
    const pipeline = device.createRenderPipeline({
        label: 'Cube shader',
        layout: 'auto',
        vertex: {
            module: shaderModule,
            buffers: [
                {
                    arrayStride: 3 * 4,
                    attributes: [
                        {shaderLocation: 0, offset: 0, format: "float32x3"}
                    ]
                },
                {
                    arrayStride: 6 * 4,
                    stepMode: 'instance',
                    attributes: [
                        {shaderLocation: 1, offset: 0, format: "float32x3"},
                        {shaderLocation: 2, offset: 12, format: "float32x3"},
                    ]
                }
            ]
        },
        fragment: {
            module: shaderModule,
            targets: [{format: presentationFormat}]
        },
        primitive: {
            topology: 'triangle-list',
            frontFace: 'ccw',
            cullMode: 'none'
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: "depth24plus"
        }
    });

    const renderPassDescriptor = {
        label: 'Basic cube render-pass',
        colorAttachments: [{
            view: null,
            clearValue: [0.3, 0.3, 0.3, 1.],
            loadOp: 'clear',
            storeOp: 'store'
        }],
        depthStencilAttachment: {
            view: null,
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store'
        }
    }

    const cameraBindGroup = device.createBindGroup({
        label: 'Camera bindGroup',
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {binding: 0, resource: {buffer: cameraBuffer}}
        ]
    });

    let depthTexture;

    function render(){
        const position = new Vec3(3 * Math.cos(angle), -1, 3*Math.sin(angle));
        camera.setPosition(position, position.normalizeNew().scale(-1));
        angle += 0.01;
        device.queue.writeBuffer(cameraBuffer, 0, camera._viewProjection.values);


        const canvasTexture = context.getCurrentTexture();
        if (isNullOrUndefined(depthTexture) || depthTexture.width !== canvasTexture.width || depthTexture.height !== canvasTexture.height) {
            if (!isNullOrUndefined(depthTexture)) {
                depthTexture.destroy();
            }
            depthTexture = device.createTexture({
                size: [canvasTexture.width, canvasTexture.height],
                format: 'depth24plus',
                usage: GPUTextureUsage.RENDER_ATTACHMENT
            });
        }
        renderPassDescriptor.colorAttachments[0].view = canvasTexture.createView();
        renderPassDescriptor.depthStencilAttachment.view = depthTexture.createView();


        const encoder = device.createCommandEncoder({label: 'Command encoder'});
        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);
        pass.setVertexBuffer(0, cubeBuffer);
        pass.setVertexBuffer(1, minMaxCornerBuffer);
        pass.setVertexBuffer(2, minMaxCornerBuffer);
        pass.setIndexBuffer(indexBuffer, 'uint16');
        pass.setBindGroup(0, cameraBindGroup);
        pass.drawIndexed(cubeIndices.length, boxes.length);
        pass.end();

        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
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