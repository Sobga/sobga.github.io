class ModelRenderPipeline extends RenderPipeline{
	/**
	 * @return {GPURenderPassDescriptor}
	 * */
	getRenderPassDescriptor() {
		return {
			label: 'Model Render Pass',
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
		};
	}

	/**
	 * @return {GPUShaderModuleDescriptor}
	 * */
	getShaderModuleDescriptor() {
		return {
			label: 'Model shaders',
			code: `
        struct Camera{
            viewProjection: mat4x4<f32>,
			frustum: array<vec4<f32>, 6>,
        }
        
        struct Vertex{
            @builtin(vertex_index) vIdx: u32,
            @location(0) position: vec3f,
            @location(1) offset: vec3f,
        }
        
        struct VertexOutput{
            @builtin(position) position : vec4f,
            @location(0) color: vec4f
        }
        
        
        @group(0) @binding(0) var<uniform> camera: Camera;
        @vertex
        fn main_vs(vert: Vertex) -> VertexOutput{
            var vsOut: VertexOutput;
            vsOut.color = vec4f(vert.position, 1.);
            vsOut.position = camera.viewProjection * vec4(
                vert.position + vert.offset,
                1
            );
            return vsOut;
        }
        
        @fragment
        fn main_fs(fsInput: VertexOutput) -> @location(0) vec4f{
            return fsInput.color;
        }
        `
		};
	}


	/**
	 * @return {GPURenderPipelineDescriptor}
	 * */
	getShaderPipelineDescriptor(layout, shaderModule, presentationFormat) {
		return {
			label: 'Model shader-pipeline',
			layout: layout,
			vertex: {
				module: shaderModule,
				buffers: [
					{
						arrayStride: 3 * 4, // 3 floats
						attributes: [
							{shaderLocation: 0, offset: 0, format: "float32x3"}
						]
					},
					{
						arrayStride : 3 * 4,
						stepMode: 'instance',
						attributes: [
							{shaderLocation: 1, offset: 0, format: "float32x3"},
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
		}
	}
}