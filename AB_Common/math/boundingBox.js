class BoundingBox2D{
    constructor(min, max) {
        this.min = min;
        this.max = max;
    }
}

class BoundingBox3D{
    /**
     * @param min {Vec3}
     * @param max {Vec3}
     * **/
    constructor(min, max) {
        this.min = min;
        this.max = max;
    }

    empty(){
        this.min.setValues(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
        this.max.setValues(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
    }
    static emptyBox(){
        const min = new Vec3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
        const max = new Vec3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
        return new BoundingBox3D(min, max);
    }
    /** @param positions {Iterable<Vec3>} */
    static fromPositions(positions){
        const min = new Vec3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
        const max = new Vec3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

        for (const position of positions){
            min.min(position);
            max.max(position);
        }

        if (min.x > max.x){
            return null;
        }
        return new BoundingBox3D(min, max);
    }

    /** @param boundingBoxes {Iterable<BoundingBox3D>} */
    static fromBoundingBoxes(boundingBoxes){
        const min = new Vec3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
        const max = new Vec3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

        for (const box of boundingBoxes){
            min.min(box.min);
            max.max(box.max);
        }

        if (min.x > max.x){
            return null;
        }
        return new BoundingBox3D(min, max);
    }

    /** @return Vec3 */
    get center(){
        return this.max.subtractNew(this.min).scale(0.5).add(this.min);
    }

    /** @return Vec3 */
    size(){
        return this.max.subtractNew(this.min);
    }

    /** @returns number */
    surfaceArea(){
        const s = this.size();
        return 2 * (s.x*s.y + s.x*s.z + s.y*s.z);
    }

    /** @param other {BoundingBox3D} */
    union(other){
        this.min.min(other.min);
        this.max.max(other.max);
    }
}