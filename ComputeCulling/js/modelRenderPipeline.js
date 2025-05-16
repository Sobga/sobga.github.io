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
            view: mat4x4<f32>,
            viewProjection: mat4x4<f32>,
			frustum: array<vec4f, 6>,
        }
        
        struct Vertex{
            @builtin(vertex_index) vIdx: u32,
            @location(0) position: vec3f,
            @location(1) model_index: u32,
        }
        
        struct VertexOutput{
            @builtin(position) position : vec4f,
            @location(0) color: vec4f,
            @location(1) viewPosition: vec4f,
        }
        
        
        @group(0) @binding(0) var<uniform> camera: Camera;
        @group(0) @binding(1) var<storage, read> model_offsets: array<vec3f>;
        
        fn rand_color(vert: Vertex) -> vec4f{
            var col = vert.model_index * vec3u(158, 2*156, 3*159);
            col = col % vec3u(255, 253, 256); // skips some channel values
            return vec4f(vec3f(col)/255., 1.); 
        }
            
        @vertex
        fn main_vs(vert: Vertex) -> VertexOutput{
            var vsOut: VertexOutput;
            vsOut.color = rand_color(vert);
            let localPosition = vec4f(vert.position + model_offsets[vert.model_index], 1.);
            
			vsOut.viewPosition = camera.view * localPosition;  
            vsOut.position = camera.viewProjection * localPosition;
           
            return vsOut;
        }
        
        @fragment
        fn main_fs(fsInput: VertexOutput) -> @location(0) vec4f{
            let normal = normalize(cross(dpdx(fsInput.viewPosition.xyz), dpdy(fsInput.viewPosition.xyz))); 
            return fsInput.color * abs(normal.z);
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
						arrayStride : 4,
						stepMode: 'instance',
						attributes: [
							{shaderLocation: 1, offset: 0, format: "uint32"},
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