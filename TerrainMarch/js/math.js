function isNullOrUndefined(v){
    return v === null || v === undefined;
}

class Vec3{
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

    get y(){
        return this.values[1];
    }
    get z(){
        return this.values[2];
    }

    normalize(){
        const length = this.length();
        this.values[0] /= length;
        this.values[1] /= length;
        this.values[2] /= length;
        return this;
    }

    length(){
        return Math.sqrt(this.values[0] * this.values[0] + this.values[1] * this.values[1] + this.values[2] * this.values[2]);
    }

    lengthSQ(){
        return this.values[0] * this.values[0] + this.values[1] * this.values[1] + this.values[2] * this.values[2];
    }
}