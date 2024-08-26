// VAO
class VertexArrayObject{
    /** @param {WebGL2RenderingContext} gl */
    constructor(gl) {
        this._gl = gl;
        this._vao = gl.createVertexArray();
    }

    bind(){
        this._gl.bindVertexArray(this._vao);
    }

    unbind(){
        this._gl.bindVertexArray(null);
    }

    destroy(){
        this._gl.deleteVertexArray(this._vao);
    }
}