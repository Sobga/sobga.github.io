class Shader {
    static WEBGL2_PREFIX = '#version 300 es\n';
    /**
     * @param {WebGL2RenderingContext} gl
     * @param {any} args
     */
    constructor(gl, args) {
        this._gl = gl;
        this._program = this.createProgram(gl,
            Shader.WEBGL2_PREFIX + this.makeVertexSource(args),
            Shader.WEBGL2_PREFIX + this.makeFragmentSource(args));

    }

    /** @return string*/
    makeVertexSource(args){throw new Error('makeVertexSource: Not implemented.')};
    /** @return string*/
    makeFragmentSource(args){throw new Error('makeFragmentSource: Not implemented.')};

    /**
     * @param {WebGL2RenderingContext} gl
     * @param {string} vertexSource
     * @param {string} fragmentSource
     * @returns {WebGLProgram}
     */
    createProgram(gl, vertexSource, fragmentSource){
        const vertShader = gl.createShader( gl.VERTEX_SHADER );
        gl.shaderSource( vertShader, vertexSource );
        gl.compileShader( vertShader );
        if ( !gl.getShaderParameter(vertShader, gl.COMPILE_STATUS) ) {
            const msg = "Vertex shader failed to compile.  The error log is:"
                + "<pre>" + gl.getShaderInfoLog( vertShader ) + "</pre>";
            throw new Error(msg);
        }

        const fragShader = gl.createShader( gl.FRAGMENT_SHADER );
        gl.shaderSource( fragShader, fragmentSource);
        gl.compileShader( fragShader );
        if ( !gl.getShaderParameter(fragShader, gl.COMPILE_STATUS) ) {
            const msg = `Fragment shader failed to compile. The error log is:\n${gl.getShaderInfoLog(fragShader)}`;
            console.error(fragmentSource)
            throw new Error(msg);
        }

        const program = gl.createProgram();
        gl.attachShader( program, vertShader );
        gl.attachShader( program, fragShader );
        gl.linkProgram( program );

        if ( !gl.getProgramParameter(program, gl.LINK_STATUS) ) {
            const msg = "Shader program failed to link.  The error log is:"
                + "<pre>" + gl.getProgramInfoLog( program ) + "</pre>";
            throw new Error(msg);
        }

        return program;
    }

    use(){
        this._gl.useProgram(this._program);
    }

    unuse(){
        this._gl.useProgram(null);
    }

    destroy(){
        this._gl.deleteProgram(this._program);
    }
}

class FeedbackShader extends Shader{
    // https://www.youtube.com/watch?v=ro4bDXcISms

    /**
     * @param {WebGL2RenderingContext} gl
     * @param {string[]} feedbackVaryings
     * @param {GLenum} bufferType
     * */
    constructor(gl, feedbackVaryings, bufferType = WebGL2RenderingContext.SEPARATE_ATTRIBS) {
        super(gl, null);
        if (bufferType === WebGL2RenderingContext.INTERLEAVED_ATTRIBS){
            throw new Error('Not implemented');
        }
        this._gl = gl;
        this._varyings = feedbackVaryings;
        gl.transformFeedbackVaryings(this._program, this._varyings, bufferType)
        gl.linkProgram(this._program); // Update captured output variables

        if (feedbackVaryings.length > 4 && bufferType === WebGL2RenderingContext.SEPARATE_ATTRIBS){
            throw new Error(`FeedbackShader: Using ${feedbackVaryings.length} > 4 outputs with separate buffers`);
        }
    }

    /** @param {WebGLBuffer[]} outBuffers
     * @param nPrimitives {number}
     * @param type {GLenum}
     */
    transform(outBuffers, nPrimitives, type=WebGL2RenderingContext.POINTS){
        if (outBuffers.length !== this._varyings.length){
            throw new Error('FeedbackShader: Mismatch in given buffers');
        }

        for (let i = 0; i < outBuffers.length; i++){
           this._gl.bindBufferBase(WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER, i, outBuffers[i]);
        }

        this._gl.beginTransformFeedback(WebGL2RenderingContext.POINTS);
        this._gl.enable(WebGL2RenderingContext.RASTERIZER_DISCARD);

        this._gl.drawArrays(type, 0, nPrimitives);

        // End transform feedback
        this._gl.endTransformFeedback();
        this._gl.disable(WebGL2RenderingContext.RASTERIZER_DISCARD);
        for (let i = 0; i < outBuffers.length; i++){
            this._gl.bindBufferBase(WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER, i, null);
        }
    }
}

class BaseQuadShader extends Shader{
    makeVertexSource(){
        return `
        in vec2 aPosition;
        out vec2 vPosition;
        void main(){
            vPosition = 0.5 * aPosition + 0.5;
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
        `;
    }
}


class ShaderAttribute{
    /**
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {string} name 
     * @param {WebGLProgram} program 
     */
    constructor(gl, name, program){
        this._location = gl.getAttribLocation(program, name);
    }
}

class ShaderUniform{
    /**
     * @param {WebGL2RenderingContext} gl
     * @param {string} name
     * @param {WebGLProgram} program
     */
    constructor(gl, name, program){
        /**
         * @type {WebGL2RenderingContext}
         * @protected
         */
        this._gl = gl;

        /**
         * @type {WebGLUniformLocation}
         * @protected
         */
        this._location = gl.getUniformLocation(program, name);
        if (this._location === -1 || isNullOrUndefined(this._location)){
            throw new Error(`Uniform "${name}" not found`);
        }
    }

    upload(){
        throw new Error('Must be overwritten');
    }
}

class ShaderUniform1i extends ShaderUniform{
    upload(i){
        this._gl.uniform1i(this._location, i);
    }
}

class ShaderUniformVec2 extends ShaderUniform{
    upload(x, y){
        this._gl.uniform2f(this._location, x, y);
    }

    /**
     * @param {Vec2} v 
     */
    uploadVec2(v){
        this._gl.uniform2f(this._location, v.x, v.y);
    }
}

class ShaderUniformVec3 extends ShaderUniform{
    upload(x, y, z){
        this._gl.uniform3f(this._location, x, y, z);
    }

    /**
     * @param {Vec3} v 
     */
    uploadVec3(v){
        this._gl.uniform3f(this._location, v.x, v.y, v.z);
    }
}

class ShaderUniformVec3Array extends ShaderUniform{
    upload(data) {
        this._gl.uniform3fv(this._location, data);
    }

    /**
     * @param {Vec3[]} vectors
     */
    uploadVec3Array(vectors){
        const data = new Float32Array(3 * vectors.length);
        for (let i = 0; i < vectors.length; i++){
            data.set(vectors[i].values, 3*i);
        }
        this._gl.uniform3fv(this._location, data);
    }
}

class ShaderUniformVec4 extends ShaderUniform{
    upload(x, y, z, w){
        this._gl.uniform4f(this._location, x, y, z, w);
    }

    uploadVec4(v){
        this._gl.uniform4f(this._location, v.x, v.y, v.z, v.w);
    }
}

class ShaderUniformMat4 extends ShaderUniform{
    /**
     * @param {Matrix4} matrix
     * */
    upload(matrix) {
        this._gl.uniformMatrix4fv(this._location, false, matrix.values);
    }
}