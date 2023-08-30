import { BinaryTree } from "../../_Common/bbst.js";
import { HalfEdge, Point, Polygon, Vertex, create_full_edge } from "../../_Common/polygon.js";
import { PriorityQueue } from "../../_Common/priority_queue.js";
import { is_reflex, p_orientation } from "../../_Common/utils.js";

const EPSILON = 1E-4;
const VERTEX_TYPE = {
    START: 0,
    END: 1,
    REGULAR: 2,
    SPLIT: 3,
    MERGE: 4
}

function vertex_cmp(u: Vertex, v: Vertex): boolean{
    if (Math.abs(u.y - v.y) < EPSILON)
        return u.x < v.x;
    return u.y < v.y;
}

function vertex_num_cmp(u: Vertex, v: Vertex): number{
    const y_diff =  u.y - v.y;
    if (Math.abs(y_diff) < EPSILON){
        return u.x - v.x;
    }
    return y_diff;
}

function half_edge_cmp(h_0: HalfEdge, h_1: HalfEdge): boolean{
    // Assumes segments are non-intersecting
    const self_0 = p_orientation(h_0.origin, h_0.destination(), h_1.origin);
    const self_1 = p_orientation(h_0.origin, h_0.destination(), h_1.destination());

    if (self_0 * self_1 > 0)
        // On the same side
        return self_0 > 0;

    return p_orientation(h_1.origin, h_1.destination(), h_0.origin) < 0;
}


export class Triangulator{
    tree: BinaryTree<HalfEdge>;
    helpers: Map<HalfEdge, Vertex>;
    polygon: Polygon;
    query_edges = create_full_edge(new Vertex(0,0), new Vertex(1,1));

    constructor(){
        this.tree = new BinaryTree<HalfEdge>(half_edge_cmp);
        this.helpers = new Map<HalfEdge, Vertex>();

        test_halfedge_cmp();
    }

    public triangulate(polygon: Polygon){
        this.polygon = polygon;
        this.make_y_monotone();
        const seen_edges = new Set<HalfEdge>();
        for (const vertex of polygon.all_vertices()){
            if (seen_edges.has(vertex.incident_edge))
                continue;

            // Found a new monotone-polygon
            var top_vertex = vertex;
            var top_edge = null;
            var bottom_vertex = vertex;
            var n_vertices = 0;
            for (const cycle_edge of vertex.incident_edge.next_iter()){
                const current_vertex = cycle_edge.origin;
                if (current_vertex.y >= top_vertex.y){
                    top_vertex = cycle_edge.origin;
                    top_edge = cycle_edge;
                } 

                if (current_vertex.y < bottom_vertex.y){
                    bottom_vertex = current_vertex;
                }            
                
                seen_edges.add(cycle_edge);
                n_vertices++;
            }

            if (n_vertices == 3)
                continue;
            // Construct chains
            const chain_data: [Vertex, boolean][] = [];

            var left_edge = top_edge;
            var right_edge = top_edge.prev;
            while (left_edge.origin != bottom_vertex || right_edge.origin != bottom_vertex){
                const left_candidate = left_edge.origin;
                const right_candidate = right_edge.origin;

                if (left_candidate.y >= right_candidate.y){
                    chain_data.push([left_edge.origin, true]);
                    left_edge = left_edge.next;
                } else {
                    chain_data.push([right_edge.origin, false]);
                    right_edge = right_edge.prev;
                }
                if (chain_data.length > n_vertices)
                    throw new Error("Infinite while-loop");
            }
            chain_data.push([bottom_vertex, false]);
            this.triangulate_monotone(chain_data);
        }
    }

    private triangulate_monotone(chain_data: [Vertex, boolean][]){
        const stack: [Vertex, boolean][] = [];
        console.log(chain_data);
        stack.push(chain_data[0]);
        stack.push(chain_data[1]);

        for (var j = 2; j < chain_data.length - 1; j++){
            const u_j = chain_data[j];

            // Are the vertices on the same side of the chain?
            if (u_j[1] != stack[stack.length - 1][1]){
                // Pop all items from stack and add diagonals, aside from the last
                while (stack.length > 0){
                    const [pop_vertex, _] = stack.pop();
                    if (stack.length > 0)
                        this.polygon.insert_diagonal(u_j[0], pop_vertex);
                }
                stack.push(chain_data[j-1]);
                stack.push(chain_data[j]);
            } else {
                var [last_popped, last_side] = stack.pop();
                const side_sign = last_side ? -1 : 1;

                // Add diagonals while there is still a direct line
                while (stack.length > 0 && side_sign * p_orientation(stack[stack.length - 1][0], last_popped, u_j[0]) < 0) {
                    [last_popped, last_side] = stack.pop();
                    this.polygon.insert_diagonal(u_j[0], last_popped);                    
                }
                stack.push([last_popped, last_side]);
                stack.push(u_j);
            }
        }

        for (var i = 1; i < stack.length - 1; i++)
            this.polygon.insert_diagonal(chain_data[chain_data.length - 1][0], stack[i][0]);
    }

