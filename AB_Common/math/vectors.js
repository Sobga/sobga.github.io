class Vec2{
    constructor(x = null, y = null){
        this.values = [0, 0];

        if (!isNullOrUndefined(x)){
            this.values[0] = x;
        }
        if (!isNullOrUndefined(y)){
            this.values[1] = y;
        }
    }
    get x(){
        return this.values[0];
    }
    set x(value){
        this.values[0] = value;
    }

    get y(){
        return this.values[1];
    }
    set y(value){
        this.values[1] = value;
    }

    clone(){
        return new Vec2(this.x, this.y);
    }

    add(v){
        this.values[0] += v.values[0];
        this.values[1] += v.values[1];
        return this;
    }

    subtract(v){
        this.values[0] -= v.values[0];
        this.values[1] -= v.values[1];
        return this;
    }

    subtractNew(v){
        return this.clone().subtract(v)
    }

    scale(f){
        this.values[0] *= f;
        this.values[1] *= f;
        return this;
    }

    normalize(){
        const sqLength = this.values[0]*this.values[0] + this.values[1]*this.values[1];
        if (sqLength < 0.000001){
            return this; // Avoid division by zero
        }
        const invLength = 1/Math.sqrt(sqLength);
        this.values[0] *= invLength;
        this.values[1] *= invLength;
        return this;
    }

    normalizeNew(){
        const result = new Vec2(this.values[0], this.values[1]);
        return result.normalize();
    }
}

class Vec3{
    static up(){
        return new Vec3(0, 1, 0);
    }

    static left(){
        return new Vec3(1, 0, 0);
    }

    constructor(x = null, y = null, z = null){
        this.values = [0, 0, 0];
        if (!isNullOrUndefined(x)){
            this.values[0] = x;
        }
        if (!isNullOrUndefined(y)){
            this.values[1] = y;
        }
        if (!isNullOrUndefined(z)){
            this.values[2] = z;
        }
    }

    get x(){
        return this.values[0];
    }
    set x(value){
        this.values[0] = value;
    }

    get y(){
        return this.values[1];
    }
    set y(value){
        this.values[1] = value;
    }

    get z(){
        return this.values[2];
    }
    set z(value){
        this.values[2] = value;
    }

    equals(other){
        return this.values[0] === other.values[0]
            && this.values[1] === other.values[1]
            && this.values[2] === other.values[2];
    }

    /** @returns boolean*/
    isNonZero(){
        return this.values[0] !== 0 || this.values[1] !== 0 || this.values[2] !== 0;
    }

    normalize(){
        const length = this.length();
        this.values[0] /= length;
        this.values[1] /= length;
        this.values[2] /= length;
        return this;
    }

    copy(v){
        this.values[0] = v.values[0];
        this.values[1] = v.values[1];
        this.values[2] = v.values[2];
        return this;
    }

    /** @returns {Vec3} **/
    clone(){
        return new Vec3(this.values[0], this.values[1], this.values[2]);
    }

    length(){
        return Math.sqrt(this.values[0] * this.values[0] + this.values[1] * this.values[1] + this.values[2] * this.values[2]);
    }

    lengthSQ(){
        return this.values[0] * this.values[0] + this.values[1] * this.values[1] + this.values[2] * this.values[2];
    }

    /** @returns {Vec3} **/
    add(v){
        this.values[0] += v.values[0];
        this.values[1] += v.values[1];
        this.values[2] += v.values[2];
        return this;
    }

    /** @returns {Vec3} **/
    addNew(v){
        return new Vec3(
        this.values[0] + v.values[0],
        this.values[1] + v.values[1],
        this.values[2] + v.values[2]
        );
    }

    subtract(v){
        return Vec3.subtract(this, this, v);
    }

    subtractNew(v){
        return Vec3.subtract(new Vec3(), this, v);
    }

    /** @return Vec3 */
    static subtract(target, u, v){
        target.values[0] = u.values[0] - v.values[0];
        target.values[1] = u.values[1] - v.values[1];
        target.values[2] = u.values[2] - v.values[2];
        return target;
    }

    // Shorthand for this.scale(-1)
    negate(){
        return this.scale(-1);
    }

    scale(scalar){
        this.values[0] *= scalar;
        this.values[1] *= scalar;
        this.values[2] *= scalar;
        return this;
    }

    scaleNew(scalar){
        return new Vec3(
            scalar * this.values[0],
            scalar * this.values[1],
            scalar * this.values[2]
        );
    }

    dot(v){
        return this.values[0] * v.values[0] + this.values[1] * v.values[1] + this.values[2] * v.values[2];
    }

    cross(v){
        return Vec3.cross(this, this, v);
    }

    crossNew(v){
        return Vec3.cross(new Vec3(), this, v);
    }

    min(v){
        this.x = Math.min(this.x, v.x);
        this.y = Math.min(this.y, v.y);
        this.z = Math.min(this.z, v.z);
        return this;
    }

    max(v){
        this.x = Math.max(this.x, v.x);
        this.y = Math.max(this.y, v.y);
        this.z = Math.max(this.z, v.z);
        return this;
    }

    ceil(){
        this.values[0] = Math.ceil(this.values[0]);
        this.values[1] = Math.ceil(this.values[1]);
        this.values[2] = Math.ceil(this.values[2]);
        return this;
    }

    round(){
        this.values[0] = Math.round(this.values[0]);
        this.values[1] = Math.round(this.values[1]);
        this.values[2] = Math.round(this.values[2]);
        return this;
    }

    /** @return Vec3 */
    static cross(target, u, v){
        const ux = u.values[0], uy = u.values[1], uz = u.values[2];
        const vx = v.values[0], vy = v.values[1], vz = v.values[2];

        target.values[0] = uy*vz - uz*vy;
        target.values[1] = uz*vx - ux*vz;
        target.values[2] = ux*vy - uy*vx;
        return target;
    }

    /**

     * Rotate a 3D vector around the y-axis
     * @param {Vec3} out The receiving vec3
     * @param {Vec3} a The vec3 point to rotate
     * @param {Vec3} origin The origin of the rotation
     * @param {Number} rad The angle of rotation in radians
     * @returns {Vec3} out
     */
    static rotateY(out, a, origin, rad) {
        let p = [],
            r = [];
        const originVector = isNullOrUndefined(origin) ? [0, 0, 0] : origin.values;

        //Translate point to the origin
        p[0] = a.values[0] - originVector[0];
        p[1] = a.values[1] - originVector[1];
        p[2] = a.values[2] - originVector[2];

        //perform rotation
        r[0] = p[2] * Math.sin(rad) + p[0] * Math.cos(rad);
        r[1] = p[1];
        r[2] = p[2] * Math.cos(rad) - p[0] * Math.sin(rad);

        //translate to correct position
        out.values[0] = r[0] + originVector[0];
        out.values[1] = r[1] + originVector[1];
        out.values[2] = r[2] + originVector[2];
        return out;
    }

    rotateY(rad, origin=null){
        return Vec3.rotateY(this, this, origin, rad);
    }
}

class Vec4{
    constructor(x = null, y = null, z = null, w = null){
        this.values = [0, 0, 0, 0];
        if (!isNullOrUndefined(x)){
            this.values[0] = x;
        }
        if (!isNullOrUndefined(y)){
            this.values[1] = y;
        }
        if (!isNullOrUndefined(z)){
            this.values[2] = z;
        }
        if (!isNullOrUndefined(w)){
            this.values[3] = w;
        }
    }

    get x(){
        return this.values[0];
    }

    get y(){
        return this.values[1];
    }
    get z(){
        return this.values[2];
    }
    get w(){
        return this.values[3];
    }
}