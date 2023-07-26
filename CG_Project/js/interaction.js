const PROJECTION = perspective(60, 1, 0.1, 100);
const CAM_FOV = 80;
const CAM_NEAR = 0.1;
const CAM_FAR = 50; // TODO - set using render distance?
const CAM_UP = vec3(0.0, 1.0, 0.0);

class Camera{
    constructor (intrinsics){
        this.intrinsics = intrinsics; // Projection matrix
    }

    update(delta_t){}

    update_aspect(aspect){
        this.intrinsics = perspective(CAM_FOV, aspect, CAM_NEAR, CAM_FAR);
    }
    get_cam_matrix(){
        return null;
    }

    get_cam_pos(){
        return null;
    }
}

class RotateCam extends Camera{
    constructor (center, r){
        super(perspective(CAM_FOV, 1, CAM_NEAR, CAM_FAR));
        this.center = center;
        this.radius = r;
        this.angle = 0.0;
    }

    update(delta_t){
        const SEC_REV = 10;
        this.angle += 2*Math.PI * delta_t / (1000 * SEC_REV);

        // Limit angle to [0, 2PI]
        while (this.angle > 2*Math.PI)
            this.angle -= 2*Math.PI;
    }

    get_cam_pos(){
        const eye = vec3(
            Math.cos(this.angle) * this.radius + this.center[0], 
            this.center[1],  
            Math.sin(this.angle) * this.radius + this.center[2]);
        return eye;
    }

    get_cam_matrix(){
        const eye = this.get_cam_pos();
        const extrinsics = lookAt(eye, this.center, CAM_UP);
        return mult(this.intrinsics, extrinsics);
    }
}

const FWD_SPEED = 4;
const UP_SPEED = 1.5;
const ANG_SPEED = 2;
class KeyboardCam extends Camera{
    constructor (pos, dir){
        super(perspective(CAM_FOV, 1, CAM_NEAR, CAM_FAR));
        this.pos = pos;
        this.dir = dir;
        this.up = vec3(0,1,0);
        this.rot_speed = 0.0;
        this.fwd_speed = 0.0;
        this.up_speed = 0.0;
        
        // Create event handlers for keyboard input - https://stackoverflow.com/a/5206754, keep reference to self
        var self = this;
        document.addEventListener('keydown', function (event) {self.handle_keydown(event)});
        document.addEventListener('keyup', function (event) {self.handle_keyup(event)});
    }
    handle_keyup(event){
        switch (event.code){
            case "KeyQ":
            case "KeyE":
                this.up_speed = 0;
                break;
            case "KeyW":
            case "KeyS":
                this.fwd_speed = 0;
                break;
            case "KeyA":
            case "KeyD":
                this.rot_speed = 0;
                break;
            default: break;
        }
    }

    handle_keydown(event){
        switch (event.code){
            // Look upwards
            case "KeyQ" :{
                this.up_speed = UP_SPEED;
                break;
            }

            // Look downwards
            case "KeyE":{
                this.up_speed = -UP_SPEED;
                break;
            }
            
            // Move forward
            case "KeyW":{
                this.fwd_speed = FWD_SPEED;
                break;
            }

            // Move backward
            case "KeyS":{
                this.fwd_speed = -FWD_SPEED;
                break;
            }

            // Rotate left
            case "KeyA":{
                this.rot_speed = -ANG_SPEED;
                break;
            }

            // Rotate right
            case "KeyD":{
                this.rot_speed = ANG_SPEED;
                break;
            }
            default : break;
        }
    }

    update(delta_t){
        const secs_elapsed = delta_t / 1000;
    
        // Handle self rotation
        this.dir = normalize(mult(rotateY(this.rot_speed), this.dir));
        
        // Handle rotating up and down - prevent looking directly up
        if ((this.up_speed > 0 && this.dir[1] < 0.98) || (this.up_speed < 0 && this.dir[1] > -0.98)){
            const rot_axis = cross(this.dir, this.up);
            this.dir = mult(rotate(this.up_speed, rot_axis), this.dir);
        }

        for (var i = 0; i < 3; i++)
            this.pos[i] += this.fwd_speed * this.dir[i] * secs_elapsed;
    }

    get_cam_matrix(){
        const look_position = vec3(this.pos[0] + this.dir[0], this.pos[1] + this.dir[1], this.pos[2] + this.dir[2]);
        const extrinsics = lookAt(this.pos, look_position, CAM_UP);
        return mult(this.intrinsics, extrinsics);
    }

    get_cam_pos(){
        return vec4(this.pos);
    }
}

