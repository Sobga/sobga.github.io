"use strict";
// let main;
window.onload = init;

async function init(){
    const objFile = await (fetch('../AB_COMMON/models/bunny.obj').then(response => response.text()));
    const model =  SimpleModel.fromOBJ(objFile);
    let angle = 0;

    // Normalize model to have coordinates 0 - 1
    const modelInvScale = 1/Math.max(...model.boundingBox.size().values);
    model.transformVertices(v => v.subtract(model.boundingBox.center).scale(modelInvScale));

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
    const cameraArray = new Float32Array(2*16 + 6*4);
    const cameraBuffer = device.createBuffer({
        label: 'Camera buffer',
        size: cameraArray.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const nBunnies = 25000;
    const offsetArray = new Float32Array(4 * nBunnies);
    for (let i = 0; i < nBunnies; i++){
        offsetArray[4*i] = 30*(Math.random() * 2 - 1);
        offsetArray[4*i+1] = 30*(Math.random() * 2 - 1);
        offsetArray[4*i+2] = 30*(Math.random() * 2 - 1);
    }
    const offsetBuffer = device.createBuffer({
        label: 'Offset buffer',
        size: offsetArray.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
        mappedAtCreation: true
    });
    new Float32Array(offsetBuffer.getMappedRange()).set(offsetArray);
    offsetBuffer.unmap();

    const vertexArray = new Float32Array(model.vertices.flatMap(v => [v.x, v.y, v.z]));
    const vertexBuffer = device.createBuffer({
        label: 'Vertex buffer',
        size: vertexArray.byteLength,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true
    });
    new Float32Array(vertexBuffer.getMappedRange()).set(vertexArray);
    vertexBuffer.unmap();

    const indexArray = new Uint16Array(model.indices);
    const indexBuffer = device.createBuffer({
        label: 'Index buffer',
        size: indexArray.byteLength,
        usage: GPUBufferUsage.INDEX,
        mappedAtCreation: true
    });
    new Uint16Array(indexBuffer.getMappedRange()).set(indexArray);
    indexBuffer.unmap();

    const drawIndices = device.createBuffer({
        label: 'Draw index buffer',
        size: 4 * offsetArray.length,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
    });
    const indirectDrawBuffer = device.createBuffer({
        label: 'Indirect draw buffer',
        size: 4 * 5,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST,
    });


    const renderBindGroupLayout = device.createBindGroupLayout({
        label: 'Rendering bind group layout',
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: {type: 'uniform'}
            }, {
                binding: 1,
                visibility: GPUShaderStage.VERTEX,
                buffer: {type: 'read-only-storage'}
            }
        ]
    });

    const cullingBindGroupLayout = device.createBindGroupLayout({
        label: 'Culling bind group layout',
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {type: 'uniform'}
            }, {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {type: 'read-only-storage'}
            }, {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {type: 'storage'}
            }, {
                binding: 3,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {type: 'storage'}
            },
        ]
    });

    const modelShader = new ModelRenderPipeline(device, renderBindGroupLayout, presentationFormat);
    const modelCulling = new ModelCullingPipeline(device, cullingBindGroupLayout);

    const renderBindGroup = device.createBindGroup({
        label: 'Rendering bindGroup',
        layout: renderBindGroupLayout,
        entries: [
            {binding: 0, resource: {buffer: cameraBuffer}},
            {binding: 1, resource: {buffer: offsetBuffer}}
        ]
    });

    const cullingBindGroup = device.createBindGroup({
        label: 'Culling bindGroup',
        layout: cullingBindGroupLayout,
        entries: [
            {binding: 0, resource: {buffer: cameraBuffer}},
            {binding: 1, resource: {buffer: offsetBuffer}},
            {binding: 2, resource: {buffer: drawIndices}},
            {binding: 3, resource: {buffer: indirectDrawBuffer}}
        ]
    });

    let depthTexture;

    function render(){
        // const position = new Vec3(3 * Math.cos(angle), 0.1, 3*Math.sin(angle));
        camera.setPosition(new Vec3(0,0,0), new Vec3(Math.cos(angle), 0, Math.sin(angle)));
        angle += 0.01;
        const frustum = camera.getWorldFrustum();
        cameraArray.set(camera._viewMatrix.values, 0);
        cameraArray.set(camera._viewProjection.values, 16);
        for (let i = 0; i < 6; i++){
            cameraArray.set(frustum[i].values, 2*16 + 4*i);
        }
        device.queue.writeBuffer(cameraBuffer, 0, cameraArray);
        device.queue.writeBuffer(indirectDrawBuffer, 0, new Uint32Array([indexArray.length, 0, 0, 0, 0]));


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


        const renderPassDescriptor = modelShader.getRenderPassDescriptor();
        renderPassDescriptor.colorAttachments[0].view = canvasTexture.createView();
        renderPassDescriptor.depthStencilAttachment.view = depthTexture.createView();


        const encoder = device.createCommandEncoder({label: 'Command encoder'});
        encoder.pushDebugGroup('Culling pass');
        const computePass = encoder.beginComputePass();
        computePass.setPipeline(modelCulling.pipeline);
        computePass.setBindGroup(0, cullingBindGroup);
        computePass.dispatchWorkgroups(Math.ceil(offsetArray.length / 64));
        computePass.end();
        encoder.popDebugGroup();
        encoder.pushDebugGroup('Rendering pass');

        const renderPass = encoder.beginRenderPass(renderPassDescriptor);
        renderPass.setPipeline(modelShader.pipeline);
        renderPass.setVertexBuffer(0, vertexBuffer);
        renderPass.setVertexBuffer(1, drawIndices);
        renderPass.setIndexBuffer(indexBuffer, 'uint16');
        renderPass.setBindGroup(0, renderBindGroup);
        renderPass.drawIndexedIndirect(indirectDrawBuffer, 0);
        renderPass.end();
        encoder.popDebugGroup();

        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}