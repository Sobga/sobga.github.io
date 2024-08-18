class HexMeshGenerator{
    /** @param gl {WebGL2RenderingContext}
     * @param resolution {number}
     */
    constructor(gl, resolution) {
        this._gl = gl;
        const hexArrays = HexMeshGenerator.generateHexMesh(resolution);

        this.hexVAO = gl.createVertexArray();
        gl.bindVertexArray(this.hexVAO);

        // Upload vertex data
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, hexArrays.vertices, WebGL2RenderingContext.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        // Upload index data
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, hexArrays.indices, WebGL2RenderingContext.STATIC_DRAW);

        // Unbind
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        this.hexPlane = {
            nVertices: hexArrays.vertices.length / 2,
            vertexBuffer: vertexBuffer,
            nIndices: hexArrays.indices.length,
            indexBuffer: indexBuffer
        }

        this.terrainTransform = new TerrainTransform(gl);
    }

    /** @param bounds {BoundingBox2D}
     *  @return HexMesh
     * */
    generate(bounds){
        // Allocate buffer for result
        const normalAndHeightBuffer = this._gl.createBuffer();
        this._gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, normalAndHeightBuffer);
        const bufferSize = 3 * 4 * this.hexPlane.nVertices; // entries * float byte size * vertex count
        this._gl.bufferData(WebGL2RenderingContext.ARRAY_BUFFER, bufferSize, WebGL2RenderingContext.STATIC_DRAW);
        this._gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, null);

        // Compute terrain heights and normal
        this._gl.bindVertexArray(this.hexVAO);
        this.terrainTransform.computeTerrainData(normalAndHeightBuffer, bounds, this.hexPlane.nVertices);
        this._gl.bindVertexArray(null);

        return new HexMesh(this._gl, this.hexPlane, normalAndHeightBuffer, bounds);
    }

    static generateHexMesh(resolution){
        const entriesPrVertex = 2;
        const stepSize = 1 / (resolution - 1);

        // Number of small/large rows
        const nSmall = Math.ceil(resolution / 2);
        const nLarge = Math.floor(resolution / 2);

        const vertices = new Float32Array(entriesPrVertex * ((resolution + 1) * nLarge + resolution * nSmall));

        const trianglesPrRow = 2*resolution-1;
        const indices = new Uint16Array(3 * trianglesPrRow * (nSmall + nLarge - 1));

        let vertexIdx = 0;
        let indexIdx = 0;
        let currentRow = [];
        let prevRow = [];

        for (let i = 0; i < resolution; i++){
            const stop = i % 2 === 0 ? resolution : resolution + 1;
            const rowHeight = stepSize * i;

            for (let j = 0; j < stop; j++){
                // Compute vertex positions
                const offset= i % 2 === 1 ? -0.5 : 0;
                vertices[entriesPrVertex * vertexIdx] = clamp(stepSize * (j + offset), 0, 1);
                vertices[entriesPrVertex * vertexIdx + 1] = rowHeight;
                currentRow.push(vertexIdx);

                // Add indices
                if (i > 0) {
                    if (i % 2 === 0){ // Even row
                        if (j > 0){
                            indexIdx = HexMeshGenerator.addTriangle(indices, indexIdx, currentRow[j-1], prevRow[j], prevRow[j-1]);
                            indexIdx = HexMeshGenerator.addTriangle(indices, indexIdx, prevRow[j], currentRow[j-1], vertexIdx);

                            if (j === stop - 1){
                                indexIdx = HexMeshGenerator.addTriangle(indices, indexIdx, vertexIdx, prevRow[j], prevRow[j+1]);
                            }
                        }
                    } else {
                        switch (j){
                            case 0:
                                break;
                            case 1:
                                indexIdx = HexMeshGenerator.addTriangle(indices, indexIdx, vertexIdx, currentRow[j-1], prevRow[j-1]);
                                break;
                            default:
                                indexIdx = HexMeshGenerator.addTriangle(indices, indexIdx, currentRow[j-1], prevRow[j-1], prevRow[j-2]);
                                indexIdx = HexMeshGenerator.addTriangle(indices, indexIdx, vertexIdx, prevRow[j-1], currentRow[j-1]);
                        }
                    }
                }
                vertexIdx++;
            }

            prevRow = currentRow;
            currentRow = [];
        }
        return {vertices: vertices, indices: indices};
    }

    /**
     * Adds a triangle to the index buffer
     * @param {Uint16Array} buffer Index buffer
     * @param {number} idx Current writing index
     * @param {number} a Indices of the corners of the triangle
     * @param {number} b
     * @param {number} c
     */
    static addTriangle(buffer, idx, a, b, c){
        if (idx + 2 >= buffer.length){
            throw new Error('addTriangle: Out of bounds');
        }
        buffer[idx++] = a;
        buffer[idx++] = b;
        buffer[idx++] = c;
        return idx;
    }
}