const MAX_SPEEDS = vec3(3, 0.01, 0.01);
const ACCELS = vec3(0.6, 0.005, 0.005);
class SubmarineCam extends Camera{
    constructor(gl, pos, dir){
        super(perspective(CAM_FOV, 1, CAM_NEAR, CAM_FAR));
        this.submarine = new Submarine(gl, pos, dir);
        
        this.keypresses = vec3(0,0,0);
        this.speeds = vec3(0,0,0); // FWD, UP, ANG
        
        // Quaternions for rotation control
        this.q_rot = new Quaternion().make_rot_vec2vec(MODEL_FWD, dir);
        this.q_up = new Quaternion();
        this.q_y = new Quaternion();

        // Position for camera
        this.cam_pos = vec3(pos[0], pos[1], pos[2]-3);
        
        // Target position for camera - relative to submarine
        this.target_offset = vec4(0, 2, -5, 1);

        // Create event handlers for keyboard input - https://stackoverflow.com/a/5206754, keep reference to self
        var self = this;
        document.addEventListener('keydown', function (event) {self.handle_keydown(event)});
        document.addEventListener('keyup', function (event) {self.handle_keyup(event)});
    }

    handle_keyup(event){
        switch (event.code){
            case "KeyQ":
                if (this.keypresses[1] == 1)
                    this.keypresses[1] = 0;
                break;
            case "KeyE":
                if (this.keypresses[1] == -1)
                    this.keypresses[1] = 0;
                break;
            case "KeyW":
                if (this.keypresses[0] == 1)
                    this.keypresses[0] = 0;
                break;
            case "KeyS":
                if (this.keypresses[0] == -1)
                    this.keypresses[0] = 0;
                break;
            case "KeyA":
                if (this.keypresses[2] == -1)
                    this.keypresses[2] = 0;
                break;
            case "KeyD":
                if (this.keypresses[2] == 1)
                    this.keypresses[2] = 0;
                break;
            default: break;
        }
    }

    handle_keydown(event){
        switch (event.code){
            // Look upwards
            case "KeyQ" :{
                this.keypresses[1] = 1;
                break;
            }

            // Look downwards
            case "KeyE":{
                this.keypresses[1] = -1;
                break;
            }
            
            // Move forward
            case "KeyW":{
                this.keypresses[0] = 1;
                break;
            }

            // Move backward
            case "KeyS":{
                this.keypresses[0] = -1;
                break;
            }

            // Rotate left
            case "KeyA":{
                this.keypresses[2] = -1;
                break;
            }

            // Rotate right
            case "KeyD":{
                this.keypresses[2] = 1;
                break;
            }
            default : break;
        }
    }

    update(delta_t){
        const secs_elapsed = delta_t / 1000;
        for (var i = 0; i < 3; i++){
            // Apply acceleration
            this.speeds[i] += this.keypresses[i] * ACCELS[i];
            
            // Clamp speeds
            this.speeds[i] = Math.min(Math.max(this.speeds[i], -MAX_SPEEDS[i]), MAX_SPEEDS[i]);
        }
 
        // Handle rotation of submarine - prevent turning completely around 
        const old_dir = vec4(this.q_rot.apply(MODEL_FWD));
        const local_left = this.q_rot.apply(vec3(1,0,0))
        if (old_dir[1] > 0.95)
            this.q_up = this.q_up.make_rot_angle_axis(Math.max(-this.speeds[1], 0), local_left);
        else if(old_dir[1] < -0.85)
            this.q_up = this.q_up.make_rot_angle_axis(Math.min(-this.speeds[1], 0), local_left);
        else
            this.q_up = this.q_up.make_rot_angle_axis(-this.speeds[1], local_left);

        this.q_y = this.q_y.make_rot_angle_axis(-this.speeds[2], vec3(0,1, 0));
    
        // Compute new rotation for submarine
        var q_a = new Quaternion();
        this.q_rot = this.q_up.multiply(this.q_rot);
        this.q_rot = q_a.multiply(this.q_y).multiply(this.q_rot);
            
        // Compute new direction 
        const dir = vec4(this.q_rot.apply(MODEL_FWD));
        dir[3] = 0;

        // Compute new position for submarine
        var pos = this.submarine.pos;
        for (var i = 0; i < 3; i++)
            pos[i] += this.speeds[0] * dir[i] * secs_elapsed;

        // Get new tranform matrix for submarine
        const transform = mult(translate(pos[0], pos[1], pos[2]), this.q_rot.get_mat4());
        this.submarine.set_model_transform(pos, dir, this.q_rot, transform);
        this.submarine.propeller.update(this.speeds[0], secs_elapsed);

        // Compute new position for camera
        // Camera position will be a mix between these
        const offset = mult(transform, this.target_offset);
        for (var i = 0; i < 3; i++)
            this.cam_pos[i] = 0.95 * this.cam_pos[i] + 0.05 * offset[i];

        // Decay speeds
        for (var i = 0; i < 3; i++){
            this.speeds[i] *= 0.95;
        }
    }

    get_cam_matrix(){
        return mult(this.intrinsics, lookAt(this.cam_pos, vec3(this.submarine.pos), CAM_UP));
    }

    get_cam_pos(){
        return vec4(this.cam_pos);
    }
}