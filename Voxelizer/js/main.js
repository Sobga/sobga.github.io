"use strict";
let main;

window.onload = function init(){
    main = new Main();
    requestAnimationFrame(main.renderLoop.bind(main));
}

window.oncontextmenu = ev => ev.preventDefault(); // Prevent right-click
window.onmouseup = ev => main?.onMouseUp(ev);
window.onmousedown = ev => main?.onMouseDown(ev);
window.onmousemove = ev => main?.onMouseMove(ev);
window.onwheel = ev => main?.onMouseScroll(ev);

class Main {
    constructor() {
        this.lastTimestamp = 0;
        this._dragging = false;
        this._lastClick = new Vec2(0 , 0);
        this._angle = new Vec2(Math.PI / 2, Math.PI / 2); // TODO: Prevent gimbal-lock

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
        const bezier = new CubicBezier(
            new Vec3(0, 100, 0),
            new Vec3(20, 0, 0),
            new Vec3(40, 80, 0),
            new Vec3(60, 0, 0),
        );


        // Voxelize bezier, and rotate around y-axis
        const voxelizer = new BezierVoxelizer();
        const grid = voxelizer.voxelize(bezier);
        const positions = [...grid.positions()];
        this._boundingBox =  BoundingBox3D.fromPositions(positions);
        this._radius = Math.max(...this._boundingBox.size().values);

        // Upload to GPU
        const cubePositions = new Float32Array(3 * positions.length);
        for (let i = 0; i < positions.length; i++){
            cubePositions.set(positions[i].values, 3*i);
        }

        this._nInstances = positions.length;
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

        this.shader.use(this.camera);
        this._cube.bind();
        this._cube.renderInstanced(this._nInstances);
        this._cube.unbind();

        requestAnimationFrame(this.renderLoop.bind(this));
    }

    updateCamera(deltaS){
        const center = this._boundingBox.center
        const position = center.clone();
        const spherePosition = new Vec3(
            Math.cos(this._angle.x),
            Math.sin(this._angle.y),
            Math.sin(this._angle.x)
        ).scale(this._radius);
        position.add(spherePosition);

        const direction = center.subtractNew(position).normalize();
        this.camera.setPosition(position, direction);
    }

    /** @param event {MouseEvent} **/
    onMouseDown(event){
        this._dragging = true;
        this._lastClick.x = event.clientX;
        this._lastClick.y = event.clientY;
    }

    /** @param event {MouseEvent} **/
    onMouseUp(event){
        this._dragging = false;
    }

    /** @param event {MouseEvent} **/
    onMouseMove(event){
        if (!this._dragging)
            return;
        const newMove = new Vec2(event.clientX, event.clientY);
        const delta = newMove.subtractNew(this._lastClick);
        delta.x /= window.innerWidth;
        delta.y /= -window.innerHeight;
        this._lastClick = newMove;
        this._angle.add(delta.scale(10));

        // Clamp
        this._angle.y = Math.max(Math.min(this._angle.y, Math.PI/2), -Math.PI/2);
    }

    /** @param event {WheelEvent} **/
    onMouseScroll(event){
        this._radius += 10 * event.deltaY / window.innerHeight;
    }
}

class BezierVoxelizer {
    constructor() {
    }

    /** @param bezier {CubicBezier}
     * @returns VoxelGrid */
    voxelize(bezier){
        const nEvaluations = 300;

        const grid = VoxelGrid.fromBezier(bezier)

        for (let i = 0 ; i < nEvaluations; i++){
            const position = bezier.evaluate(i / (nEvaluations - 1)).round();
            if (grid.addPosition(position)){
                // It was a new position, rotate!
                const radius = Math.sqrt(position.x*position.x + position.z*position.z);
                const circumference = Math.ceil(2*Math.PI*radius);
                const stepSize = 2*Math.PI / circumference;
                for (let j = 0; j < circumference; j++){
                    const angle = j * stepSize;
                    grid.addPosition(new Vec3(
                        Math.cos(angle)*radius,
                        position.y,
                        Math.sin(angle)*radius
                    ).round());
                }
            }
        }
        return grid;
    }
}

class VoxelGrid{
    /** @param boundingBox {BoundingBox3D} */
    constructor(boundingBox){
        this._size = boundingBox.size();
        this._offset = boundingBox.min;
        this._nOccupied = 0;

        /** @type {Set<number>[]} */
        this._positionGroups = [];
        for (let i = 0; i < this._size.y; i++){
            this._positionGroups.push(new Set());
        }
    }