class TerrainTransform extends FeedbackShader{
    makeVertexSource(args) {
        return `#define M_PI_INV 0.31830988618

uniform highp vec4 uBounds; // XY: min corner, ZW: max corner        
in highp vec2 aPosition;

out highp vec3 vHeightAndGradient; // x: Height, yz: xz-gradient

#define METHOD 0
#define INTERPOLANT 1

const mat2 rot = mat2(
    0.80, -0.60,
    0.60,  0.80
);

// this hash is not production ready, please
// replace this by something better
vec2 hash( in ivec2 p ) {                        
    // 2D -> 1D
    ivec2 n = p.x*ivec2(3,37) + p.y*ivec2(311,113);
    
    // 1D hash by Hugo Elias
    n = (n << 13) ^ n;
    n = n * (n * n * 15731 + 789221) + 1376312589;
    return -1.0+2.0*vec2( n & ivec2(0x0fffffff))/float(0x0fffffff);
}

// return gradient noise (in x) and its derivatives (in yz)
vec3 noised( in vec2 p ){
    #if METHOD==0
    ivec2 i = ivec2(floor( p ));
    #else
    vec2 i = floor( p );
    #endif
    vec2 f = fract( p );
    
    #if INTERPOLANT==1
    // quintic interpolation
    vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);
    vec2 du = 30.0*f*f*(f*(f-2.0)+1.0);
    #else
    // cubic interpolation
    vec2 u = f*f*(3.0-2.0*f);
    vec2 du = 6.0*f*(1.0-f);
    #endif    
    
    #if METHOD==0
    vec2 ga = hash( i + ivec2(0,0) );
    vec2 gb = hash( i + ivec2(1,0) );
    vec2 gc = hash( i + ivec2(0,1) );
    vec2 gd = hash( i + ivec2(1,1) );
    #else
    vec2 ga = hash( i + vec2(0.0,0.0) );
    vec2 gb = hash( i + vec2(1.0,0.0) );
    vec2 gc = hash( i + vec2(0.0,1.0) );
    vec2 gd = hash( i + vec2(1.0,1.0) );
    #endif
    
    float va = dot( ga, f - vec2(0.0,0.0) );
    float vb = dot( gb, f - vec2(1.0,0.0) );
    float vc = dot( gc, f - vec2(0.0,1.0) );
    float vd = dot( gd, f - vec2(1.0,1.0) );
    
    return vec3( 
        va + u.x*(vb-va) + u.y*(vc-va) + u.x*u.y*(va-vb-vc+vd),   // value
        ga + u.x*(gb-ga) + u.y*(gc-ga) + u.x*u.y*(ga-gb-gc+gd) +  // derivatives
        du * (u.yx*(va-vb-vc+vd) + vec2(vb,vc) - va)
    );
}

vec3 terrainData(const in vec2 p){
    vec3 altitudeAndGradient = vec3(0.);
    float strength = 1.0;
    mat2 m = mat2(
        1.0, 0.0,
        0.0, 1.0
    );
    
    vec2 pNew = vec2(p);
    float altitude = 0.;
    vec2 gradient = vec2(0.);
    for (int i = 0; i < 7; i++){
        vec3 altitudeAndGradient = noised(pNew);
        gradient += altitudeAndGradient.yz;
        altitude += strength * altitudeAndGradient.x / (1. + dot(gradient, gradient));
        strength *= 0.5;
        pNew = rot * pNew * 2.;
    }
    
    return vec3(altitude, gradient);
}

void main(){
    vec2 position = aPosition * (uBounds.zw - uBounds.xy) + uBounds.xy;
    /* float h = height(position);
    vec3 normal = normalize(vec3(
        height(position.x + EPSILON) - height(position - EPSILON),
        2. * EPSILON.x,
        height(position + EPSILON.yx) - height(position - EPSILON.yx)
    ));*/            
    vHeightAndGradient = vec3(10., 1., 1.) * terrainData(position * 0.1);
}
`;
    }

    makeFragmentSource(args) {
        return 'void main(){}';
    }

    /** @param gl {WebGL2RenderingContext} */
    constructor(gl) {
        super(gl, ['vHeightAndGradient']);
        this._bounds = new ShaderUniformVec4(gl, 'uBounds', this._program);
    }

    /**
     * @param outBuffer {WebGLBuffer}
     * @param bounds {BoundingBox2D}
     * @param nPrimitives {number}
     *  */
    computeTerrainData(outBuffer, bounds, nPrimitives) {
        this.use();
        this._bounds.upload(bounds.min.x, bounds.min.y, bounds.max.x, bounds.max.y);
        this.transform([outBuffer], nPrimitives);
    }
}

class HexMesh{
    /**
     * @param gl {WebGL2RenderingContext}
     * @param hexPlane
     * @param normalHeightBuffer {WebGLBuffer}
     * @param bounds
     *  */
    constructor(gl, hexPlane, normalHeightBuffer, bounds) {
        this._gl = gl;
        this._bounds = bounds; // TODO: Make UBO
        this._nVertices = hexPlane.nVertices;
        this._nIndices = hexPlane.nIndices;

        this._vao = gl.createVertexArray();

        gl.bindVertexArray(this._vao);
        // Plane vertices
        gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, hexPlane.vertexBuffer);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        // Normal and height
        gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, normalHeightBuffer);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

        // Indices
        gl.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, hexPlane.indexBuffer);

        gl.bindVertexArray(null);
    }

    draw(){
        this._gl.bindVertexArray(this._vao);
        this._gl.drawElements(WebGL2RenderingContext.TRIANGLES, this._nIndices, WebGL2RenderingContext.UNSIGNED_SHORT, 0);
    }

    drawAsPoints(){
        this._gl.bindVertexArray(this._vao);
        this._gl.drawArrays(WebGL2RenderingContext.POINTS, 0, this._nVertices);
    }
}