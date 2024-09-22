//import * as polygon_data from '../instances/ccheese142.instance.json';
import { Polygon, Vertex, Point } from './polygon.js';


// https://www.reddit.com/r/typescript/comments/cpew6m/how_to_import_json_and_still_maintain_browser/
interface PolygonData {
    type: string;
    name: string;
    n: number;
    outer_boundary: Point[];
    holes: Point[][];
}

export const http = <T>(request: RequestInfo): Promise<T> => {
    return new Promise(resolve => {
      fetch(request)
        .then(response => response.json())
        .then(body => {
          resolve(body);
        });
    });
};
  
  // Fetch the game-data JSON and use an interface to type it
  async function fetct_polygon_data(polygon_name: string) {
    return http<PolygonData>('/AB_Common/instances/' + polygon_name);
  }
  


function parse_vertex_list(input: {x:number, y:number}[]){
    const output: Vertex[] = [];
    for (var i = 0; i < input.length; i++){
        output.push(new Vertex(input[i].x, input[i].y));
    }
    return output;
}

export async function load_polygon(polygon_name: string, ignore_holes = false): Promise<Polygon>{
    const polygon_data = await fetct_polygon_data(polygon_name);
    
    const outer_boundary = parse_vertex_list(polygon_data.outer_boundary);
    if (ignore_holes)
      return new Polygon(outer_boundary, []);

    // Go over each hole and add it
    const holes = [];
    for (var i = 0; i < polygon_data.holes.length; i++){
        holes.push(parse_vertex_list(polygon_data.holes[i]));
    }

    return new Polygon(outer_boundary, holes);
}