    private make_y_monotone(){
        // Construct priority queue
        const p_queue = [...this.polygon.all_vertices()].sort(vertex_num_cmp);
    
        while (p_queue.length > 0){
            const v = p_queue.pop();
            const type = determine_vertex_type(v);
            switch(type){
                case VERTEX_TYPE.START  : this.handle_start_vertex(v);   break;
                case VERTEX_TYPE.END    : this.handle_end_vertex(v);     break;
                case VERTEX_TYPE.SPLIT  : this.handle_split_vertex(v);   break;
                case VERTEX_TYPE.MERGE  : this.handle_merge_vertex(v);   break;
                case VERTEX_TYPE.REGULAR: this.handle_regular_vertex(v); break;
            }
        }
    }

    handle_start_vertex(v_i: Vertex){
        const e_i = top_to_down_edge(v_i.incident_edge)
        this.tree.insert(e_i);
        this.helpers.set(e_i, v_i);
    }
    
    handle_end_vertex(v_i: Vertex){
        const e_prev = top_to_down_edge(v_i.incident_edge.prev);
        const helper = this.helpers.get(e_prev);
        if (determine_vertex_type(helper) == VERTEX_TYPE.MERGE){
            this.polygon.insert_diagonal(v_i, helper);
        }
        if (!this.helpers.delete(e_prev))
            throw new Error("Key does not exist");
    }
    
    handle_split_vertex(v_i: Vertex){
        const e_j = this.find_edge(v_i);
        const helper_j = this.helpers.get(e_j);
        this.polygon.insert_diagonal(v_i, helper_j);
        this.helpers.set(e_j, v_i);

        const e_i = top_to_down_edge(v_i.incident_edge);
        this.tree.insert(e_i);
        this.helpers.set(e_i, v_i);
    }
    
    handle_merge_vertex(v_i: Vertex){
        const e_prev = top_to_down_edge(v_i.incident_edge.prev);
        const helper_prev = this.helpers.get(e_prev);

        if (determine_vertex_type(helper_prev) == VERTEX_TYPE.MERGE)
            this.polygon.insert_diagonal(v_i, helper_prev);

        this.tree.delete(e_prev);

        const e_j = this.find_edge(v_i);
        const helper_j = this.helpers.get(e_j);
        if (determine_vertex_type(helper_j) == VERTEX_TYPE.MERGE)
            this.polygon.insert_diagonal(v_i, helper_j);

        this.helpers.set(e_j, v_i);
    }
    
    handle_regular_vertex(v_i: Vertex){
        const prev = v_i.incident_edge.prev.origin;
        const next = v_i.incident_edge.destination();

        // Is the interior to the right of v_i?
        if (prev.y > next.y){
            const helper_prev = this.helpers.get(top_to_down_edge(prev.incident_edge));
            if (determine_vertex_type(helper_prev) == VERTEX_TYPE.MERGE){
                this.polygon.insert_diagonal(v_i, helper_prev);
            }
            this.tree.delete(top_to_down_edge(prev.incident_edge));
            const e_i = top_to_down_edge(v_i.incident_edge)
            this.tree.insert(e_i);
            this.helpers.set(e_i, v_i);
        } else {
            const e_j = this.find_edge(v_i);
            const helper_j = this.helpers.get(e_j);
            if (determine_vertex_type(helper_j) == VERTEX_TYPE.MERGE){
                this.polygon.insert_diagonal(v_i, helper_j)
            }
            this.helpers.set(e_j, v_i);
        }
    }

    find_edge(v_i: Vertex): HalfEdge{
        this.query_edges[0].origin = v_i;
        this.query_edges[1].origin = v_i;

        return this.tree.predecessor(this.query_edges[0]);
    }
}

function top_to_down_edge(edge: HalfEdge){
    return edge.origin.y > edge.destination().y ? edge : edge.twin;
}

function determine_vertex_type(v: Vertex): number{
    const prev = v.incident_edge.prev.origin;
    const next = v.incident_edge.destination();

    const is_above_prev = !vertex_cmp(v, prev);
    const is_above_next = !vertex_cmp(v, next)
    const angle = p_orientation(prev, v, next);

    // v is above both neighbors
    if (is_above_prev && is_above_next)
        return angle > 0 ? VERTEX_TYPE.START : VERTEX_TYPE.SPLIT;
    
    // v is below both neighbors
    if (!is_above_prev && !is_above_next)
        return angle > 0 ? VERTEX_TYPE.END : VERTEX_TYPE.MERGE;

    return VERTEX_TYPE.REGULAR;
}

function test_halfedge_cmp(){
    const tests: [Vertex[], boolean][] = [
        [[new Vertex(2,6), new Vertex(4,2), new Vertex(6,8), new Vertex(6,2)], true],
        [[new Vertex(2,6), new Vertex(4,4), new Vertex(6,8), new Vertex(4,2)], true],
        [[new Vertex(5,7), new Vertex(4,4), new Vertex(6,8), new Vertex(3,6)], false],
    ];

    const errors = [];
    for (const data of tests){
        const vertices = data[0];
        const [h_0, h_1] = create_full_edge(vertices[0], vertices[1]);
        const [j_0, j_1] = create_full_edge(vertices[2], vertices[3]);

        if (half_edge_cmp(top_to_down_edge(h_0), top_to_down_edge(j_0)) != data[1])
            errors.push(data);
    }

    for (const data of errors){
        const vertices = data[0];
        const [h_0, h_1] = create_full_edge(vertices[0], vertices[1]);
        const [j_0, j_1] = create_full_edge(vertices[2], vertices[3]);

        if (half_edge_cmp(top_to_down_edge(h_0), top_to_down_edge(j_0)) != data[1])
            throw new Error("Half-edge comparator invalid");
    }   
}