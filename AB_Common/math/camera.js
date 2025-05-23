class Camera {
    constructor() {
        this._viewMatrix = Matrix4.fromIdentity();
        this._projectionMatrix = new Matrix4();
        this._viewProjection = this._viewMatrix.multiplyNew(this._projectionMatrix);

        this._position = new Vec3();
        this._direction = new Vec3();
    }

    setPerspective(fovy, aspect, near, far){
        this._projectionMatrix.setPerspective(fovy, aspect, near, far);
        Matrix4.multiply(this._viewProjection, this._projectionMatrix, this._viewMatrix);
        return this;
    }

    /** @param position {Vec3}
     *  @param direction {Vec3}
     * */
    setPosition(position = null, direction = null){
        let updated = false
        if (!isNullOrUndefined(position) && !position.equals(this._position)){
            updated = true;
            this._position.copy(position);
        }

        if (!isNullOrUndefined(direction) && direction.isNonZero() && !direction.equals(this._direction)){
            updated = true;
            this._direction.copy(direction);
        }

        if (updated){
            this._viewMatrix.lookAt(this._position, this._position.addNew(this._direction), Vec3.up());
            Matrix4.multiply(this._viewProjection, this._projectionMatrix, this._viewMatrix);
        }
        return this;
    }

    // Gribb/Hartmann, https://www8.cs.umu.se/kurser/5DV051/HT12/lab/plane_extraction.pdf
    getWorldFrustum(){
        const planeInfo = [new Vec4(), new Vec4(), new Vec4(), new Vec4(), new Vec4(), new Vec4()]
        for (let i = 0; i < 4; i++){planeInfo[0].values[i] = this._viewProjection.getValue(3, i) + this._viewProjection.getValue(0, i)}
        for (let i = 0; i < 4; i++){planeInfo[1].values[i] = this._viewProjection.getValue(3, i) - this._viewProjection.getValue(0, i)}
        for (let i = 0; i < 4; i++){planeInfo[2].values[i] = this._viewProjection.getValue(3, i) + this._viewProjection.getValue(1, i)}
        for (let i = 0; i < 4; i++){planeInfo[3].values[i] = this._viewProjection.getValue(3, i) - this._viewProjection.getValue(1, i)}
        for (let i = 0; i < 4; i++){planeInfo[4].values[i] = this._viewProjection.getValue(3, i) + this._viewProjection.getValue(2, i)}
        for (let i = 0; i < 4; i++){planeInfo[5].values[i] = this._viewProjection.getValue(3, i) - this._viewProjection.getValue(2, i)}

        for (let i = 0; i < 6; i++){
            const length = Math.sqrt(planeInfo[i].values[0] * planeInfo[i].values[0] + planeInfo[i].values[1] * planeInfo[i].values[1] + planeInfo[i].values[2] * planeInfo[i].values[2]);
            for (let j = 0; j < 3; j++){
                planeInfo[i].values[j] /= length;
            }
        }
        return planeInfo;
    }
}