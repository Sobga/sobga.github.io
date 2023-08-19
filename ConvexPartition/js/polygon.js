import { quadrant_origin, rotate, rotation_matrix_xaxis } from "./utils.js";
export class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
export class Vertex extends Point {
    constructor(x, y, incident_edge = null) {
        super(x, y);
        this.incident_edge = incident_edge;
    }
    // Returns an iterator over all incident edges (originating from this vertex)
    *edge_iter() {
        var current_edge = this.incident_edge;
        while (current_edge.twin.next != this.incident_edge) {
            yield current_edge;
            current_edge = current_edge.twin.next;
        }
        yield current_edge;
    }
}
class IncidentEdgeIterator {
    constructor(start) {
        this.start = start;
        this.current_edge = start.incident_edge;
        console.assert(this.start.incident_edge != null);
    }
    next() {
        if (this.current_edge != this.start.incident_edge) {
            const res = this.current_edge;
            this.current_edge = this.current_edge.twin.next;
            return { value: res, done: false };
        }
        else {
            return { value: null, done: true };
        }
    }
}
export class HalfEdge {
    constructor(origin, twin = null, next = null, prev = null) {
        this.origin = origin;
        this.twin = twin;
        this.next = next;
        this.prev = prev;
    }
    destination() {
        return this.twin.origin;
    }
    split_edge(p) {
        // Create new half-edges
        const h = create_full_edge(p, this.destination());
        h[0].next = this.next;
        h[0].prev = this;
        h[1].next = this.twin;
        h[1].prev = this.twin.prev;
        // Add incident edge to new vertex
        p.incident_edge = h[0];
        // Update old half-edges
        this.next.prev = h[0];
        this.next = h[0];
        this.twin.origin.incident_edge = h[1];
        this.twin.origin = p;
        this.twin.prev.next = h[1];
        this.twin.prev = h[1];
        return h;
    }
    *next_iter() {
        var current_edge = this;
        while (current_edge.next != this) {
            yield current_edge;
            current_edge = current_edge.next;
        }
        yield current_edge;
    }
}
/**
 Creates and edge between u and v. Returns a pair of half-edges [h_0, h_1], where h_0 originates from u.
 */
function create_full_edge(u, v) {
    const h_0 = new HalfEdge(u);
    const h_1 = new HalfEdge(v, h_0);
    h_0.twin = h_1;
    return [h_0, h_1];
}
/**
 Adds edges between v[i] and v[i+1]. Supports boundaries, given in CCW order and holes in CW order
 */
function create_edges(vertices) {
    const n = vertices.length;
    var last_pair = null;
    var first_pair = null;
    const created_edges = [];
    for (var i = 0; i < n; i++) {
        const p = vertices[i];
        const q = vertices[(i + 1) % n];
        // Create half-edges
        const h = create_full_edge(p, q);
        created_edges.push(h[0]);
        created_edges.push(h[1]);
        p.incident_edge = h[0];
        q.incident_edge = h[1];
        // Connect to previous half-edges
        if (last_pair != null) {
            last_pair[0].next = h[0];
            h[0].prev = last_pair[0];
            last_pair[1].prev = h[1];
            h[1].next = last_pair[1];
        }
        if (first_pair == null)
            first_pair = h;
        last_pair = h;
    }
    // Close the loop
    first_pair[0].prev = last_pair[0];
    first_pair[1].next = last_pair[1];
    last_pair[0].next = first_pair[0];
    last_pair[1].prev = first_pair[1];
    return created_edges;
}
export class Polygon {
    constructor(boundary, holes = []) {
        this.boundary = boundary;
        this.n = boundary.length;
        this.holes = holes;
        this.half_edges = create_edges(this.boundary);
        this.outer_cycle_indicators = [this.half_edges[1]];
        for (var i = 0; i < holes.length; i++) {
            const hole_edges = create_edges(holes[i]);
            this.half_edges.push(...hole_edges);
            this.outer_cycle_indicators.push(hole_edges[1]);
        }
    }
    centre_of_mass() {
        const out = new Point(0, 0);
        for (const p of this.boundary) {
            out.x += p.x;
            out.y += p.y;
        }
        out.x /= this.n;
        out.y /= this.n;
        return out;
    }
    polygons_from_cycles() {
        const polygons = [];
        const seen_edges = new Set;
        for (const outer_indicator of this.outer_cycle_indicators)
            for (const edge of outer_indicator.next_iter())
                seen_edges.add(edge);
        for (const edge of this.half_edges) {
            // Has this edge already been seen, or is this edge on the outside?
            if (seen_edges.has(edge))
                continue;
            // New "inner" edge has been found. Find the enclosed face/polygon
            const points = [];
            for (const cycle_edge of edge.next_iter()) {
                points.push(cycle_edge.origin);
                seen_edges.add(cycle_edge);
            }
            polygons.push(new Polygon(points.map((p) => new Vertex(p.x, p.y))));
        }
        return polygons;
    }
    split_edge(edge, v) {
        const h = edge.split_edge(v);
        this.half_edges.push(h[0]);
        this.half_edges.push(h[1]);
    }
    /**
        Inserts a diagonal between vertices v and u in the polygon
    */
    insert_diagonal(v, u) {
        const in_edge = this.cw_edge_slope(v, u).prev;
        const out_edge = this.cw_edge_slope(u, v);
        const [h_0, h_1] = create_full_edge(in_edge.destination(), out_edge.origin);
        this.half_edges.push(h_0);
        this.half_edges.push(h_1);
        h_0.prev = in_edge;
        h_0.next = out_edge;
        h_1.prev = out_edge.prev;
        h_1.next = in_edge.next;
        in_edge.next.prev = h_1;
        in_edge.next = h_0;
        out_edge.prev.next = h_1;
        out_edge.prev = h_0;
        return [h_0, h_1];
    }
    // Returns the incident edge of p, which is immediately after q in the CW order
    cw_edge_slope(p, q) {
        const m = rotation_matrix_xaxis(p, q);
        // Best found edge so far
        var max_edge = p.incident_edge;
        var max_endpoint = rotate(p, max_edge.destination(), m);
        var max_quad = quadrant_origin(max_endpoint);
        for (const edge of p.edge_iter()) {
            if (max_edge == edge)
                continue;
            const rotated_endpoint = rotate(p, edge.destination(), m);
            const rotated_quad = quadrant_origin(rotated_endpoint);
            // Further along the CW order
            if (rotated_quad < max_quad)
                continue;
            // Earlier in the CW order
            if (rotated_quad > max_quad) {
                max_quad = rotated_quad;
                max_endpoint = rotated_endpoint;
                max_edge = edge;
            }
            // Need to compare slopes to determine ordering
            // Compare slopes, using
            // dy0/dx0 <= dy1/dx1
            const lh = max_endpoint.y * rotated_endpoint.x;
            const rh = rotated_endpoint.y * max_endpoint.x;
            if (lh < rh) {
                max_quad = rotated_quad;
                max_endpoint = rotated_endpoint;
                max_edge = edge;
            }
        }
        return max_edge;
    }
}
//# sourceMappingURL=polygon.js.map