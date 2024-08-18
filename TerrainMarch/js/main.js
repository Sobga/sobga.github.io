"use strict";

let terrainShader;

/** @type {TerrainFinalizeShader} */
let outShader;
let gl;

const camPos = new Vec3(0, 1.5, 0);
const camDir = new Vec3(.1, -0.05, -0.3).normalize();

let distanceTexture;
let distanceBuffer;

window.onload = function init(){
    // Init canvas
    var canvas = document.getElementById("gl-canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    gl = canvas.getContext("webgl2");
    const ext = gl.getExtension("EXT_color_buffer_float");

    // Init shaders
    terrainShader = new TerrainShader(gl);
    outShader = new TerrainFinalizeShader(gl);

    distanceTexture = new TextureRGBA32F(gl, canvas.width, canvas.height);
    distanceBuffer = new Framebuffer(gl, distanceTexture);

    createAndAttachQuad();

    // Enable for drawing
    gl.vertexAttribPointer(terrainShader._position._location, 2, gl.FLOAT, false, 0 ,0);
    gl.enableVertexAttribArray(terrainShader._position._location);

    // Execute & draw
    render();

}

function createAndAttachQuad(){
    // Points to draw
    const vertices = [
        -1, -1,  // First triangle
        1, -1,
        1, 1,
        -1, -1,    // Second triangle
        1, 1,
        -1, 1
    ];
    
    // Create the buffer, bind it and send data to the GPU.
    var v_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, v_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
}

function render(){
    distanceBuffer.bind();

    // Clear canvas
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0); // Conrflower blue
    gl.clear(gl.COLOR_BUFFER_BIT);

    const resolution = new Vec2(gl.canvas.width, gl.canvas.height);
    const sunDir = new Vec3(1, .7, -0.6).normalize();
    terrainShader.use(camPos, camDir, resolution, sunDir);
    

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    distanceBuffer.unbind();

    outShader.use(distanceTexture, camPos, camDir, resolution, sunDir);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}





class TerrainBaseShader extends BaseQuadShader {
    makeFragmentSource(){
        return /*glsl*/ `
        #define M_PI 3.1415926535897932384626433832795
        #define M_PI_INV 0.31830988618
        #define MAX_ITER 1024
        precision mediump float; 

        uniform vec2 uResolution; // Resolution of rendered image
        uniform vec3 uSunDirection;

        uniform vec3 uCamPosition;
        uniform vec3 uCamDirection;

        in vec2 vPosition; // From [0,0]->[1,1]
        out vec4 out_color;

        const vec3 camUp = vec3(0.0, 1.0, 0.0);
        const vec3 terrainColor = vec3(0.3, 0.2, 0.1);
        const vec3 skyColor = vec3(0., 0.2, 0.5);

        const mat2 rot = mat2(
            0.80, -0.60,
            0.60,  0.80
        );

        float a(const in vec2 ij){
            vec2 uv = 51.*fract(ij*M_PI_INV);
            return 2.0 * fract(uv.x*uv.y*(uv.x+uv.y)) - 1.0;
        }

        // Smoothstep; 3x^2-2x^3
        float S(const in float lambda){
            return lambda*lambda*(3.0-2.0*lambda);
        }
        
        float N(const in vec2 p){
            vec2 ij = floor(p);
            float a_ij = a(ij);
            float b_ij = a(ij + vec2(1, 0));
            float c_ij = a(ij + vec2(0, 1));
            float d_ij = a(ij + vec2(1, 1));

            return a_ij 
            + (b_ij - a_ij) * S(p.x-ij.x)
            + (c_ij - a_ij) * S(p.y-ij.y)
            + (a_ij - b_ij - c_ij + d_ij) * S(p.x-ij.x) * S(p.y-ij.y);
        } 

        float f(const in vec2 p){
            float altitude = 0.0;
            float scale = 1.0;
            mat2 m = mat2(
                1.0, 0.0, 
                0.0, 1.0
            );

            for (int i = 0; i < 9; i++){
                altitude += (1.0/scale) * N(scale*m*p);
                scale *= 2.0;
                m *= rot;
            }

            return altitude;
        }

        float height(const in float x, const in float z){
            return 10.0 * f(vec2(x, z) * 0.1);
        }

        vec3 getNormal(const vec3 p){
            const float eps = 1E-4;
            return normalize(
                vec3(height(p.x-eps,p.z) - height(p.x+eps,p.z),
                    2.0*eps,
                    height(p.x,p.z-eps) - height(p.x,p.z+eps))
            );
        }

        // https://www.cl.cam.ac.uk/teaching/1718/AdvGraph/5.%20GPU%20Ray%20Marching.pdf
        vec3 generateRayDirection(vec3 camDir, vec2 uv){
            vec3 camSide = normalize(cross(camDir, camUp));
            vec2 p = 2.0 * uv - 1.0;
            p.x *= uResolution.x / uResolution.y; // Aspect ratio - TODO: Cache? 

            return normalize(
                p.x * camSide + 
                p.y * camUp + 
                1.0 * camDir // FOV?
            ); 
        }
        
        // Returns whether terrain was hit
        bool raymarchTerrain(const in vec3 position, const in vec3 rayDir, const in float maxDistance, out float distance){
            float dt = 0.01;
            float t = 0.1;

            float prev_y = 0.0;
            float prev_h = 0.0;

            for (int i = 0; i < MAX_ITER && t < maxDistance; i++){
                vec3 p = rayDir * t + position;
                float h = height(p.x, p.z);

                if (p.y < h){
                    distance = t - dt + dt*(prev_h - prev_y) / (p.y - prev_y - h + prev_h);
                    return true;
                }

                // Save variables
                prev_y = p.y;
                prev_h = h;

                // Prepare for next iteration
                dt = 0.01*t;
                t += dt;
            }

            return false;
        }`
    }

