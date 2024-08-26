import { PolygonDrawer } from "../../AB_Common/drawer.js";
import { load_polygon } from "../../AB_Common/loader.js";
import { Point, Polygon } from "../../AB_Common/polygon.js";
import { find_closest_intersection } from "../../AB_Common/utils.js";
import {BisectPartition, Partitioner, SimplePartition} from "./partitioning.js";

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let polygon_drawer: PolygonDrawer;
const partitioner: Partitioner = new BisectPartition();

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

    load_polygon("test_polygon_01.instance.json").then(
        function(polygon) {
            polygon_drawer.set_polygons([polygon]);
            polygon_drawer.draw_polygons();

            const polygons = partitioner.partition(polygon);
            //const polygons = [polygon];
            polygon_drawer.set_polygons(polygons);
            polygon_drawer.draw_polygons();
        }
    );
}