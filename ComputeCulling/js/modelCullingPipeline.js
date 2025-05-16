class ModelCullingPipeline extends ComputePipeline {
	getComputePipelineName() {
		return "Model Culling Pipeline";
	}

	/**
	 * @return {GPUShaderModuleDescriptor}
	 * */
	getComputeModuleDescriptor() {
		return {
			label: 'Model culling module',
			code: `
			// Type defitions
			struct Camera{
                view: mat4x4<f32>,
                viewProjection: mat4x4<f32>,
				frustumPlanes: array<vec4f, 6>,
            }
            
            struct IndirectDrawBuffer{
                indexCount: u32,
                instanceCount: atomic<u32>,
                firstIndex: u32,
                baseVertex: u32,
                firstInstance: u32,
            }
                       
            @group(0) @binding(0) var<uniform> camera: Camera;
            @group(0) @binding(1) var<storage, read> model_positions: array<vec3f>;
			@group(0) @binding(2) var<storage, read_write> model_indices : array<u32>;
			@group(0) @binding(3) var<storage, read_write> indirect_draw_buffer : IndirectDrawBuffer;
			
			@compute @workgroup_size(64) fn cullModels(
				@builtin(global_invocation_id) global_id: vec3u,
			){
				let full_id = global_id.x;
				if (full_id >= arrayLength(&model_positions)){
					return;
				}

//				// Cull based on frustum
				let position = vec4f(model_positions[full_id], 1.);
				for (var i = 0; i < 6; i++){
					if (dot(camera.frustumPlanes[1], position) < -0.5){
						return;
					}
				}
				
				let index = atomicAdd(&indirect_draw_buffer.instanceCount, 1);
				model_indices[index] = full_id;
			}`

		};
	}
}