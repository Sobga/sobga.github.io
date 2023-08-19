import { Point, Vertex } from "./polygon.js";
/* From module 5, slide 19
 > 0    -> Left
 < 0    -> Right
  0     -> On the line
 */
export function p_orientation(p, q, r) {
    return (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
}
function intersects(p1, p2, q1, q2) {
    return p_orientation(p1, p2, q1) * p_orientation(p1, p2, q2) <= 0 &&
        p_orientation(q1, q2, p1) * p_orientation(q1, q2, p2) <= 0;
}
// https://stackoverflow.com/a/20925869/
function bbox_overlap(p0, p1, q0, q1) {
    const [pmin_x, pmax_x] = p0.x < p1.x ? [p0.x, p1.x] : [p1.x, p0.x];
    const [pmin_y, pmax_y] = p0.y < p1.y ? [p0.y, p1.y] : [p1.y, p0.y];
    const [qmin_x, qmax_x] = q0.x < q1.x ? [q0.x, q1.x] : [q1.x, q0.x];
    const [qmin_y, qmax_y] = q0.y < q1.y ? [q0.y, q1.y] : [q1.y, q0.y];
    return pmin_x <= qmax_x && qmin_x <= pmax_x && pmin_y <= qmax_y && qmin_y <= pmax_y;
}
// https://stackoverflow.com/a/1968345
function get_line_intersection(p0, p1, q0, q1) {
    if (!bbox_overlap(p0, p1, q0, q1))
        return null;
    const p_dx = p1.x - p0.x;
    const p_dy = p1.y - p0.y;
    const q_dx = q1.x - q0.x;
    const q_dy = q1.y - q0.y;
    const determinant = (p_dx * q_dy - q_dx * p_dy);
    // if determinant.numerator == 0:
    //     # Lines are parallel
    //     return None
    if (Math.abs(determinant) <= 0.01)
        return null;
    const dx = p0.x - q0.x;
    const dy = p0.y - q0.y;
    const t = (q_dx * dy - q_dy * dx) / determinant;
    const s = (p_dx * dy - p_dy * dx) / determinant;
    if (0 <= s && s <= 1 && 0 <= t && t <= 1)
        // Collision detected
        return new Point(p0.x + (t * p_dx), p0.y + (t * p_dy));
    return null;
}
export function quadrant_origin(p) {
    if (p.x >= 0 && p.y >= 0)
        return 0;
    else if (p.x <= 0 && p.y >= 0)
        return 1;
    else if (p.x <= 0 && p.y <= 0)
        return 2;
    return 3;
}
/**
 * Gives a 2D rotation-matrix M which rotates the vector p->q to the x-axis, in the form
 * [a, b, c, d], where
 * M =  [a, b]
 *      [c, d]
 */
export function rotation_matrix_xaxis(p, q) {
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    return [dx, dy, -dy, dx];
}
/**
 * Rotates a vector p->q with matrix m
 * */
export function rotate(p, q, m) {
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const x = dx * m[0] + dy * m[1];
    const y = dx * m[2] + dy * m[3];
    return new Point(x, y);
}
/**
 * Finds the closest intersection of the ray p->q with the edges
 * */
export function find_closest_intersection(p, q, edges) {
    var closetst_vertex = q;
    var closest_edge = null;
    for (const edge of edges) {
        // Skip self intersection
        if (p == edge.origin || p == edge.destination())
            continue;
        const intersection = get_line_intersection(p, closetst_vertex, edge.origin, edge.destination());
        if (intersection != null) {
            closetst_vertex = intersection;
            closest_edge = edge;
        }
    }
    return [new Vertex(closetst_vertex.x, closetst_vertex.y), closest_edge];
}
//# sourceMappingURL=utils.js.map