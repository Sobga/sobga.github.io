'use strict';

class CubicBezier {
    /**
     * @param p {Vec3}
     * @param pHandle {Vec3}
     * @param q {Vec3}
     * @param qHandle {Vec3}
     * **/
    constructor(p, q, pHandle, qHandle) {
        this.p = p;
        this.q = q;
        this.pHandle = pHandle;
        this.qHandle = qHandle;
    }

    /** Computes the bounding-box using the min/max of the control-points
     * TODO: Investigate https://stackoverflow.com/a/24814530
     * @return {BoundingBox3D}
     */
    boundingBox(){
        const minCorner = this.p.clone();
        const maxCorner = this.p.clone();

        minCorner.min(this.q);
        minCorner.min(this.pHandle);
        minCorner.min(this.qHandle);

        maxCorner.max(this.q);
        maxCorner.max(this.pHandle);
        maxCorner.max(this.qHandle);
        return new BoundingBox3D(minCorner, maxCorner);
    }

    evaluate(t){
        const tSQ  = t*t;
        const subT = 1-t;
        const subTSQ = subT*subT;

        const coeffP = subTSQ*subT;
        const coeffPH = 3*t*subTSQ;
        const coeffQH = 3*tSQ*subT;
        const coeffQ = t*tSQ;

        return new Vec3(
            coeffP*this.p.x + coeffPH*this.pHandle.x + coeffQH*this.qHandle.x + coeffQ * this.q.x,
            coeffP*this.p.y + coeffPH*this.pHandle.y + coeffQH*this.qHandle.y + coeffQ * this.q.y,
            coeffP*this.p.z + coeffPH*this.pHandle.z + coeffQH*this.qHandle.z + coeffQ * this.q.z,
        );
    }

    /** @param t {number}  */
    /* derivative(t){
        const tSQ = t*t;
        return new Vec3(
            (-3*this.p.x + 9*this.pHandle.x - 9*this.qHandle.x + 3*this.q.x)*tSQ + () * t
        );
    } */
}