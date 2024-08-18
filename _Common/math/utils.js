function isNullOrUndefined(v) {
    return v === null || v === undefined;
}

function clamp(v, min, max) {
    return Math.max(Math.min(v, max), min);
}

function radians( degrees ) {
    return degrees * Math.PI / 180.0;
}