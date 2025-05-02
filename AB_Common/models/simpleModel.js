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

	/**
	 * @param {string} objFile
	 * @return {SimpleModel}
	 *  */
	static fromOBJ(objFile){
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
}