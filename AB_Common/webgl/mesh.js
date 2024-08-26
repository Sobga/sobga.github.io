"use strict";

class Mesh{
    bind(){};
    render(){};
    destroy(){};
}

class FullscreenQuadMesh extends Mesh{
    constructor(gl, shaderLocation = 0) {
        super();
        this._gl = gl;
        // Triangle corners
        const vertices = [
            -1, -1,  // First triangle
            1, -1,
            1, 1,
            -1, -1,    // Second triangle
            1, 1,
            -1, 1
        ];
        const asTypedArray = new Int16Array(vertices);
        this._vertexBuffer = gl.createBuffer();
        this._vao = new VertexArrayObject(gl);

        this._vao.bind();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, asTypedArray, WebGL2RenderingContext.STATIC_DRAW);
        gl.vertexAttribPointer(shaderLocation, 2, WebGL2RenderingContext.SHORT, false, 0, 0);
        gl.enableVertexAttribArray(shaderLocation);
        this._vao.unbind();
    }

    bind(){
        this._vao.bind();
    }

    unbind(){
        this._vao.unbind();
    }

    render(){
        this._gl.drawArrays(WebGL2RenderingContext.TRIANGLES, 0, 6);
    }

    destroy() {
        this._vao.destroy();
        this._gl.deleteBuffer(this._vertexBuffer);
    }
}