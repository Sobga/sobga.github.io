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

    /** @return Vec3 */
    get center(){
        return this.max.subtractNew(this.min).scale(0.5).add(this.min);
    }

    /** @return Vec3 */
    size(){
        return this.max.subtractNew(this.min);
    }
}