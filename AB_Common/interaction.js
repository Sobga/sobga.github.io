/** @type{{string: number}} */
const Directions = {
    FORWARD: 0,
    TILT: 1,
    LEFT: 2,
    UP: 3
};

class Interaction{
    /** @typedef {{index:number, positive: string, negative: string}} KeyCode */
    /** @type KeyCode[] */
    static KEY_CODES = [
        {index: Directions.FORWARD, positive: 'KeyW', negative: 'KeyS'},
        {index: Directions.TILT, positive: 'KeyQ', negative: 'KeyE'},
        {index: Directions.LEFT, positive: 'KeyA', negative: 'KeyD'},
        {index: Directions.UP, positive: 'KeyR', negative: 'KeyF'}
    ];

    constructor() {
        this.keypressses = [0, 0, 0, 0];
        // Create event handlers for keyboard input - https://stackoverflow.com/a/5206754, keep reference to self
        document.addEventListener('keydown', this.handleKeydown.bind(this));
        document.addEventListener('keyup', this.handleKeyup.bind(this));
    }

    handleKeydown(event){
        for (const keyCode of Interaction.KEY_CODES){
            if (event.code === keyCode.positive){
                this.keypressses[keyCode.index] = 1;
                break;
            } else if (event.code === keyCode.negative){
                this.keypressses[keyCode.index] = -1;
                break;
            }
        }
    }

    handleKeyup(event){
        for (const keyCode of Interaction.KEY_CODES){
            if (event.code === keyCode.positive && this.keypressses[keyCode.index] === 1 ||
                event.code === keyCode.negative && this.keypressses[keyCode.index] === -1){
                this.keypressses[keyCode.index] = 0;
                break;
            }
        }
    }
}