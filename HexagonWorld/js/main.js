"use strict";
let main;

window.onload = function init(){
    main = new Main();
}

class Main{
    constructor() {
        this.lastTimestamp = document.timeline.currentTime;

        // Init canvas
        const canvas = document.getElementById("gl-canvas");
        const dim = Math.min(window.innerWidth, window.innerHeight);
        canvas.width = dim;
        canvas.height = dim;

        const gl = canvas.getContext("webgl2");
        this._gl = gl;
        gl.clearColor(0., 0.1, 0.2,1);
        gl.enable(WebGL2RenderingContext.DEPTH_TEST);
        // gl.enable(gl.CULL_FACE);

        this.camera = new Camera();
        this.camera.setPosition(new Vec3(-1, 0.7, 0), new Vec3(1, -0.3, 0).normalize());
        this.camera.setPerspective(80, 1, 0.1, 1000);

        this.interaction = new Interaction();

        // Init shaders
        this.shader = new TerrainShader(gl);
        this.shader.use();

        this.hexGenerator = new HexMeshGenerator(gl, 128);
        this.hexMeshes = [];
        for (let i = -5; i < 5; i++){
            for (let j = -5; j < 5; j++){
                const offset = new Vec2(5*i, 5*j)
                const mesh = this.hexGenerator.generate(new BoundingBox2D(offset, new Vec2(5, 5).add(offset)));
                this.hexMeshes.push(mesh);
            }
        }

        requestAnimationFrame(this.renderLoop.bind(this));
    }

    renderLoop(timestamp){
        const deltaS = (timestamp - this.lastTimestamp) / 1000;
        this.updateCamera(deltaS);
        this.lastTimestamp = timestamp;
        this._gl.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT | WebGL2RenderingContext.DEPTH_BUFFER_BIT);

        this.shader.use();
        this.shader._view.upload(this.camera._viewMatrix);
        this.shader._projection.upload(this.camera._projectionMatrix);

        for (const mesh of this.hexMeshes){
            this.shader._bounds.upload(mesh._bounds.min.x, mesh._bounds.min.y, mesh._bounds.max.x, mesh._bounds.max.y);
            mesh.draw();
        }
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

class TerrainShader extends Shader{

    makeVertexSource(args) {
        return `
        uniform highp mat4 uView;
        uniform highp mat4 uProjection;
        uniform highp vec4 uBounds; // XY: min corner, ZW: max corner
        
        in highp vec2 aPosition;
        in highp vec3 aHeightAndGradient;
        
        out highp vec3 vNormal;
        out highp vec3 vPosition;
        
        void main(){
            vec2 posPlane = aPosition * (uBounds.zw - uBounds.xy) + uBounds.xy;
            vPosition = vec3(posPlane.x, aHeightAndGradient.x, posPlane.y);
            vNormal = vec3(
                -aHeightAndGradient.y,
                1.,
                -aHeightAndGradient.z
            );
            vNormal = normalize(vNormal);
            gl_Position = uProjection * uView * vec4(vPosition, 1.);
        }
        `;
    }

    makeFragmentSource(args) {
        return `
        in highp vec3 vPosition;
        in highp vec3 vNormal;
        out lowp vec4 outColor;
        
        void main(){
            highp float slope = dot(normalize(vNormal), vec3(0., 1., 0.));
//            outColor = vec4(mix(vec3(0., 0., 0.), vec3(0., 1., 0.), slope), 1.);
            outColor = vec4(normalize(vNormal), 1.);
        }
        `;
    }

    constructor(gl) {
        super(gl, null);
        this._position = new ShaderAttribute(gl,'aPosition', this._program);
        this._view = new ShaderUniformMat4(gl,'uView', this._program);
        this._projection = new ShaderUniformMat4(gl,'uProjection', this._program);
        this._bounds = new ShaderUniformVec4(gl, 'uBounds', this._program);
    }
}
