class Matrix4 {
    constructor() {
        this.values = new Float32Array(16);
    }

    setValue(row, column, value){
        this.values[row + (column << 2)] = value;
    }

    static fromIdentity(){
        const matrix = new Matrix4();
        matrix.setValue(0,0,1);
        matrix.setValue(1,1,1);
        matrix.setValue(2,2,1);
        matrix.setValue(3,3,1);
        return matrix;
    }

    static fromPerspective( fovy, aspect, near, far ){
        const result = new Matrix4();
        return result.setPerspective(fovy, aspect, near, far);
    }

    static fromOrthographic( left, right, bottom, top, near, far ){
        const result = new Matrix4();
        return result.setOrtographic(left, right, bottom, top, near, far);
    }

    clone(){
        const clonedMatrix = new Matrix4();
        for (let i = 0; i <  16; i++){
            clonedMatrix.values[i] = this.values[i];
        }
        return clonedMatrix;
    }

    setPerspective(fovy, aspect, near, far){
        let f = 1.0 / Math.tan(radians(fovy) / 2),
            nf;

        this.values[0] = f / aspect;
        this.values[1] = 0;
        this.values[2] = 0;
        this.values[3] = 0;
        this.values[4] = 0;
        this.values[5] = f;
        this.values[6] = 0;
        this.values[7] = 0;
        this.values[8] = 0;
        this.values[9] = 0;
        this.values[11] = -1;
        this.values[12] = 0;
        this.values[13] = 0;
        this.values[15] = 0;

        if (far != null && far !== Infinity) {
            nf = 1 / (near - far);
            this.values[10] = (far + near) * nf;
            this.values[14] = 2 * far * near * nf;

        } else {
            this.values[10] = -1;
            this.values[14] = -2 * near;
        }
        return this;
    }

    setOrtographic(left, right, bottom, top, near, far ){
        const w = right - left;
        const h = top - bottom;
        const d = far - near;

        this.setValue(0, 0, 2.0 / w);
        this.setValue(1, 1, 2.0 / h);
        this.setValue(2, 2, -2.0 / d);
        this.setValue(0, 3, -(left + right) / w);
        this.setValue(1, 3, -(top + bottom) / h);
        this.setValue(2, 3, -(near + far) / d);
        return this;
    }

    /**
     * Generates a matrix that makes something look at something else.
     * @param {Vec3} eye Position of the viewer
     * @param {Vec3} target Point the viewer is looking at
     * @param {Vec3} up vec3 pointing up
     * @returns {Matrix4} out
     */
    lookAt(eye, target, up){
        // const v = target.subtractNew(eye).normalize();  // view direction vector
        // const n =  v.crossNew(up).normalize(); //normalize( cross(v, up) );       // perpendicular vector
        // const u = n.crossNew(v).normalize()//normalize( cross(n, v) );        // "new" up vector
        //
        // v.negate();
        //
        // // First row
        // this.values[0] = n.values[0];
        // this.values[1] = n.values[1];
        // this.values[2] = n.values[2];
        // this.values[3] = 0; // -n.dot(eye)
        // // Second row
        // this.values[4] = u.values[0];
        // this.values[5] = u.values[1];
        // this.values[6] = u.values[2];
        // this.values[7] = 0;
        // // Third roww
        // this.values[8] = v.values[0];
        // this.values[9] = v.values[1];
        // this.values[10] = v.values[2];
        // this.values[11] = 0;
        // // Final row
        // this.values[12] = -n.dot(eye);
        // this.values[13] = -u.dot(eye);
        // this.values[14] = -v.dot(eye);
        // this.values[15] = 1;
        //
        // /*var result = mat4(
        //     vec4( n, -dot(n, eye) ),
        //     vec4( u, -dot(u, eye) ),
        //     vec4( v, -dot(v, eye) ),
        //     vec4()
        // ); */
        //
        // return this;

        let eyex = eye.values[0],
            eyey = eye.values[1],
            eyez = eye.values[2],

            upx = up.values[0],
            upy = up.values[1],
            upz = up.values[2];

        let z0 = eyex - target.values[0],
            z1 = eyey - target.values[1],
            z2 = eyez - target.values[2];

        let len = z0 * z0 + z1 * z1 + z2 * z2;

        if (len > 0) {
            len = 1 / Math.sqrt(len);
            z0 *= len;
            z1 *= len;
            z2 *= len;

        }

        let x0 = upy * z2 - upz * z1,
            x1 = upz * z0 - upx * z2,
            x2 = upx * z1 - upy * z0;

        len = x0 * x0 + x1 * x1 + x2 * x2;

        if (len > 0) {
            len = 1 / Math.sqrt(len);
            x0 *= len;
            x1 *= len;
            x2 *= len;
        }

        this.values[0] = x0;
        this.values[1] = x1;
        this.values[2] = x2;
        this.values[3] = 0;
        this.values[4] = z1 * x2 - z2 * x1;
        this.values[5] = z2 * x0 - z0 * x2;
        this.values[6] = z0 * x1 - z1 * x0;
        this.values[7] = 0;
        this.values[8] = z0;
        this.values[9] = z1;
        this.values[10] = z2;
        this.values[11] = 0;
        this.values[12] = eyex;
        this.values[13] = eyey;
        this.values[14] = eyez;
        this.values[15] = 1;
        return this;
    }