    constructor(gl){
        super(gl, null);
    }
}


class TerrainShader extends TerrainBaseShader{
    makeFragmentSource(){
        return super.makeFragmentSource() + /*glsl*/ `
        // https://iquilezles.org/articles/fog/
        vec3 applyFog(const vec3 color, const float depth, const float sunStrength, const vec3 rayDir){
            const float b = 0.02; // Fog strength
            float fogAmount = 1.0 - exp(-depth * b);
            float sunAmount = sunStrength * max(dot(rayDir, uSunDirection), 0.0);
            vec3  fogColor  = mix(vec3(0.5, 0.6, 0.7), // blue
                                  vec3(1.0, 0.9, 0.7), // yellow
                                  pow(sunAmount,8.0));
                                
            return color*exp(-depth*b) + fogColor*(1.0-exp(-depth*b));
        }

        void main(){
            vec3 rayDir = generateRayDirection(uCamDirection, vPosition);

            float distance;
            if (raymarchTerrain(uCamPosition, rayDir, 10000.0, distance)){
                vec3 hit = rayDir * distance + uCamPosition;
                //vec3 normal = getNormal(hit);
                // float sunStrength = max(dot(normal, uSunDirection), .0);
                float shadowDistance;
                bool shadowHit = raymarchTerrain(hit, uSunDirection, 1000.0, shadowDistance);
                out_color = vec4(distance, shadowHit ? shadowDistance : -1., -1., -1.);
                // vec3 terrainShade = terrainColor * light;
                // out_color.rgb = applyFog(terrainShade, distance, sunStrength, rayDir);
            } else {
                out_color = vec4(-1.);
            }

            out_color.a = 1.0;
        }`;
    }

    constructor(gl){
        super(gl, null);
        this._position = new ShaderAttribute(gl, 'aPosition', this._program);

        this._resolution = new ShaderUniformVec2(gl, 'uResolution', this._program);
        this._sunDirection = new ShaderUniformVec3(gl, 'uSunDirection', this._program);
        this._camPos = new ShaderUniformVec3(gl, 'uCamPosition', this._program);
        this._camDir = new ShaderUniformVec3(gl, 'uCamDirection', this._program);
    }

    use(camPos, camDir, resolution, sunDir){
        super.use();
        this._camPos.uploadVec3(camPos);
        this._camDir.uploadVec3(camDir);

        this._resolution.uploadVec2(resolution);
        this._sunDirection.uploadVec3(sunDir);
    }
}

