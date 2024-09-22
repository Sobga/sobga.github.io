"use strict";
let main;

window.onload = function init(){
    main = new Main();
    requestAnimationFrame(main.renderLoop.bind(main));
}

class Main {
    constructor() {
        this.lastTimestamp = 0;

        // Init canvas
        const canvas = document.getElementById("gl-canvas");
        const dim = Math.min(window.innerWidth, window.innerHeight);
        canvas.width = dim;
        canvas.height = dim;

        this._gl = canvas.getContext("webgl2");
        this._gl.clearColor(0., 0.1, 0.2, 1);
        this._gl.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT);
        this._gl.enable(WebGL2RenderingContext.CULL_FACE);
        this._gl.enable(WebGL2RenderingContext.DEPTH_TEST);
        this._gl.clearDepth(1);
        this._gl.depthFunc(WebGL2RenderingContext.LEQUAL);

        this.shader = new VoxelShader(this._gl);
        this.camera = new Camera();
        this.interaction = new Interaction();

        this.camera.setPosition(new Vec3(2, 0, -2), new Vec3(0, 0, 1));
        this.camera.setPerspective(80, 1, 0.1, 1000);

        this._cube = new CubeMesh(this._gl, this.shader._corner._location);

        const cubePositions = new Float32Array([
            0, 0, 0,
            1, 0, 0,
            2, 0, 0,
            3, 0, 0,
            3, 1, 0,
            3, 2, 0,
            3, 3, 0,
            2, 3, 0,
            1, 3, 0,
            0, 3, 0,
        ]);

        const positionBuffer = this._gl.createBuffer();
        this._cube.bind()
        this._gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, positionBuffer);
        this._gl.bufferData(WebGL2RenderingContext.ARRAY_BUFFER, cubePositions, WebGL2RenderingContext.STATIC_DRAW);
        this._gl.vertexAttribPointer(this.shader._center._location, 3, WebGL2RenderingContext.FLOAT, false, 0, 0);
        this._gl.enableVertexAttribArray(this.shader._center._location);
        this._gl.vertexAttribDivisor(this.shader._center._location, 1);
        this._cube.unbind()
    }

    renderLoop(timestamp){
        const deltaS = (timestamp - this.lastTimestamp) / 1000;
        this.updateCamera(deltaS);
        this.lastTimestamp = timestamp;
        this._gl.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT | WebGL2RenderingContext.DEPTH_BUFFER_BIT);

        this.shader.use(this.camera._viewProjection);
        this._cube.bind();
        this._cube.renderInstanced(10);
        this._cube.unbind();

        requestAnimationFrame(this.renderLoop.bind(this));
    }

    updateCamera(deltaS){
        let newPosition = this.camera._position.clone();
        let newDirection = this.camera._direction.clone();
        if (this.interaction.keypressses[Directions.FORWARD] !== 0){
            newPosition.add(this.camera._direction.scaleNew(2. * deltaS * this.interaction.keypressses[Directions.FORWARD]));
        }

        if (this.interaction.keypressses[Directions.UP] !== 0){
            newPosition.add(Vec3.up().scaleNew(0.3 * deltaS * this.interaction.keypressses[Directions.UP]));
        }

        if (this.interaction.keypressses[Directions.TILT] !== 0){
            newDirection.y = clamp(newDirection.y + 0.5 * deltaS * this.interaction.keypressses[Directions.TILT], -0.9, 0.9);
            newDirection.normalize();
        }

        if (this.interaction.keypressses[Directions.LEFT] !== 0){
            newDirection.rotateY(deltaS * this.interaction.keypressses[Directions.LEFT]);
        }

        this.camera.setPosition(newPosition, newDirection);
    }
}

class VoxelShader extends Shader{
    /** @param gl {WebGL2RenderingContext} **/
    constructor(gl) {
        super(gl, null);
        this._corner = new ShaderAttribute(gl, 'aCorner', this._program);
        this._center = new ShaderAttribute(gl, 'aCenter', this._program);
        this._viewProjection = new ShaderUniformMat4(gl, 'uViewProjection', this._program);
    }

    use(viewProjection) {
        super.use();
        this._viewProjection.upload(viewProjection)
    }

    makeVertexSource(args) {
        return `
        uniform mat4 uViewProjection;
        
        layout(location=0) in vec3 aCorner;
        layout(location=1) in vec3 aCenter;
        
        out vec3 vColor;
        void main(){
            vColor = vec3(aCorner);
            gl_Position = uViewProjection * vec4(aCorner + aCenter, 1.);
        }
        `;
    }

    makeFragmentSource(args) {
        return `
        in lowp vec3 vColor;
        
        out lowp vec4 outColor;
        void main(){
            outColor = vec4(vColor, 1.);
        }
        `;
    }

}