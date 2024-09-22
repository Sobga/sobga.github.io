"use strict";

class Mesh{
    bind(){};
    render(){};
    unbind(){};
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

class CubeMesh extends Mesh{
    /** @param gl {WebGL2RenderingContext}
     * @param location Binding point for vertex position **/
    constructor(gl, location=0) {
        super();
        this._gl = gl;

        this._vao = new VertexArrayObject(gl);
        this._vao.bind();

        const vertices = new Uint16Array([
            0, 0, 0,
            1, 0, 0,
            1, 0, 1,
            0, 0, 1,
            0, 1, 0,
            1, 1, 0,
            1, 1, 1,
            0, 1, 1,
        ]);

        this._vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, WebGL2RenderingContext.STATIC_DRAW);
        gl.vertexAttribPointer(location, 3, WebGL2RenderingContext.SHORT, false, 0, 0);
        gl.enableVertexAttribArray(location);

        const indices = new Uint16Array([
            0, 1, 2, // Bottom
            0, 2, 3,
            1, 6, 2, // Right
            1, 5, 6,
            2, 7, 3, // Front
            2, 6, 7,
            0, 3, 7, // Left
            0, 7, 4,
            0, 4, 5, // Back
            0, 5, 1,
            4, 6, 5, // Top
            4, 7, 6
        ]);
        this._indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, WebGL2RenderingContext.STATIC_DRAW);
        this._vao.unbind();
    }

    bind(){
        this._vao.bind();
    };

    render(){
        this._gl.drawElements(WebGL2RenderingContext.TRIANGLES, 36, WebGL2RenderingContext.UNSIGNED_SHORT, 0);
    };

    renderInstanced(instanceCount){
        this._gl.drawElementsInstanced(WebGL2RenderingContext.TRIANGLES, 36, WebGL2RenderingContext.UNSIGNED_SHORT, 0, instanceCount);
    }

    unbind(){
        this._vao.unbind();
    }

    destroy(){
        this._gl.deleteBuffer(this._vertexBuffer);
        this._gl.deleteBuffer(this._indexBuffer);
        this._vao.destroy();
    };
}