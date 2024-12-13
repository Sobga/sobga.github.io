"use strict";

async function introduction() {
    const adapter = await navigator.gpu?.requestAdapter();
    const device = await adapter?.requestDevice();
    if (!device) {
        fail('need a browser that supports WebGPU');
        return;
    }

    // Get a WebGPU context from the canvas and configure it
    const canvas = document.querySelector('canvas');
    const context = canvas.getContext('webgpu');
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device,
        format: presentationFormat,
    });

    const module = device.createShaderModule({
        label: 'Hardcoded red triangle shaders',
        code: `
        @vertex fn vs(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f{
            let pos = array(
                vec2f( 0.0,  0.5),
                vec2f(-0.5, -0.5),
                vec2f( 0.5, -0.5),
            );
            return vec4f(pos[vertexIndex], 0.0, 1.0);
        }

        @fragment fn fs() -> @location(0) vec4f{
            return vec4f(1.0, 0.0, 0.0, 1.0);
        }
        `
    })
    const pipeline = device.createRenderPipeline({
        label: 'Red triangle pipeline',
        layout: 'auto',
        vertex: {
            module
        },
        fragment: {
            module,
          targets: [{format: presentationFormat}]
        }
    });

    const renderPassDescriptor = {
        label: 'Basic canvas render-pass',
        colorAttachments: [
            {
                view: null,
                clearValue: [0.3, 0.3, 0.3, 1],
                loadOp: 'clear',
                storeOp: 'store'
            }
        ]
    };

    function render(){
        // Get the current texture from the canvas context and
        // set it as the texture to render to.
        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
        const encoder = device.createCommandEncoder({label: 'Command encoder'});
        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);
        pass.draw(3);
        pass.end()
        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
    }
    render();
}

async function introduction2(){
	const adapter = await navigator.gpu?.requestAdapter();
	const device = await adapter?.requestDevice();
	if (!device) {
		fail('need a browser that supports WebGPU');
		return;
	}

	const module = device.createShaderModule({
		label: 'Doubling compute module',
		code: `
		@group(0) @binding(0) var<storage, read_write> data: array<f32>;
		
		@compute @workgroup_size(1) fn computeSomething(@builtin(global_invocation_id) id: vec3u){
			let i = id.x;
			data[i] = data[i] * 2.0;
		} 
		`
	});

	const pipeline = device.createComputePipeline({
		label: 'Doubling compute pipeline',
		layout: 'auto',
		compute: {module}
	});
	const input = new Float32Array([1, 3, 5]);
	const workBuffer = device.createBuffer({
		label: 'workBuffer',
		size: input.byteLength, // Size in bytes
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
	});
	device.queue.writeBuffer(workBuffer, 0, input);
	const resultBuffer = device.createBuffer({
		label: 'resultBuffer',
		size: input.byteLength,
		usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
	});

	const bindGroup = device.createBindGroup({
		label: 'BindGroup for work buffer',
		layout: pipeline.getBindGroupLayout(0),
		entries: [{
			binding: 0,
			resource: {buffer: workBuffer}
		}]
	});

	// Encode commands to do the computation
	const encoder = device.createCommandEncoder({
		label: 'Doubling command encoder'
	});
	const pass = encoder.beginComputePass({
		label: 'Doubling compute pass',
	});
	pass.setPipeline(pipeline);
	pass.setBindGroup(0, bindGroup);
	pass.dispatchWorkgroups(input.length);
	pass.end();

	// Encode a command to copy the results to a mappable buffer.
	encoder.copyBufferToBuffer(workBuffer, 0, resultBuffer, 0, resultBuffer.size);

	// Finish and submit
	const commandBuffer = encoder.finish();
	device.queue.submit([commandBuffer]);

	// Read results
	await resultBuffer.mapAsync(GPUMapMode.READ);
	const result = new Float32Array(resultBuffer.getMappedRange());
	console.log(result);
}
introduction();