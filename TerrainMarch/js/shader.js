/**
 * @param {WebGL2RenderingContext} gl
 * @param {string} vertexSource 
 * @param {string} fragmentSource
 * @returns {WebGLProgram}
 */
function createProgram(gl, vertexSource, fragmentSource){
    const vertShdr = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource( vertShdr, vertexSource );
    gl.compileShader( vertShdr );
    if ( !gl.getShaderParameter(vertShdr, gl.COMPILE_STATUS) ) {
        const msg = "Vertex shader failed to compile.  The error log is:"
        + "<pre>" + gl.getShaderInfoLog( vertShdr ) + "</pre>";
        throw new Error(msg);
    }

    const fragShdr = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource( fragShdr, fragmentSource);
    gl.compileShader( fragShdr );
    if ( !gl.getShaderParameter(fragShdr, gl.COMPILE_STATUS) ) {
        const msg = `Fragment shader failed to compile. The error log is:\n${gl.getShaderInfoLog(fragShdr)}`;
        console.error(fragmentSource)
        throw new Error(msg);
    }

    const program = gl.createProgram();
    gl.attachShader( program, vertShdr );
    gl.attachShader( program, fragShdr );
    gl.linkProgram( program );
    
    if ( !gl.getProgramParameter(program, gl.LINK_STATUS) ) {
        const msg = "Shader program failed to link.  The error log is:"
            + "<pre>" + gl.getProgramInfoLog( program ) + "</pre>";
        throw new Error(msg);
    }

    return program;
}

class Shader {
    /**
     * @param {WebGL2RenderingContext} gl 
     */
    constructor(gl, args) {
        /**
         * @type {WebGL2RenderingContext}
         * @private
         */
        this._gl = gl;
        this._program = createProgram(gl, 
            '#version 300 es\n'+this.makeVertexSource(args), 
            '#version 300 es\n'+this.makeFragmentSource(args));

    }

    makeVertexSource(args){};
    makeFragmentSource(args){};

    use(){
        this._gl.useProgram(this._program);
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
     */
    constructor(gl, name, program){
        /**
         * @type {WebGL2RenderingContext}
         * @private
         */
        this._gl = gl;

        /**
         * @type {WebGLUniformLocation}
         * @private
         */
        this._location = gl.getUniformLocation(program, name);
    }

    upload(){
        throw new Error('Must be overwritten');
    }
}

class ShaderUniformVec2 extends ShaderUniform{
    upload(x, y){
        this._gl.uniform2f(this._location, x, y);
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