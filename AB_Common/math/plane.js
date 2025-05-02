class Plane {
	constructor(normal, point) {
		this._normal = normal ?? new Vec3();
		this._point = point ?? new Vec3();
	}

	setAsVec4(vec) {
		this.setAsXYZW(vec.x, vec.y, vec.z, vec.w)
	}

	setAsXYZW(x, y, z, w) {
		this._normal.setValues(-x, -y, -z);
		this._point = this._normal.scaleNew(w);
	}

}