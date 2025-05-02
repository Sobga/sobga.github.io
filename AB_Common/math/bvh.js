/**
 * BVH (Bounding Volume Hierarchy) construction, based on https://jacco.ompf2.com/2022/04/13/how-to-build-a-bvh-part-1-basics/.
 * @template T
 * */
class BoundingVolumeHierarchy {
	/**
	 * @param {T[]} objects
	 * @param {BoundingBox3D[]} boundingBoxes
	 * */
	constructor(objects, boundingBoxes) {
		const centroids = boundingBoxes.map(b => b.center);
		this.objectIndices = objects.map((_, idx) => idx);
		this.root = this.#subdivide(boundingBoxes, centroids, 0, objects.length);
	}

	/** @param boundingBoxes {BoundingBox3D[]}
	 *  @param centroids {Vec3[]}
	 *  @param start {number} Inclusive
	 *  @param end {number} Exclusive
	 *  @return BVHNode
	 * */
	#subdivide(boundingBoxes, centroids, start, end){
		const relevantBoxes = []
		for (let i = start; i < end; i++){
			relevantBoxes.push(boundingBoxes[this.objectIndices[i]]);
		}
		const bbox = BoundingBox3D.fromBoundingBoxes(relevantBoxes);

		if (end - start <= 2){
			return new BVHNode(bbox, start, end);
		}

		const splitPlane = this.#findBestSplitPlane(bbox, boundingBoxes, centroids, start, end);

		// In-place partitioning
		let i = start;
		let j = end - 1;
		while (i <= j){
			if (centroids[this.objectIndices[i]].values[splitPlane.axis] < splitPlane.position){
				i++;
			} else {
				const temp = this.objectIndices[i];
				this.objectIndices[i] = this.objectIndices[j]
				this.objectIndices[j] = temp;
				j--;
			}
		}

		// Abort split if either side is empty
		if (i === start || i === end - 1){
			return null;
		}

		// Create child nodes
		const node = new BVHNode(bbox, start, end);
		node.left = this.#subdivide(boundingBoxes, centroids, start, i);
		node.right = this.#subdivide(boundingBoxes, centroids, i+1, end);
		return node;
	}

	/**
	 * @param bbox {BoundingBox3D}
	 * @param objectBounds {BoundingBox3D[]}
	 * @param centroids {Vec3[]}
	 * @param start {number} Inclusive
	 * @param end {number} Exclusive
	 * @returns {{axis: number, position: number}}*/
	#findBestSplitPlane(bbox, objectBounds, centroids, start, end) {
		const binCount = 8;

		// Variables to be re-used inside inner loops
		/** @type BVHBin[] */
		const bins = new Array(binCount);
		for (let i = 0; i < binCount; i++){
			bins[i] = new BVHBin();
		}
		const leftArea = new Array(binCount - 1);
		const leftCount = new Array(binCount - 1);
		const leftBbox = BoundingBox3D.emptyBox()
		const rightArea = new Array(binCount - 1);
		const rightCount = new Array(binCount - 1);
		const rightBbox = BoundingBox3D.emptyBox()

		let bestCost = Number.POSITIVE_INFINITY;
		let bestAxis = 0;
		let bestPosition = 0;

		const size = bbox.size()
		for (let axis = 0; axis < 3; axis++) {
			if (size.values[axis] < 0.0001)
				continue;

			// Populate bins for current axis
			const scale = binCount / size.values[axis];
			for (let i = 0; i < binCount; i++) {
				bins[i].reset();
			}
			for(let i = start; i < end; i++){
				const bounds = objectBounds[this.objectIndices[i]];
				const binIdx = Math.min(
					binCount - 1,
					Math.floor((centroids[this.objectIndices[i]].values[axis] - bbox.min.values[axis]) * scale));
				bins[binIdx].bbox.union(bounds);
				bins[binIdx].objectCount++;
			}

			// Compute running totals for each bin
			leftBbox.empty();
			rightBbox.empty();
			let leftSum = 0;
			let rightSum = 0;
			for (let i = 0; i < binCount - 1; i++) {
				leftSum += bins[i].objectCount;
				leftBbox.union(bins[i].bbox);
				leftCount[i] = leftSum;
				leftArea[i] = leftBbox.surfaceArea();

				rightSum += bins[binCount - 1 - i].objectCount;
				rightBbox.union(bins[binCount - 1 - i].bbox);
				rightCount[binCount - 2 - i] = rightSum;
				rightArea[binCount - 2 - i] = rightBbox.surfaceArea();
			}

			// Find best split
			const binWidth = size.values[axis] / binCount;
			for (let i = 0; i < binCount-1; i++) {
				const planeCost = leftCount[i] * leftArea[i] + rightCount[i] * rightArea[i];
				if (planeCost < bestCost) {
					bestAxis  = axis;
					bestPosition = bbox.min.values[axis] + size.values[axis] * binWidth;
					bestCost = planeCost;
				}
			}
		}
		return {axis: bestAxis, position: bestPosition};
	}

}


/**
 * @template T
 * */
class BVHNode {
	constructor(bbox, start, end) {
		this.bbox = bbox;
		this.start = start;
		this.end = end;
		this.left = null;
		this.right = null;
	}
}

class BVHBin {
	constructor() {
		this.bbox = BoundingBox3D.emptyBox();
		this.objectCount = 0;
	}

	reset(){
		this.bbox.empty();
		this.objectCount = 0;
	}
}