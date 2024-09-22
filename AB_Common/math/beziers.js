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

    evaluate(t){
        const tSQ  = t*t;
        const subT = 1-t;
        const subTSQ = 1-t;

        const coeffP = tSQ*t;
        const coeffPH = 3*tSQ*subT;
        const coeffQH = 3*t*subTSQ;
        const coeffQ = subTSQ * subT;

        return new Vec3(
            coeffP*this.p.x + coeffPH*this.pHandle.x + coeffQH*this.qHandle.x + coeffQ * this.q.x,
            coeffP*this.p.y + coeffPH*this.pHandle.y + coeffQH*this.qHandle.y + coeffQ * this.q.y,
            coeffP*this.p.z + coeffPH*this.pHandle.z + coeffQH*this.qHandle.z + coeffQ * this.q.z,
        );
    }
}