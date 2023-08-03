const DERIV_STEP = 0.05;

class Sampler{
    constructor(){}
    sample(pos){
        return this.sample_xyz(pos[0], pos[1], pos[2]);
    }

    sample_list(points){
        return points.map((point,_) => this.sample(point));
    }

    sample_xyz(x,y,z){
        return 0;
    }

    sample_1d(x){
        return this.sample_xyz(x,0,0);
    }

    deriv(pos){
        const dx = this.sample_xyz(pos[0] + DERIV_STEP, pos[1], pos[2]) - this.sample_xyz(pos[0] - DERIV_STEP, pos[1], pos[2]);
        const dy = this.sample_xyz(pos[0], pos[1] + DERIV_STEP, pos[2]) - this.sample_xyz(pos[0], pos[1] - DERIV_STEP, pos[2]);
        const dz = this.sample_xyz(pos[0], pos[1], pos[2] + DERIV_STEP) - this.sample_xyz(pos[0], pos[1], pos[2] - DERIV_STEP);

        return vec4(-dx, -dy, -dz, 0.0);
    }

    // Normalized derivative vector
    deriv_norm(pos){
        const dx = this.sample_xyz(pos[0] + DERIV_STEP, pos[1], pos[2]) - this.sample_xyz(pos[0] - DERIV_STEP, pos[1], pos[2]);
        const dy = this.sample_xyz(pos[0], pos[1] + DERIV_STEP, pos[2]) - this.sample_xyz(pos[0], pos[1] - DERIV_STEP, pos[2]);
        const dz = this.sample_xyz(pos[0], pos[1], pos[2] + DERIV_STEP) - this.sample_xyz(pos[0], pos[1], pos[2] - DERIV_STEP);

        const length = Math.sqrt(dx*dx +dy*dy + dz*dz);
        return vec4(-dx/length, -dy/length, -dz/length, 0.0);
    }

    deriv_norm_xyz(x,y,z){
        const dx = this.sample_xyz(x + DERIV_STEP, y, z) - this.sample_xyz(x - DERIV_STEP, y, z);
        const dy = this.sample_xyz(x, y + DERIV_STEP, z) - this.sample_xyz(x, y - DERIV_STEP, z);
        const dz = this.sample_xyz(x, y, z + DERIV_STEP) - this.sample_xyz(x, y, z - DERIV_STEP);

        const length = Math.sqrt(dx*dx +dy*dy + dz*dz);
        return vec4(-dx/length, -dy/length, -dz/length, 0.0);
    }
}

class SphereSampler extends Sampler{
    constructor(centers, radii){
        super();
        this.centers = centers;
        this.radii = radii;
    }

    sample_xyz(x,y,z){
        var min_dist = Number.MAX_SAFE_INTEGER;

        for (var i = 0; i < this.centers.length; i++){
            const dx = x - this.centers[i][0];
            const dy = y - this.centers[i][1];
            const dz = z - this.centers[i][2];
            var curr_dist = dx*dx + dy*dy + dz*dz - this.radii[i] * this.radii[i];
            min_dist = Math.min(min_dist, curr_dist);
        }
        return - min_dist;
    }
}

class PlaneSampler extends Sampler{
    constructor(){
        super();

    }

    sample_xyz(x,y,z){
        return z - 2;
        //return Math.sin(z/(Math.PI) - 0.8); 
    }
}

class SimplexSampler extends Sampler{
    constructor(seed){
        super();
        this.seed = seed;
    }

    sample_xyz(x,y,z){
        return noise_simplex_3d(x * 0.06,y*0.06,z*0.06);
    }

    sample_1d(x){
        return 1.5*noise_simplex_2d(x, this.seed);
    }
}