    /**
     * @param bezier {CubicBezier}
     * @return VoxelGrid*/
    static fromBezier(bezier){
        const bezierBox = bezier.boundingBox();
        const bezierSize = bezierBox.size();
        const bezierMax = Math.ceil(Math.max(bezierSize.x, bezierSize.z));

        return new VoxelGrid(new BoundingBox3D(
            new Vec3(-bezierMax, Math.floor(bezierBox.min.y) - 1, -bezierMax),
            new Vec3(bezierMax, Math.ceil(bezierBox.max.y) + 1, bezierMax)
        ));
    }

    *positions(){
        for (let i = 0; i < this._positionGroups.length; i++){
            const positionGroup = this._positionGroups[i];
            for (const hash of positionGroup){
                const unhashed = this._unhash2d(hash);
                unhashed.y = i;
                yield unhashed.add(this._offset);
            }
        }
    }


    /** Adds position to grid (assumes integer). Returns true iff a new position was added
     * @param position {Vec3}
     * */
    addPosition(position){
        const localPosition = position.subtractNew(this._offset);
        if (localPosition.x < 0 || localPosition.y < 0 || localPosition.z < 0){
            throw new Error('VoxelGrid: Position out of bounds');
        }

        const hash = this._hash2d(localPosition.x, localPosition.z);
        const group = this._positionGroups[localPosition.y];
        if (!group.has(hash)){
            group.add(hash);
            this._nOccupied++;
            return true;
        }
        return false;
    }

    /** Converts x and z in local-coordinates to a hash
     * @param x {number}
     * @param z {number}
     * @returns number
     * */
    _hash2d(x, z){
        return x + this._size.x * z;
    }

    /** @param value {number}
     * @returns Vec3
     * */
    _unhash2d(value){
        const x = value % this._size.x;
        const z = (value - x) / this._size.x;
        return new Vec3(x, 0, z);
    }
}

class VoxelShader extends Shader{
    /** @param gl {WebGL2RenderingContext} **/
    constructor(gl) {
        super(gl, null);
        this._corner = new ShaderAttribute(gl, 'aCorner', this._program);
        this._center = new ShaderAttribute(gl, 'aCenter', this._program);
        this._view = new ShaderUniformMat4(gl, 'uView', this._program);
        this._viewProjection = new ShaderUniformMat4(gl, 'uViewProjection', this._program);
    }

    /** @param camera {Camera} **/
    use(camera) {
        super.use();
        this._view.upload(camera._viewMatrix);
        this._viewProjection.upload(camera._viewProjection);
    }

    makeVertexSource(args) {
        return `
        uniform mat4 uViewProjection;
        uniform mat4 uView;
        
        layout(location=0) in vec3 aCorner;
        layout(location=1) in vec3 aCenter;
        
        out vec3 vColor;
        out vec3 vCubePosition;
        out vec3 vViewPosition;
        
        void main(){
            vColor = vec3(1.);
            vCubePosition = aCorner;
            highp vec4 worldPosition = vec4(aCorner + aCenter, 1.);
            highp vec4 viewP =uView * worldPosition;
            vViewPosition = viewP.xyz / viewP.w;
            gl_Position = uViewProjection * worldPosition;
        }
        `;
    }

    makeFragmentSource(args) {
        return `
        in lowp vec3 vColor;
        in lowp vec3 vCubePosition;
        in highp vec3 vViewPosition;
        
        out lowp vec4 outColor;
        
        bool applyBorders(const lowp vec3 cubePosition){
            const lowp float borderMin = 0.01;
            const lowp float borderMax = 1. - borderMin;
            uint b = 0u;
            b += (vCubePosition.x <= borderMin || vCubePosition.x >= borderMax) ? 1u : 0u;
            b += (vCubePosition.y <= borderMin || vCubePosition.y >= borderMax) ? 1u : 0u;
            b += (vCubePosition.z <= borderMin || vCubePosition.z >= borderMax) ? 1u : 0u;
            
            return b == 1u;
        }
        
        void main(){
            highp vec3 viewNormal = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));
            highp float d = max(dot(viewNormal, vec3(0., 0., 1.)), 0.3);
            outColor = vec4(applyBorders(vCubePosition) ? d*vColor : vec3(0), 1.);
        }
        `;
    }

}