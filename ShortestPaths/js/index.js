import { PolygonDrawer } from "../../_Common/drawer.js";
import { load_polygon } from "../../_Common/loader.js";
import { Triangulator } from "./triangulation.js";
let canvas;
let ctx;
let polygon_drawer;
window.onresize = update_resolution;
function update_resolution() {
    // Handles changes in resolution of browser
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    polygon_drawer.draw_polygons();
}
window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    ctx = canvas.getContext("2d");
    polygon_drawer = new PolygonDrawer([], canvas, ctx);
    update_resolution();
    load_polygon("fpg-poly_0000000020_h1.instance.json", false).then(function (polygon) {
        polygon_drawer.set_polygons([polygon]);
        polygon_drawer.draw_polygons();
        polygon.test_vertex_halfedge();
        new Triangulator().triangulate(polygon);
        const polygons = polygon.polygons_from_cycles();
        polygon_drawer.set_polygons(polygons);
        polygon_drawer.draw_polygons();
    });
};
//# sourceMappingURL=index.js.map