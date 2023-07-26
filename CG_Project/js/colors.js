"use strict";

const COLORMAP = [[26/256, 42/256, 108/256], [178/256, 31/256, 31/256], [253/256 , 187/256, 45/256]]
//const COLORMAP = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]

// Returns a color based on the colormap, for 0 <= x <= 1
function get_color(x){
    x = Math.min(Math.max(x, 0),1) // Clamp to 0<=x<=1

    const n_colors = COLORMAP.length - 1;

    // Blend between two closest colors in the colormap
    const color = vec4(0,0,0,1);
    const min_index = Math.floor(x * n_colors);
    const min_color = COLORMAP[min_index];

    const max_index = Math.ceil(x * n_colors)
    const max_color = COLORMAP[max_index];

    for (var i = 0; i < 3; i++){
        const t = 1 - (x * n_colors - min_index); 

        color[i] = min_color[i] * t + max_color[i] * (1-t);
    }

    return color;
}
  