    inverse(){
        return Matrix4.inverse(this, this);
    }
    /**
     * Inverts a mat4
     * @param {Matrix4} out the receiving matrix
     * @param {Matrix4} a the source matrix
     * @returns {Matrix4} out
     */
    static inverse(out, a) {
        let a00 = a.values[0],
            a01 = a.values[1],
            a02 = a.values[2],
            a03 = a.values[3];

        let a10 = a.values[4],
            a11 = a.values[5],
            a12 = a.values[6],
            a13 = a.values[7];

        let a20 = a.values[8],
            a21 = a.values[9],
            a22 = a.values[10],
            a23 = a.values[11];

        let a30 = a.values[12],
            a31 = a.values[13],
            a32 = a.values[14],
            a33 = a.values[15];

        let b00 = a00 * a11 - a01 * a10;
        let b01 = a00 * a12 - a02 * a10;
        let b02 = a00 * a13 - a03 * a10;
        let b03 = a01 * a12 - a02 * a11;
        let b04 = a01 * a13 - a03 * a11;
        let b05 = a02 * a13 - a03 * a12;
        let b06 = a20 * a31 - a21 * a30;
        let b07 = a20 * a32 - a22 * a30;
        let b08 = a20 * a33 - a23 * a30;
        let b09 = a21 * a32 - a22 * a31;
        let b10 = a21 * a33 - a23 * a31;
        let b11 = a22 * a33 - a23 * a32;

        // Calculate the determinant
        let det =
            b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
        if (!det) {
            return null;
        }

        det = 1.0 / det;

        out.values[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
        out.values[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
        out.values[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
        out.values[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
        out.values[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
        out.values[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
        out.values[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
        out.values[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
        out.values[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
        out.values[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
        out.values[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
        out.values[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
        out.values[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
        out.values[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
        out.values[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
        out.values[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

        return out;
    }

    /**
     * Multiplies two matrices
     * @param {Matrix4} out the receiving matrix
     * @param {Matrix4} a the first operand
     * @param {Matrix4} b the second operand
     * @returns {Matrix4} out
     */
    static multiply(out, a, b) {
        let a00 = a.values[0],
            a01 = a.values[1],
            a02 = a.values[2],
            a03 = a.values[3];

        let a10 = a.values[4],
            a11 = a.values[5],
            a12 = a.values[6],
            a13 = a.values[7];

        let a20 = a.values[8],
            a21 = a.values[9],
            a22 = a.values[10],
            a23 = a.values[11];

        let a30 = a.values[12],
            a31 = a.values[13],
            a32 = a.values[14],
            a33 = a.values[15];

        // Cache only the current line of the second matrix

        let b0 = b.values[0],
            b1 = b.values[1],
            b2 = b.values[2],
            b3 = b.values[3];

        out.values[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out.values[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out.values[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out.values[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b.values[4];
        b1 = b.values[5];
        b2 = b.values[6];
        b3 = b.values[7];

        out.values[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out.values[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out.values[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out.values[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b.values[8];
        b1 = b.values[9];
        b2 = b.values[10];
        b3 = b.values[11];

        out.values[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out.values[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out.values[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out.values[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b.values[12];
        b1 = b.values[13];
        b2 = b.values[14];
        b3 = b.values[15];

        out.values[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out.values[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out.values[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out.values[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        return out;
    }

    multiply(b){
        return Matrix4.multiply(this, this, b);
    }

    multiplyNew(b){
        const result = this.clone();
        return result.multiply(b);
    }
}