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
            this._viewMatrix.lookAt(this._position, this._position.addNew(this._direction), Vec3.up()).inverse();
            Matrix4.multiply(this._viewProjection, this._projectionMatrix, this._viewMatrix);
        }
        return this;
    }
}