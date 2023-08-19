import { PolygonDrawer } from "./drawer.js";
import { load_polygon } from "./loader.js";
import { Point, Polygon } from "./polygon.js";
import { find_closest_intersection } from "./utils.js";

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let polygon_drawer: PolygonDrawer;

window.onresize = update_resolution;
function update_resolution(){
    // Handles changes in resolution of browser
    const width = window.innerWidth;
    const height = window.innerHeight
    
    canvas.width = width;
    canvas.height = height;
    polygon_drawer.draw_polygons();
}

window.onload = function init(){
    canvas = document.getElementById("gl-canvas") as HTMLCanvasElement;
    ctx = canvas.getContext("2d");
    polygon_drawer = new PolygonDrawer([], canvas, ctx);
    update_resolution();

    load_polygon("ccheese142.instance.json").then(
        function(polygon) {
            simple_partition(polygon);
            const polygons = polygon.polygons_from_cycles();
            //const polygons = [polygon];
            polygon_drawer.set_polygons(polygons);
            polygon_drawer.draw_polygons();
        }
    );
}

/**
 * Connects each hole to the outer boundary by extending a vertical line from the extrema until the outer boundary (or another hole) is hit.
 */
function simple_partition(polygon: Polygon){
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
}