'use strict';

class Texture{
    constructor(gl, width, height, internalFormat){
        /** @type {WebGL2RenderingContext} */
        this._gl = gl;
        this.width = width;
        this.height = height;
        this.index = null;

         /** @type{ WebGLTexture } */
        this.glTexture = this._gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.glTexture);

        const level = 1;

        gl.texStorage2D(
            gl.TEXTURE_2D, level, internalFormat,
            width, height,
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

    destroy(){
        this._gl.deleteTexture(this.glTexture);
        this.glTexture = null;
    }
}

class TextureRGBA32F extends Texture{
    constructor(gl, width, height){
        super(gl, width, height, gl.RGBA32F);
    }
}

class TextureRGBA32UI extends Texture{
    constructor(gl, width, height) {
        super(gl, width, height, WebGL2RenderingContext.RGBA32UI);
    }
}

class Framebuffer{
    /**
     * 
     * @param {WebGL2RenderingContext} gl
     * @param {Texture[]} textures
     * @param {number[]} attachmentPoints Which framebuffer-locations to render to
     */
    constructor(gl, textures, attachmentPoints= []){
        /** @type {WebGL2RenderingContext} */
        this.gl = gl;
        this.textures = textures;

        for (const texture of textures){
            if (this.width() !== texture.width || this.height() !== texture.height){
                throw new Error('Texture dimensions must match');
            }
        }

        /** @type {WebGLFramebuffer}*/
        this.glFramebuffer = this.gl.createFramebuffer();

        if (this.textures.length > 0){
            this.bind();
            this.setTextures(textures, attachmentPoints);
            this.unbind();
        }
    }

    width() {
        return this.textures[0].width;
    }

    height(){
        return this.textures[0].height;
    }

    setTextures(textures, attachmentPoints=[]){
        this.textures = textures;

        const drawBuffers = [];
        let maxIndex = -1;
        for (let i = 0; i < textures.length; i++){
            const attachmentIndex = attachmentPoints[i] ?? i;
            maxIndex = Math.max(maxIndex, attachmentIndex);
            this.gl.framebufferTexture2D(
                WebGL2RenderingContext.FRAMEBUFFER,
                WebGL2RenderingContext.COLOR_ATTACHMENT0 + attachmentIndex,
                WebGL2RenderingContext.TEXTURE_2D,
                this.textures[i].glTexture,
                0);
            drawBuffers[attachmentIndex] = WebGL2RenderingContext.COLOR_ATTACHMENT0 + attachmentIndex;
        }

        for (let i = 0; i < maxIndex; i++){
            if (isNullOrUndefined(drawBuffers[i])){
                drawBuffers[i] = WebGL2RenderingContext.NONE;
            }
        }
        this.gl.drawBuffers(drawBuffers);
    }

    bind(){
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.glFramebuffer);
        this.gl.viewport(0, 0, this.width(), this.height());
    }

    unbind(){
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    }

    clear(){
        for (let i = 0; i < this.textures.length; i++){
            this.gl.clearBufferuiv(WebGL2RenderingContext.COLOR, i, new Uint32Array([0, 0, 0, 0]));
        }
    }

    destroy(){
        this.gl.deleteFramebuffer(this.glFramebuffer);
    }
}