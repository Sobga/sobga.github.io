class Texture{
    constructor(gl, width, height, internalFormat, format, type){
        /** @type {WebGL2RenderingContext} */
        this._gl = gl;
        this.width = width;
        this.height = height;
        this.index = null;

         /** @type{ WebGLTexture } */
        this.glTexture = this._gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.glTexture);

        const level = 0;
        const border = 0;
        const data = null;

        gl.texImage2D(
            gl.TEXTURE_2D, level, internalFormat,
            width, height, border,
            format, type, data
        );

        // Set the filtering so we don't need mips
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    bind(index){
        this._gl.activeTexture(this._gl.TEXTURE0 + index);
        this._gl.bindTexture(this._gl.TEXTURE_2D, this.glTexture);
        this.index = index;
    }

    unbind(){
        this._gl.activeTexture(this._gl.TEXTURE0 + index);
        this._gl.bindTexture(this._gl.TEXTURE_2D, null);
        this.index = null;
    }
}

class TextureRGBA32F extends Texture{
    constructor(gl, width, height){
        super(gl, width, height, gl.RGBA32F, gl.RGBA, gl.FLOAT);
    }
}

class Framebuffer{
    /**
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {number} width 
     * @param {number} height 
     * @param {Texture} texture
     */
    constructor(gl, texture){
        /** @type {WebGL2RenderingContext} */
        this.gl = gl;
        this.texture = texture;

        /** @type {WebGLFramebuffer}*/
        this.glFramebuffer = this.gl.createFramebuffer();

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.glFramebuffer);
        this.gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture.glTexture, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    bind(){
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.glFramebuffer);
        this.gl.viewport(0, 0, this.texture.width, this.texture.height);
    }

    unbind(){
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    }
}