/**
 * @abstract
 * */
class ComputePipeline{
	constructor(device, bindGroupLayout) {
		this._device = device;
		this._shaderModule = device.createShaderModule(this.getComputeModuleDescriptor());
		this._layout = device.createPipelineLayout({bindGroupLayouts: [bindGroupLayout]});
		this._pipeline = device.createComputePipeline({
			label: this.getComputePipelineName(),
			layout: this._layout,
			compute: {
				module: this._shaderModule,
			}
		});
	}

	/** @return {GPUComputePipeline}  */
	get pipeline() {
		return this._pipeline;
	}

	/**
	 * @abstract
	 * @return GPUShaderModuleDescriptor
	 * */
	getComputeModuleDescriptor() {throw new Error('Not implemented');}

	/**
	 * @abstract
	 * @return string
	 * */
	getComputePipelineName() {throw new Error('Not implemented');}
}