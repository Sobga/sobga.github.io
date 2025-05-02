/**
 * @abstract
 * */
class RenderPipeline{
	/**
	 * @param {GPUDevice} device
	 * @param {GPUBindGroupLayout} layout
	 * @param {GPUTextureFormat} presentationFormat
	 * */
	constructor(device, layout, presentationFormat) {
		this._device = device;
		this._shaderModule = device.createShaderModule(this.getShaderModuleDescriptor());
		this._layout = device.createPipelineLayout({bindGroupLayouts: [layout]});
		this._pipeline = device.createRenderPipeline(this.getShaderPipelineDescriptor(this._layout, this._shaderModule, presentationFormat))
	}

	/** @return {GPURenderPipeline}  */
	get pipeline() {
		return this._pipeline;
	}

	/**
	 * @abstract
	 * @return GPUShaderModuleDescriptor
	 * */
	getShaderModuleDescriptor() {throw new Error('Not implemented');}

	/**
	 * @abstract
	 * @param {GPUPipelineLayout} layout
	 * @param {GPUShaderModule} shaderModule
	 * @param {GPUTextureFormat} presentationFormat
	 * @return GPURenderPipelineDescriptor
	 * */
	getShaderPipelineDescriptor(layout, shaderModule, presentationFormat) {throw new Error('Not implemented');}

	/**
	 * @abstract
	 * @return {GPURenderPassDescriptor}
	 * */
	getRenderPassDescriptor() {throw new Error('Not implemented');}
}