class TerrainFinalizeShader extends BaseQuadShader {
    makeFragmentSource(){
        return  /* glsl */ `
        precision mediump float; 
        uniform highp sampler2D uSampler;
        uniform highp vec3 uCamDirection;
        uniform highp vec3 uCamPosition;
        uniform vec2 uResolution; // Resolution of rendered image
        uniform vec3 uSunDirection;

        in highp vec2 vPosition; // From [0,0]->[1,1]

        out highp vec4 out_color;

        const vec3 camUp = vec3(0.0, 1.0, 0.0);
        const vec3 terrainColor = vec3(0.3, 0.2, 0.1);
        const vec3 skyColor = vec3(0., 0.2, 0.5);

        // https://iquilezles.org/articles/fog/
        vec3 applyFog(const vec3 color, const float depth, const float sunStrength, const vec3 rayDir){
            const float b = 0.02; // Fog strength
            float fogAmount = 1.0 - exp(-depth * b);
            float sunAmount = sunStrength * max(dot(rayDir, uSunDirection), 0.0);
            vec3  fogColor  = mix(vec3(0.5, 0.6, 0.7), // blue
                                  vec3(1.0, 0.9, 0.7), // yellow
                                  pow(sunAmount,8.0));
                                
            return color*exp(-depth*b) + fogColor*(1.0-exp(-depth*b));
        }

        // https://www.cl.cam.ac.uk/teaching/1718/AdvGraph/5.%20GPU%20Ray%20Marching.pdf
        vec3 generateRayDirection(vec3 camDir, vec2 uv){
            vec3 camSide = normalize(cross(camDir, camUp));
            vec2 p = 2.0 * uv - 1.0;
            p.x *= uResolution.x / uResolution.y; // Aspect ratio - TODO: Cache? 

            return normalize(
                p.x * camSide + 
                p.y * camUp + 
                1.0 * camDir // FOV?
            ); 
        }

        void main(){
            highp vec2 distances = texture(uSampler, vPosition).rg;
            highp vec3 rayDir = generateRayDirection(uCamDirection, vPosition);

            if (distances.r < 0.0){
                out_color.rgb = applyFog(skyColor, 1000.0, 1.0, rayDir);
            } else {
                highp vec3 hit = uCamPosition + rayDir * distances.r;

                float sunStrength = distances.g > 0. ? 0. : 1.;
                out_color.rgb = applyFog(terrainColor, distances.r, sunStrength, rayDir);
            }
            out_color.a = 1.0;
        }
        `;
    }

    constructor(gl){
        super(gl, null);
        this.sampler = new ShaderUniform1i(gl, 'uSampler', this._program);
        this.camDir = new ShaderUniformVec3(gl, 'uCamDirection', this._program);
        // this.camPos = new ShaderUniformVec3(gl, 'uCamPosition', this._program);

        this.resolution = new ShaderUniformVec2(gl, 'uResolution', this._program);
        this.sunDir = new ShaderUniformVec3(gl, 'uSunDirection', this._program);
    }

    /**
     * @param {TextureRGBA32F} distanceTexture 
     */
    use(distanceTexture, camPos, camDir, resolution, sunDir){
        super.use();
        distanceTexture.bind(0);
        this.sampler.upload(0);

        // this.camPos.uploadVec3(camPos);
        this.camDir.uploadVec3(camDir);

        this.resolution.uploadVec2(resolution);
        this.sunDir.uploadVec3(sunDir);
    }
}

class TextureShader extends BaseQuadShader{
    makeFragmentSource(){
        return /* glsl */`
            uniform highp sampler2D uSampler;
            uniform highp vec4 uChannelScales;
            in highp vec2 vPosition; // From [0,0]->[1,1]

            out highp vec4 out_color;

            void main(){
                out_color = uChannelScales * texture(uSampler, vPosition);
                out_color.a = 1.0;
            }
        `;
    }

    constructor(gl){
        super(gl, null);
        this.sampler = new ShaderUniform1i(gl, 'uSampler', this._program);
        this.channelScales = new ShaderUniformVec4(gl, 'uChannelScales', this._program);
    }

    /**
     * @param {Texture} texture 
     */
    use(texture){
        super.use();
        texture.bind(0);
        this.sampler.upload(0);
        this.channelScales.upload(0.01, 0.1, 0, 0);
    }
}