"use strict";
let main;

window.onload = function init(){
    main = new Main();
    addEventListener('onkeydown', _ => {
        requestAnimationFrame(main.runGL.bind(main));
        console.log('A')
    });
}

class Main{
    constructor() {
        // Init canvas
        const canvas = document.getElementById("gl-canvas");

        const gl = canvas.getContext("webgl2");
        this._gl = gl;
        gl.clearColor(0., 0.1, 0.2,1);


        this.colors = [
            new Vec3(1, 1, 1),
            new Vec3(0, 0.7, 0.3)
        ];

        this.jfaInput = new JFAInputShader(this._gl);
        this.jfaStep = new JFAStepShader(this._gl);
        this.jfaResolve = new JFAResolveShader(this._gl, this.colors.length);

        this.firstTexture = new TextureRGBA32UI(this._gl, this._gl.canvas.width, this._gl.canvas.height);
        this.secondTexture = new TextureRGBA32UI(this._gl, this._gl.canvas.width, this._gl.canvas.height);

        this.framebuffer = new Framebuffer(this._gl, [this.firstTexture]);
    }

    runGL(){
        this._gl.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT);

        const nSteps = 2;

        this.framebuffer.bind();
        // Initially, seed JFA texture
        this.jfaInput.use();
        this.jfaInput.render([
            new Vec3(0.5, 0.5, 1),
            new Vec3(0, 0, 2),
        ]);

        this.jfaStep.use();
        let sampledTexture = this.firstTexture;
        let renderToTexture = this.secondTexture;

        // Perform some steps
        for (let i = 0; i < nSteps; i++) {
            this.framebuffer.setTextures([renderToTexture]);
            sampledTexture.bind(0);

            this.jfaStep.render(1);

            // Swap active textures
            const tmpTexture = renderToTexture;
            renderToTexture = sampledTexture;
            sampledTexture = tmpTexture;
        }

        this.framebuffer.unbind();
        renderToTexture.bind(0);

        // Show output to screen
        this.jfaResolve.use();
        this.jfaResolve.render(this.colors);
        this.jfaResolve.unuse();
    }
}

class JFAInputShader extends Shader{
    /**
     * @param {WebGL2RenderingContext} gl
     */
    constructor(gl) {
        super(gl, null);
        this.aData = new ShaderAttribute(gl, 'aData', this._program);
    }

    makeVertexSource() {
        return `
        in vec3 aData; // XY: Position, Z: Color
        
        out highp float vPointColor;
        void main(){
            vPointColor = aData.z;
            gl_Position = vec4(aData.xy, 0., 1.);
            gl_PointSize = 1.;
        }
        `;
    }

    makeFragmentSource() {
        return `
        in highp float vPointColor;
        
        out uvec4 outData;
        void main(){
            outData = uvec4(gl_FragCoord.xy, uint(vPointColor), 0);
        }
        `;
    }

    /** @param {Vec3[]} seeds */
    render(seeds){
        const array = new Float32Array(3*seeds.length);

        for (let i = 0; i < seeds.length; i++){
            array.set(seeds[i].values, 3*i);
        }

        const buffer = this._gl.createBuffer();
        this._gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, buffer);
        this._gl.bufferData(WebGL2RenderingContext.ARRAY_BUFFER, array, WebGL2RenderingContext.STATIC_DRAW);
        this._gl.vertexAttribPointer(0, 3, WebGL2RenderingContext.FLOAT, false, 0, 0);
        this._gl.enableVertexAttribArray(this.aData._location);
        this._gl.drawArrays(WebGL2RenderingContext.POINTS, 0, seeds.length);
        this._gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, null);
        // this._gl.deleteBuffer(buffer);
    }
}

class JFAStepShader extends BaseQuadShader{
    /**
     * @param {WebGL2RenderingContext} gl
     */
    constructor(gl) {
        super(gl, null);
        this._quad = new FullscreenQuadMesh(gl);
        this._uJFATex = new ShaderUniform1i(gl, 'uJFATex', this._program);
        this._uStepSize = new ShaderUniform1i(gl, 'uStepSize', this._program);
        this.use();
        this._uJFATex.upload(0);
        this.unuse();
    }


    makeFragmentSource(args) {
        return `
        uniform highp usampler2D uJFATex; // XY: Start position, Z: Data value
        uniform int uStepSize;
        
        out uvec4 outData;
        
        int distanceSQ(uvec2 samplePosition){
            int dX = int(gl_FragCoord.x) - int(samplePosition.x);
            int dY = int(gl_FragCoord.y) - int(samplePosition.y);
            return dX * dY;
        }
        
        void main(){
            ivec2 coord = ivec2(gl_FragCoord.xy);
            
            uvec4 center = texelFetch(uJFATex, coord, 0);
            
            uvec4[4] samples; 
            samples[0] = texelFetch(uJFATex, ivec2(coord.x + uStepSize, coord.y), 0);
            samples[1] = texelFetch(uJFATex, ivec2(coord.x - uStepSize, coord.y), 0);
            samples[2] = texelFetch(uJFATex, ivec2(coord.x, coord.y + uStepSize), 0);
            samples[3] = texelFetch(uJFATex, ivec2(coord.x, coord.y - uStepSize), 0);
            
            for (int i = 0; i < samples.length(); i++){
                uvec4 s = samples[i]; 
                center = (s.z != 0u && distanceSQ(s.xy) < distanceSQ(center.xy)) ? s : center;     
            }
            
            outData = center;
        }
        `;
    }

    use(){
        super.use();
        this._quad.bind();
    }

    render(stepSize){
        this._uStepSize.upload(stepSize);
        this._quad.render();
    }

    unuse() {
        super.unuse();
        this._quad.unbind();
    }

    destroy(){
        super.destroy();
        this._quad.destroy();
    }
}

class JFAResolveShader extends BaseQuadShader{
    /**
     * @param {WebGL2RenderingContext} gl
     * @param {number} nColors
     */
    constructor(gl, nColors) {
        super(gl, nColors);
        if (isNullOrUndefined(nColors)){
            throw new Error('Invalid input');
        }
        this._quad = new FullscreenQuadMesh(gl);

        this._uJFATex = new ShaderUniform1i(gl, 'uJFATex', this._program);
        this._uColors = new ShaderUniformVec3Array(gl, 'uColors', this._program);

        this.use();
        this._uJFATex.upload(0);
        this.unuse();
    }

    makeFragmentSource(nColors) {
        return `
        #define JFA_N_COLORS
        
        uniform highp usampler2D uJFATex;
        uniform highp vec3 uColors[JFA_N_COLORS];
        
        out highp vec4 outColor;
        void main(){
            uvec4 jfaOutput = texelFetch(uJFATex, ivec2(gl_FragCoord.xy), 0);
            outColor = jfaOutput.z > 0u ? vec4(uColors[jfaOutput.z - 1u], 1.) : vec4(0., 0., 0., 1.);
        }
        
        `.replace('#define JFA_N_COLORS', `#define JFA_N_COLORS ${nColors}`);
    }


    use() {
        super.use();
        this._quad.bind();
    }

    render(colors){
        this._uColors.uploadVec3Array(colors);
        this._quad.render();
    }

    unuse() {
        super.unuse();
        this._quad.unbind();
    }
}

