"use strict";
// let main;
window.onload = init;

async function init(){
    const objFile = await (fetch('../AB_COMMON/models/bunny.obj').then(response => response.text()));
    const model =  SimpleModel.fromOBJ(objFile);
    let angle = 0;

    // Normalize model to have coordinates 0 - 1
    const modelScale = 1/Math.max(...model.boundingBox.size().values);
    model.transformVertices(v => v.subtract(model.boundingBox.min).scale(modelScale));

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
    const cameraArray = new Float32Array(16 + 6*4);
    const cameraBuffer = device.createBuffer({
        label: 'Camera buffer',
        size: cameraArray.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const offsetArray = new Float32Array(10000 * 3);
    for (let i = 0; i < offsetArray.length; i++){
        offsetArray[i] = 20*(Math.random() * 2 - 1);
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

    const drawIndices = device.createBuffer();
    const indirectDrawBuffer = device.createBuffer();


    const cameraBindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: {type: 'uniform'}
            }
        ]
    });
    const modelShader = new ModelRenderPipeline(device, cameraBindGroupLayout, presentationFormat);

    const cameraBindGroup = device.createBindGroup({
        label: 'Camera bindGroup',
        layout: cameraBindGroupLayout,
        entries: [
            {binding: 0, resource: {buffer: cameraBuffer}}
        ]
    });

    let depthTexture;

    function render(){
        // const position = new Vec3(3 * Math.cos(angle), 0.1, 3*Math.sin(angle));
        camera.setPosition(new Vec3(0,0,0), new Vec3(Math.cos(angle), 0, Math.sin(angle)));
        angle += 0.01;
        const frustum = camera.getWorldFrustum();
        cameraArray.set(camera._viewProjection.values, 0);
        for (let i = 0; i < 6; i++){
            cameraArray.set(frustum[i].values, 16 + 4*i);
        }
        device.queue.writeBuffer(cameraBuffer, 0, cameraArray);


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
        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(modelShader.pipeline);
        pass.setVertexBuffer(0, vertexBuffer);
        pass.setVertexBuffer(1, offsetBuffer);
        pass.setIndexBuffer(indexBuffer, 'uint16');
        pass.setBindGroup(0, cameraBindGroup);
        pass.drawIndexed(indexArray.length, offsetArray.length / 3);
        pass.end();

        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}