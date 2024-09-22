"use strict";
let main;

window.onload = function init(){
    main = new Main();
    addEventListener('keyup', _ => {
        main.reset();
    });
    main.reset();
}

class Main{
    constructor() {
        // Init canvas
        const canvas = document.getElementById("gl-canvas");

        const gl = canvas.getContext("webgl2");
        this._gl = gl;
        gl.clearColor(0., 0.1, 0.2,1);


        this.colors = [
            new Vec3(255, 255, 255),
            new Vec3(62, 88, 103),
            new Vec3(141, 198, 63),
        ];

        for (const color of this.colors){
            color.scale(1/255);
        }

        this.jfaInput = new JFAInputShader(this._gl);
        this.jfaStep = new JFAStepShader(this._gl);
        this.jfaResolve = new JFAResolveShader(this._gl, this.colors.length);

        this.firstTexture = new TextureRGBA32UI(this._gl, this._gl.canvas.width, this._gl.canvas.height);
        this.secondTexture = new TextureRGBA32UI(this._gl, this._gl.canvas.width, this._gl.canvas.height);

        this._sampledTexture = this.firstTexture;

        this.framebuffer = new Framebuffer(this._gl, [this._sampledTexture]);
        this.lastTimestamp = Date.now();
    }

    reset(){
        this.framebuffer.unbind();
        this._gl.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT);

        const width = this._gl.canvas.width;
        const height = this._gl.canvas.height;
        this.firstTexture.destroy();
        this.secondTexture.destroy();
        this.firstTexture = new TextureRGBA32UI(this._gl, width, height);
        this.secondTexture = new TextureRGBA32UI(this._gl, width, height);

        this._sampledTexture = this.firstTexture;

        this.framebuffer.bind();
        this.framebuffer.setTextures([this._sampledTexture]);
        this.stepSize = Math.ceil(width / 2);

        const points = [
            new Vec3(0.59983, -0.04224, 1),
            new Vec3(0.6275, -0.01071, 2),
            new Vec3(0.81403, 0.20028, 1),
            new Vec3(0.57217, -0.07376, 3),
            new Vec3(0.57217, -0.04224, 1),
            new Vec3(0.6239, 0.01672, 2),
            new Vec3(0.78637, 0.20049, 1),
            new Vec3(0.59983, -0.07376, 1),
            new Vec3(0.66024, -0.07376, 1),
            new Vec3(0.66024, -0.03944, 2),
            new Vec3(0.84655, 0.17131, 1),
            new Vec3(0.63257, -0.07096, 1),
            new Vec3(0.57217, -0.74504, 3),
            new Vec3(0.59983, -0.74504, 1),
            new Vec3(0.57217, -0.77656, 1)
        ]
        // Reflect all points over the y-axis;
        const originalLength = points.length;
        for (let i = 0; i < originalLength; i++){
            const reflectedPoint = points[i].clone();
            reflectedPoint.x *= -1;
            points.push(reflectedPoint);
        }

        // Initially, seed JFA texture
        this.jfaInput.use();
        this.jfaInput.render(points);

        requestAnimationFrame(main.loop.bind(main));
    }

    loop(){
        requestAnimationFrame(this.loop.bind(this));

        const timestamp = Date.now();
        if (timestamp - this.lastTimestamp < 250){
            return;
        }
        this.lastTimestamp = timestamp;
        this.framebuffer.bind();
        this.jfaStep.use();
        /** @type TextureRGBA32UI **/
        let renderToTexture = this._sampledTexture === this.firstTexture ? this.secondTexture : this.firstTexture;

        // Perform some steps
        this.framebuffer.setTextures([renderToTexture]);
        this._sampledTexture.bind(0);

        this.jfaStep.render(Math.abs(this.stepSize));


        // Swap active textures
        const tmpTexture = renderToTexture;
        renderToTexture = this._sampledTexture;
        this._sampledTexture = tmpTexture;

        this.framebuffer.unbind();
        renderToTexture.bind(0);

        // Show output to screen
        this.jfaResolve.use();
        this.jfaResolve.render(this.colors);
        this.jfaResolve.unuse();

        if (this.stepSize === -1){
            return;
        } else if (this.stepSize === 1){
            this.stepSize = -1;
        } else {
            this.stepSize = Math.ceil(0.5 * this.stepSize);
        }
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
        
        int distanceSQ(ivec2 coord, uvec2 samplePosition){
            ivec2 delta = coord - ivec2(samplePosition);
            return delta.x*delta.x + delta.y*delta.y;
        }
        
        void main(){
            ivec2 coord = ivec2(gl_FragCoord.xy);
            uvec4 center = texelFetch(uJFATex, coord, 0);
            
            uvec4 samples[8];
            samples[0] = texelFetch(uJFATex, coord + ivec2(-uStepSize, 0), 0);
            samples[1] = texelFetch(uJFATex, coord + ivec2(-uStepSize), 0);
            samples[2] = texelFetch(uJFATex, coord + ivec2(0, -uStepSize), 0);
            samples[3] = texelFetch(uJFATex, coord + ivec2(uStepSize, -uStepSize), 0);
            samples[4] = texelFetch(uJFATex, coord + ivec2(uStepSize, 0), 0);
            samples[5] = texelFetch(uJFATex, coord + ivec2(uStepSize), 0);
            samples[6] = texelFetch(uJFATex, coord + ivec2(0, uStepSize), 0);
            samples[7] = texelFetch(uJFATex, coord + ivec2(-uStepSize, uStepSize), 0);
            
            for (int i = 0; i < samples.length(); i++){
                uvec4 s = samples[i];
                center = s.z != 0u && (distanceSQ(coord, s.xy) < distanceSQ(coord, center.xy) || center.z == 0u) ? s : center;
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
            
            highp vec2 texSize = vec2(textureSize(uJFATex, 0));
            outColor = vec4(vec2(jfaOutput.xy) / vec2(texSize), 0., 1.);
//            ivec2 delta = ivec2(gl_FragCoord.xy) - ivec2(jfaOutput.xy);
//            highp float textureDiagonal = inversesqrt(dot(vec2(texSize), vec2(texSize))) * 3.;
//            outColor = vec4(vec3(sqrt(float(delta.x*delta.x + delta.y*delta.y)) * textureDiagonal), 1.);
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

