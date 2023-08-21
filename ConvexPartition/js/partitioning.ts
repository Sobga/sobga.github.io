import { Point, Polygon, Vertex } from "./polygon.js";
import { bbox, dist_sq, find_closest_intersection, is_reflex } from "./utils.js";

export abstract class Partitioner{
    abstract partition(polygon: Polygon): Polygon[];
}

/**
 * Connects each hole to the outer boundary by extending a vertical line from the extrema until the outer boundary (or another hole) is hit.
 */
export class SimplePartition extends Partitioner{
    partition(polygon: Polygon): Polygon[] {
            // Find extrema of polygon
        var min_y = polygon.boundary[0].y;
        var max_y = polygon.boundary[0].y;
        for (const p of polygon.boundary){
            min_y = p.y < min_y ? p.y : min_y;
            max_y = p.y > max_y ? p.y : max_y;
        }

        for (const hole of polygon.holes){
            var min_hole = hole[0];
            var max_hole = hole[0];

            // Find extrema of hole
            for (const p of hole){
                min_hole = p.y < min_hole.y ? p : min_hole;
                max_hole = p.y > max_hole.y ? p : max_hole;
            }

            // Insert downward line
            const [min_intersect, min_edge] = find_closest_intersection(min_hole, new Point(min_hole.x, min_y - 1), polygon.half_edges);
            polygon.split_edge(min_edge, min_intersect);
            polygon.insert_diagonal(min_hole, min_intersect);

            // Insert upward line
            const [max_intersect, max_edge] = find_closest_intersection(max_hole, new Point(max_hole.x, max_y + 1), polygon.half_edges);
            polygon.split_edge(max_edge, max_intersect);
            polygon.insert_diagonal(max_hole, max_intersect);
        }
        
        return polygon.polygons_from_cycles();
    }
    
}

// TODO: Handle intersections on top of other vertices
export class BisectPartition extends Partitioner{
    partition(polygon: Polygon): Polygon[] {
        const b_box = bbox(polygon.boundary);
        const min_length = Math.sqrt(dist_sq(...b_box));
        console.log("Hello");
        // Find all reflex vertices
        const reflex_pairs = [];
        this.add_reflex_vertices(polygon.boundary, reflex_pairs);
        for (const hole of polygon.holes)
            this.add_reflex_vertices(hole, reflex_pairs);

        // For each reflex vertex, extend a bisector 
        for (const reflex_pair of reflex_pairs){
            const endpoint = this.bisector_endpoint(reflex_pair, min_length);
            const [closest_intersect, closest_edge] = find_closest_intersection(reflex_pair[1], endpoint, polygon.half_edges);
            polygon.split_edge(closest_edge, closest_intersect);
            polygon.insert_diagonal(reflex_pair[1], closest_intersect);
        }

        return polygon.polygons_from_cycles();
    }

    add_reflex_vertices(vertices: Vertex[], out_list: [Vertex, Vertex, Vertex][]){
        const n = vertices.length;
        for (var i = 0; i < n; i++){
            const prev = vertices[(i - 1 + n) % n];
            const now = vertices[i];
            const next = vertices[(i + 1 + n) % n];

            if (is_reflex(prev, now, next))
                out_list.push([prev, now, next]);
        }
    }   

    // TODO: Only go to edge of polygon
    bisector_endpoint(reflex_tuple: [Vertex, Vertex, Vertex], min_length: number): Point{
        const reflex = reflex_tuple[1];

        const dx_p = reflex.x - reflex_tuple[0].x;
        const dy_p = reflex.y - reflex_tuple[0].y;
        const dx_q = reflex.x - reflex_tuple[2].x;
        const dy_q = reflex.y - reflex_tuple[2].y;

        const endpoint = new Point(min_length * (dx_p + dx_q), min_length * (dy_p + dy_q));
        
        endpoint.x += reflex.x;
        endpoint.y += reflex.y;

        return endpoint;
    }
}