"use strict";

async function init(){
	const canvas = document.querySelector('canvas');
	const adapter = await navigator.gpu?.requestAdapter();
	const device = await adapter?.requestDevice();
	const context = canvas.getContext('webgpu');

	const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
	context.configure({
		device,
		format: presentationFormat,
	});

	const floatsPrPoint = 4;
	const floatByteSize = 4;
	const pointVertexSize = floatByteSize*floatsPrPoint;
	const points = [];
	const nPoints = 500000;
	for (let i = 0; i < nPoints; i++) {
		const angle = 2*Math.PI * (i / nPoints);
		const position= new Vec2(Math.cos(angle), Math.sin(angle));


		// const direction = new Vec2(
		// 	2 * Math.random() - 1,
		// 	2 * Math.random() - 1
		// ).normalize();
		// CONST PZ
		const direction = new Vec2(-position.y, -position.x).normalize();
		points.push(position.x);
		points.push(position.y);
		points.push(direction.x);
		points.push(direction.y);
	}
	const pointPositions = new Float32Array(points);


	// Upload vertices
	const vertexBuffer = device.createBuffer({
		label: 'VertexBuffer',
		size: pointPositions.byteLength,
		usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
		mappedAtCreation: true
	});
	new Float32Array(vertexBuffer.getMappedRange()).set(pointPositions);
	vertexBuffer.unmap();


	const shaderModule = device.createShaderModule({
		label: 'Point shaders',
		code: `
		struct VertexOutput{
			@builtin(position) position : vec4f,
			@location(0) color: vec4f
		}
		
		@vertex 
		fn main_vs(@location(0) position : vec2f) -> VertexOutput{
			var output : VertexOutput;
			output.position = vec4f(position, 0., 1.);
			output.color = vec4f(0.5 * position + 0.5, 1.0, 1.0);
			return output;
		}
		
		@fragment
		fn main_fs(fsInput: VertexOutput) -> @location(0) vec4f{
			return fsInput.color;
		}`
	});

	const renderPipeline = device.createRenderPipeline({
		label: 'Point renderPipeline',
		layout: 'auto',
		vertex: {
			module: shaderModule,
			buffers: [{
				arrayStride: pointVertexSize,
				attributes: [{
					shaderLocation: 0,
					offset: 0,
					format: "float32x2",
				}]
			}]
		},
		fragment: {
			module: shaderModule,
			targets: [{format: presentationFormat}]
		},
		primitive: {
			topology: 'point-list'
		}
	});

	/** @type{GPURenderPassDescriptor} */
	const renderPassDescriptor = {
		colorAttachments: [{
			view: null,
			clearValue: [0.1, 0.1, 0.1, 1],
			loadOp: 'clear',
			storeOp: 'store'
		}]
	};


	const computeModule = device.createShaderModule({
		label: 'Position update module',
		code: `
		@group(0) @binding(0) var<storage, read_write> particles : array<vec4f>;
		@compute @workgroup_size(64)
		fn main(@builtin(global_invocation_id) id: vec3u){
			let i = id.x;
			
			var direction: vec2f = particles[i].zw;
			if (abs(particles[i].x) >= 1. || abs(particles[i].y) >= 1.){
				var normal: vec2f = vec2f(0., 0.);
				if (particles[i].x < -1){
					normal.x = 1.;
				} else if (particles[i].x > 1.){
					normal.x = -1.;
				}
				if (particles[i].y < -1.){
					normal.y = 1.;
				} else if (particles[i].y > 1.) {
					normal.y = -1.;
				}
				direction = normalize(reflect(direction, normal));
			}
			particles[i] = vec4f(particles[i].xy + 0.01*direction, direction);			
		}
	`});

	const computePipeline = device.createComputePipeline({
		label: 'Compute pipeline',
		layout: 'auto',
		compute: {module: computeModule}
	});

	const bindGroup = device.createBindGroup({
		label: 'Binding group for compute pipeline',
		layout: computePipeline.getBindGroupLayout(0),
		entries: [{
			binding: 0,
			resource: {buffer: vertexBuffer}
		}]
	});

	function render(){
		const commandEncoder = device.createCommandEncoder({
			label: 'Command encoder',
		});
		const computePass = commandEncoder.beginComputePass({
			label: 'Compute pass'
		});
		computePass.setPipeline(computePipeline);
		computePass.setBindGroup(0, bindGroup);
		computePass.dispatchWorkgroups(Math.ceil((pointPositions.length / floatsPrPoint) / 64));
		computePass.end();

		// Get the current texture from the canvas context and
		// set it as the texture to render to.
		renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
		const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);
		renderPass.setPipeline(renderPipeline);
		renderPass.setVertexBuffer(0, vertexBuffer);
		renderPass.draw(pointPositions.length / floatsPrPoint);
		renderPass.end()

		device.queue.submit([commandEncoder.finish()]);
		requestAnimationFrame(render);
	}
	requestAnimationFrame(render);
}

// window.onload = init;
window.addEventListener('keyup', event => {
	if (event.code === 'Space'){
		init();
	}
});