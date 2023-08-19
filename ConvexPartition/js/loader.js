var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
//import * as polygon_data from '../instances/ccheese142.instance.json';
import { Polygon, Vertex } from './polygon.js';
export const http = (request) => {
    return new Promise(resolve => {
        fetch(request)
            .then(response => response.json())
            .then(body => {
            resolve(body);
        });
    });
};
// Fetch the game-data JSON and use an interface to type it
function fetct_polygon_data(polygon_name) {
    return __awaiter(this, void 0, void 0, function* () {
        return http('/ConvexPartition/instances/' + polygon_name);
    });
}
function parse_vertex_list(input) {
    const output = [];
    for (var i = 0; i < input.length; i++) {
        output.push(new Vertex(input[i].x, input[i].y));
    }
    return output;
}
export function load_polygon(polygon_name) {
    return __awaiter(this, void 0, void 0, function* () {
        const polygon_data = yield fetct_polygon_data(polygon_name);
        const outer_boundary = parse_vertex_list(polygon_data.outer_boundary);
        // Go over each hole and add it
        const holes = [];
        for (var i = 0; i < polygon_data.holes.length; i++) {
            holes.push(parse_vertex_list(polygon_data.holes[i]));
        }
        return new Polygon(outer_boundary, holes);
    });
}
//# sourceMappingURL=loader.js.map