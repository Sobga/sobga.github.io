class ModelCullingPipeline extends ComputePipeline {
	getComputePipelineName() {
		return "Model Culling Pipeline";
	}

	/**
	 * @return {GPUShaderModuleDescriptor}
	 * */
	getShaderModuleDescriptor() {
		return {
			label: 'Model culling module',
			code: `
			struct Camera{
                viewProjection: mat4x4<f32>,
				frustum: array<vec4<f32>, 6>,
            }
			
			
			@compute @workgroup_size(64) fn cullModels(@builtin(global_invocation_id) id: vec3u){
				
			}`

		};
	}
}