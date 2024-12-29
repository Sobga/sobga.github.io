"use strict";
// let main;
window.onload = async function () {
    const objFile = await (fetch('../AB_COMMON/models/bunny.obj').then(response => response.text()));
    const model =  parseOBJ(objFile);

    // Normalize model to have coordinates 0 - 1
    const modelScale = 1/Math.max(...model.boundingBox.size().values);
    model.transformVertices(v => v.subtract(model.boundingBox.min).scale(modelScale));
    const boxes = toBoundedTriangles(model);

    const groupedBoxes = groupBoxes(boxes);
}

class SimpleModel{
    /**
     * @param {Vec3[]} vertices
     * @param {number[]} indices */
    constructor(vertices, indices) {
        this.vertices = vertices;
        this.indices = indices;
        this.boundingBox = BoundingBox3D.fromPositions(vertices);
    }

    /** @param {(Vec3) => Vec3} transform */
    transformVertices(transform){
        this.vertices = this.vertices.map(vertex => transform(vertex));
        this.boundingBox = BoundingBox3D.fromPositions(this.vertices);
    }
}

/**
 * @param {string} objFile
 * @return {SimpleModel}
 *  */
function parseOBJ(objFile){
    const lines = objFile.split('\n');
    const vertices = [];
    const indices = [];
    for (const line of lines){
        const elements = line.split(' ');
        switch (elements[0]){
            case '#': continue;
            case 'v': vertices.push(new Vec3(
                    Number.parseFloat(elements[1]),
                    Number.parseFloat(elements[2]),
                    Number.parseFloat(elements[3])
                ));
                break;
            case 'f':
                indices.push(Number.parseInt(elements[1]) - 1);
                indices.push(Number.parseInt(elements[2]) - 1);
                indices.push(Number.parseInt(elements[3]) - 1);
        }
    }
    return new SimpleModel(vertices, indices);
}


/** @param {SimpleModel} model
 * @return {BoundingBox3D[]} */
function toBoundedTriangles(model){
    const boundingBoxes = [];
    for (let i = 0; i < model.indices.length/3; i++){
        const p = model.vertices[model.indices[3*i]];
        const q = model.vertices[model.indices[3*i + 1]];
        const r = model.vertices[model.indices[3*i + 2]];

        boundingBoxes.push(BoundingBox3D.fromPositions([p, q, r]));
    }
    return boundingBoxes;
}

/** @param {BoundingBox3D[]} boxes */
function groupBoxes(boxes){

}