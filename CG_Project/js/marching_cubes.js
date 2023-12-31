// Taken from http://paulbourke.net/geometry/polygonise/
// Translated into JS and optimized by Olav (s184195)

 /*
	Given a grid cell and an isolevel, calculate the triangular
	facets required to represent the isosurface through the cell.
	Return the number of triangular facets, the array "triangles"
	will be loaded up with the vertices at most 5 triangular facets.
	 0 will be returned if the grid cell is either totally above
	of totally below the isolevel.
 */

const EPSILON = 0.000001
const edge_table =[
   0x0  , 0x109, 0x203, 0x30a, 0x406, 0x50f, 0x605, 0x70c,
   0x80c, 0x905, 0xa0f, 0xb06, 0xc0a, 0xd03, 0xe09, 0xf00,
   0x190, 0x99 , 0x393, 0x29a, 0x596, 0x49f, 0x795, 0x69c,
   0x99c, 0x895, 0xb9f, 0xa96, 0xd9a, 0xc93, 0xf99, 0xe90,
   0x230, 0x339, 0x33 , 0x13a, 0x636, 0x73f, 0x435, 0x53c,
   0xa3c, 0xb35, 0x83f, 0x936, 0xe3a, 0xf33, 0xc39, 0xd30,
   0x3a0, 0x2a9, 0x1a3, 0xaa , 0x7a6, 0x6af, 0x5a5, 0x4ac,
   0xbac, 0xaa5, 0x9af, 0x8a6, 0xfaa, 0xea3, 0xda9, 0xca0,
   0x460, 0x569, 0x663, 0x76a, 0x66 , 0x16f, 0x265, 0x36c,
   0xc6c, 0xd65, 0xe6f, 0xf66, 0x86a, 0x963, 0xa69, 0xb60,
   0x5f0, 0x4f9, 0x7f3, 0x6fa, 0x1f6, 0xff , 0x3f5, 0x2fc,
   0xdfc, 0xcf5, 0xfff, 0xef6, 0x9fa, 0x8f3, 0xbf9, 0xaf0,
   0x650, 0x759, 0x453, 0x55a, 0x256, 0x35f, 0x55 , 0x15c,
   0xe5c, 0xf55, 0xc5f, 0xd56, 0xa5a, 0xb53, 0x859, 0x950,
   0x7c0, 0x6c9, 0x5c3, 0x4ca, 0x3c6, 0x2cf, 0x1c5, 0xcc ,
   0xfcc, 0xec5, 0xdcf, 0xcc6, 0xbca, 0xac3, 0x9c9, 0x8c0,
   0x8c0, 0x9c9, 0xac3, 0xbca, 0xcc6, 0xdcf, 0xec5, 0xfcc,
   0xcc , 0x1c5, 0x2cf, 0x3c6, 0x4ca, 0x5c3, 0x6c9, 0x7c0,
   0x950, 0x859, 0xb53, 0xa5a, 0xd56, 0xc5f, 0xf55, 0xe5c,
   0x15c, 0x55 , 0x35f, 0x256, 0x55a, 0x453, 0x759, 0x650,
   0xaf0, 0xbf9, 0x8f3, 0x9fa, 0xef6, 0xfff, 0xcf5, 0xdfc,
   0x2fc, 0x3f5, 0xff , 0x1f6, 0x6fa, 0x7f3, 0x4f9, 0x5f0,
   0xb60, 0xa69, 0x963, 0x86a, 0xf66, 0xe6f, 0xd65, 0xc6c,
   0x36c, 0x265, 0x16f, 0x66 , 0x76a, 0x663, 0x569, 0x460,
   0xca0, 0xda9, 0xea3, 0xfaa, 0x8a6, 0x9af, 0xaa5, 0xbac,
   0x4ac, 0x5a5, 0x6af, 0x7a6, 0xaa , 0x1a3, 0x2a9, 0x3a0,
   0xd30, 0xc39, 0xf33, 0xe3a, 0x936, 0x83f, 0xb35, 0xa3c,
   0x53c, 0x435, 0x73f, 0x636, 0x13a, 0x33 , 0x339, 0x230,
   0xe90, 0xf99, 0xc93, 0xd9a, 0xa96, 0xb9f, 0x895, 0x99c,
   0x69c, 0x795, 0x49f, 0x596, 0x29a, 0x393, 0x99 , 0x190,
   0xf00, 0xe09, 0xd03, 0xc0a, 0xb06, 0xa0f, 0x905, 0x80c,
   0x70c, 0x605, 0x50f, 0x406, 0x30a, 0x203, 0x109, 0x0];

const tri_table  = [
   [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [0, 8, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [0, 1, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [1, 8, 3, 9, 8, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [1, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [0, 8, 3, 1, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [9, 2, 10, 0, 2, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [2, 8, 3, 2, 10, 8, 10, 9, 8, -1, -1, -1, -1, -1, -1, -1],
   [3, 11, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [0, 11, 2, 8, 11, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [1, 9, 0, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [1, 11, 2, 1, 9, 11, 9, 8, 11, -1, -1, -1, -1, -1, -1, -1],
   [3, 10, 1, 11, 10, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [0, 10, 1, 0, 8, 10, 8, 11, 10, -1, -1, -1, -1, -1, -1, -1],
   [3, 9, 0, 3, 11, 9, 11, 10, 9, -1, -1, -1, -1, -1, -1, -1],
   [9, 8, 10, 10, 8, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [4, 7, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [4, 3, 0, 7, 3, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [0, 1, 9, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [4, 1, 9, 4, 7, 1, 7, 3, 1, -1, -1, -1, -1, -1, -1, -1],
   [1, 2, 10, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [3, 4, 7, 3, 0, 4, 1, 2, 10, -1, -1, -1, -1, -1, -1, -1],
   [9, 2, 10, 9, 0, 2, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1],
   [2, 10, 9, 2, 9, 7, 2, 7, 3, 7, 9, 4, -1, -1, -1, -1],
   [8, 4, 7, 3, 11, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [11, 4, 7, 11, 2, 4, 2, 0, 4, -1, -1, -1, -1, -1, -1, -1],
   [9, 0, 1, 8, 4, 7, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1],
   [4, 7, 11, 9, 4, 11, 9, 11, 2, 9, 2, 1, -1, -1, -1, -1],
   [3, 10, 1, 3, 11, 10, 7, 8, 4, -1, -1, -1, -1, -1, -1, -1],
   [1, 11, 10, 1, 4, 11, 1, 0, 4, 7, 11, 4, -1, -1, -1, -1],
   [4, 7, 8, 9, 0, 11, 9, 11, 10, 11, 0, 3, -1, -1, -1, -1],
   [4, 7, 11, 4, 11, 9, 9, 11, 10, -1, -1, -1, -1, -1, -1, -1],
   [9, 5, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [9, 5, 4, 0, 8, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [0, 5, 4, 1, 5, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [8, 5, 4, 8, 3, 5, 3, 1, 5, -1, -1, -1, -1, -1, -1, -1],
   [1, 2, 10, 9, 5, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [3, 0, 8, 1, 2, 10, 4, 9, 5, -1, -1, -1, -1, -1, -1, -1],
   [5, 2, 10, 5, 4, 2, 4, 0, 2, -1, -1, -1, -1, -1, -1, -1],
   [2, 10, 5, 3, 2, 5, 3, 5, 4, 3, 4, 8, -1, -1, -1, -1],
   [9, 5, 4, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [0, 11, 2, 0, 8, 11, 4, 9, 5, -1, -1, -1, -1, -1, -1, -1],
   [0, 5, 4, 0, 1, 5, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1],
   [2, 1, 5, 2, 5, 8, 2, 8, 11, 4, 8, 5, -1, -1, -1, -1],
   [10, 3, 11, 10, 1, 3, 9, 5, 4, -1, -1, -1, -1, -1, -1, -1],
   [4, 9, 5, 0, 8, 1, 8, 10, 1, 8, 11, 10, -1, -1, -1, -1],
   [5, 4, 0, 5, 0, 11, 5, 11, 10, 11, 0, 3, -1, -1, -1, -1],
   [5, 4, 8, 5, 8, 10, 10, 8, 11, -1, -1, -1, -1, -1, -1, -1],
   [9, 7, 8, 5, 7, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [9, 3, 0, 9, 5, 3, 5, 7, 3, -1, -1, -1, -1, -1, -1, -1],
   [0, 7, 8, 0, 1, 7, 1, 5, 7, -1, -1, -1, -1, -1, -1, -1],
   [1, 5, 3, 3, 5, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [9, 7, 8, 9, 5, 7, 10, 1, 2, -1, -1, -1, -1, -1, -1, -1],
   [10, 1, 2, 9, 5, 0, 5, 3, 0, 5, 7, 3, -1, -1, -1, -1],
   [8, 0, 2, 8, 2, 5, 8, 5, 7, 10, 5, 2, -1, -1, -1, -1],
   [2, 10, 5, 2, 5, 3, 3, 5, 7, -1, -1, -1, -1, -1, -1, -1],
   [7, 9, 5, 7, 8, 9, 3, 11, 2, -1, -1, -1, -1, -1, -1, -1],
   [9, 5, 7, 9, 7, 2, 9, 2, 0, 2, 7, 11, -1, -1, -1, -1],
   [2, 3, 11, 0, 1, 8, 1, 7, 8, 1, 5, 7, -1, -1, -1, -1],
   [11, 2, 1, 11, 1, 7, 7, 1, 5, -1, -1, -1, -1, -1, -1, -1],
   [9, 5, 8, 8, 5, 7, 10, 1, 3, 10, 3, 11, -1, -1, -1, -1],
   [5, 7, 0, 5, 0, 9, 7, 11, 0, 1, 0, 10, 11, 10, 0, -1],
   [11, 10, 0, 11, 0, 3, 10, 5, 0, 8, 0, 7, 5, 7, 0, -1],
   [11, 10, 5, 7, 11, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [10, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [0, 8, 3, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [9, 0, 1, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [1, 8, 3, 1, 9, 8, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1],
   [1, 6, 5, 2, 6, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [1, 6, 5, 1, 2, 6, 3, 0, 8, -1, -1, -1, -1, -1, -1, -1],
   [9, 6, 5, 9, 0, 6, 0, 2, 6, -1, -1, -1, -1, -1, -1, -1],
   [5, 9, 8, 5, 8, 2, 5, 2, 6, 3, 2, 8, -1, -1, -1, -1],
   [2, 3, 11, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [11, 0, 8, 11, 2, 0, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1],
   [0, 1, 9, 2, 3, 11, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1],
   [5, 10, 6, 1, 9, 2, 9, 11, 2, 9, 8, 11, -1, -1, -1, -1],
   [6, 3, 11, 6, 5, 3, 5, 1, 3, -1, -1, -1, -1, -1, -1, -1],
   [0, 8, 11, 0, 11, 5, 0, 5, 1, 5, 11, 6, -1, -1, -1, -1],
   [3, 11, 6, 0, 3, 6, 0, 6, 5, 0, 5, 9, -1, -1, -1, -1],
   [6, 5, 9, 6, 9, 11, 11, 9, 8, -1, -1, -1, -1, -1, -1, -1],
   [5, 10, 6, 4, 7, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [4, 3, 0, 4, 7, 3, 6, 5, 10, -1, -1, -1, -1, -1, -1, -1],
   [1, 9, 0, 5, 10, 6, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1],
   [10, 6, 5, 1, 9, 7, 1, 7, 3, 7, 9, 4, -1, -1, -1, -1],
   [6, 1, 2, 6, 5, 1, 4, 7, 8, -1, -1, -1, -1, -1, -1, -1],
   [1, 2, 5, 5, 2, 6, 3, 0, 4, 3, 4, 7, -1, -1, -1, -1],
   [8, 4, 7, 9, 0, 5, 0, 6, 5, 0, 2, 6, -1, -1, -1, -1],
   [7, 3, 9, 7, 9, 4, 3, 2, 9, 5, 9, 6, 2, 6, 9, -1],
   [3, 11, 2, 7, 8, 4, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1],
   [5, 10, 6, 4, 7, 2, 4, 2, 0, 2, 7, 11, -1, -1, -1, -1],
   [0, 1, 9, 4, 7, 8, 2, 3, 11, 5, 10, 6, -1, -1, -1, -1],
   [9, 2, 1, 9, 11, 2, 9, 4, 11, 7, 11, 4, 5, 10, 6, -1],
   [8, 4, 7, 3, 11, 5, 3, 5, 1, 5, 11, 6, -1, -1, -1, -1],
   [5, 1, 11, 5, 11, 6, 1, 0, 11, 7, 11, 4, 0, 4, 11, -1],
   [0, 5, 9, 0, 6, 5, 0, 3, 6, 11, 6, 3, 8, 4, 7, -1],
   [6, 5, 9, 6, 9, 11, 4, 7, 9, 7, 11, 9, -1, -1, -1, -1],
   [10, 4, 9, 6, 4, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [4, 10, 6, 4, 9, 10, 0, 8, 3, -1, -1, -1, -1, -1, -1, -1],
   [10, 0, 1, 10, 6, 0, 6, 4, 0, -1, -1, -1, -1, -1, -1, -1],
   [8, 3, 1, 8, 1, 6, 8, 6, 4, 6, 1, 10, -1, -1, -1, -1],
   [1, 4, 9, 1, 2, 4, 2, 6, 4, -1, -1, -1, -1, -1, -1, -1],
   [3, 0, 8, 1, 2, 9, 2, 4, 9, 2, 6, 4, -1, -1, -1, -1],
   [0, 2, 4, 4, 2, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [8, 3, 2, 8, 2, 4, 4, 2, 6, -1, -1, -1, -1, -1, -1, -1],
   [10, 4, 9, 10, 6, 4, 11, 2, 3, -1, -1, -1, -1, -1, -1, -1],
   [0, 8, 2, 2, 8, 11, 4, 9, 10, 4, 10, 6, -1, -1, -1, -1],
   [3, 11, 2, 0, 1, 6, 0, 6, 4, 6, 1, 10, -1, -1, -1, -1],
   [6, 4, 1, 6, 1, 10, 4, 8, 1, 2, 1, 11, 8, 11, 1, -1],
   [9, 6, 4, 9, 3, 6, 9, 1, 3, 11, 6, 3, -1, -1, -1, -1],
   [8, 11, 1, 8, 1, 0, 11, 6, 1, 9, 1, 4, 6, 4, 1, -1],
   [3, 11, 6, 3, 6, 0, 0, 6, 4, -1, -1, -1, -1, -1, -1, -1],
   [6, 4, 8, 11, 6, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [7, 10, 6, 7, 8, 10, 8, 9, 10, -1, -1, -1, -1, -1, -1, -1],
   [0, 7, 3, 0, 10, 7, 0, 9, 10, 6, 7, 10, -1, -1, -1, -1],
   [10, 6, 7, 1, 10, 7, 1, 7, 8, 1, 8, 0, -1, -1, -1, -1],
   [10, 6, 7, 10, 7, 1, 1, 7, 3, -1, -1, -1, -1, -1, -1, -1],
   [1, 2, 6, 1, 6, 8, 1, 8, 9, 8, 6, 7, -1, -1, -1, -1],
   [2, 6, 9, 2, 9, 1, 6, 7, 9, 0, 9, 3, 7, 3, 9, -1],
   [7, 8, 0, 7, 0, 6, 6, 0, 2, -1, -1, -1, -1, -1, -1, -1],
   [7, 3, 2, 6, 7, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [2, 3, 11, 10, 6, 8, 10, 8, 9, 8, 6, 7, -1, -1, -1, -1],
   [2, 0, 7, 2, 7, 11, 0, 9, 7, 6, 7, 10, 9, 10, 7, -1],
   [1, 8, 0, 1, 7, 8, 1, 10, 7, 6, 7, 10, 2, 3, 11, -1],
   [11, 2, 1, 11, 1, 7, 10, 6, 1, 6, 7, 1, -1, -1, -1, -1],
   [8, 9, 6, 8, 6, 7, 9, 1, 6, 11, 6, 3, 1, 3, 6, -1],
   [0, 9, 1, 11, 6, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [7, 8, 0, 7, 0, 6, 3, 11, 0, 11, 6, 0, -1, -1, -1, -1],
   [7, 11, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [7, 6, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [3, 0, 8, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [0, 1, 9, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [8, 1, 9, 8, 3, 1, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1],
   [10, 1, 2, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [1, 2, 10, 3, 0, 8, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1],
   [2, 9, 0, 2, 10, 9, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1],
   [6, 11, 7, 2, 10, 3, 10, 8, 3, 10, 9, 8, -1, -1, -1, -1],
   [7, 2, 3, 6, 2, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [7, 0, 8, 7, 6, 0, 6, 2, 0, -1, -1, -1, -1, -1, -1, -1],
   [2, 7, 6, 2, 3, 7, 0, 1, 9, -1, -1, -1, -1, -1, -1, -1],
   [1, 6, 2, 1, 8, 6, 1, 9, 8, 8, 7, 6, -1, -1, -1, -1],
   [10, 7, 6, 10, 1, 7, 1, 3, 7, -1, -1, -1, -1, -1, -1, -1],
   [10, 7, 6, 1, 7, 10, 1, 8, 7, 1, 0, 8, -1, -1, -1, -1],
   [0, 3, 7, 0, 7, 10, 0, 10, 9, 6, 10, 7, -1, -1, -1, -1],
   [7, 6, 10, 7, 10, 8, 8, 10, 9, -1, -1, -1, -1, -1, -1, -1],
   [6, 8, 4, 11, 8, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [3, 6, 11, 3, 0, 6, 0, 4, 6, -1, -1, -1, -1, -1, -1, -1],
   [8, 6, 11, 8, 4, 6, 9, 0, 1, -1, -1, -1, -1, -1, -1, -1],
   [9, 4, 6, 9, 6, 3, 9, 3, 1, 11, 3, 6, -1, -1, -1, -1],
   [6, 8, 4, 6, 11, 8, 2, 10, 1, -1, -1, -1, -1, -1, -1, -1],
   [1, 2, 10, 3, 0, 11, 0, 6, 11, 0, 4, 6, -1, -1, -1, -1],
   [4, 11, 8, 4, 6, 11, 0, 2, 9, 2, 10, 9, -1, -1, -1, -1],
   [10, 9, 3, 10, 3, 2, 9, 4, 3, 11, 3, 6, 4, 6, 3, -1],
   [8, 2, 3, 8, 4, 2, 4, 6, 2, -1, -1, -1, -1, -1, -1, -1],
   [0, 4, 2, 4, 6, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [1, 9, 0, 2, 3, 4, 2, 4, 6, 4, 3, 8, -1, -1, -1, -1],
   [1, 9, 4, 1, 4, 2, 2, 4, 6, -1, -1, -1, -1, -1, -1, -1],
   [8, 1, 3, 8, 6, 1, 8, 4, 6, 6, 10, 1, -1, -1, -1, -1],
   [10, 1, 0, 10, 0, 6, 6, 0, 4, -1, -1, -1, -1, -1, -1, -1],
   [4, 6, 3, 4, 3, 8, 6, 10, 3, 0, 3, 9, 10, 9, 3, -1],
   [10, 9, 4, 6, 10, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [4, 9, 5, 7, 6, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [0, 8, 3, 4, 9, 5, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1],
   [5, 0, 1, 5, 4, 0, 7, 6, 11, -1, -1, -1, -1, -1, -1, -1],
   [11, 7, 6, 8, 3, 4, 3, 5, 4, 3, 1, 5, -1, -1, -1, -1],
   [9, 5, 4, 10, 1, 2, 7, 6, 11, -1, -1, -1, -1, -1, -1, -1],
   [6, 11, 7, 1, 2, 10, 0, 8, 3, 4, 9, 5, -1, -1, -1, -1],
   [7, 6, 11, 5, 4, 10, 4, 2, 10, 4, 0, 2, -1, -1, -1, -1],
   [3, 4, 8, 3, 5, 4, 3, 2, 5, 10, 5, 2, 11, 7, 6, -1],
   [7, 2, 3, 7, 6, 2, 5, 4, 9, -1, -1, -1, -1, -1, -1, -1],
   [9, 5, 4, 0, 8, 6, 0, 6, 2, 6, 8, 7, -1, -1, -1, -1],
   [3, 6, 2, 3, 7, 6, 1, 5, 0, 5, 4, 0, -1, -1, -1, -1],
   [6, 2, 8, 6, 8, 7, 2, 1, 8, 4, 8, 5, 1, 5, 8, -1],
   [9, 5, 4, 10, 1, 6, 1, 7, 6, 1, 3, 7, -1, -1, -1, -1],
   [1, 6, 10, 1, 7, 6, 1, 0, 7, 8, 7, 0, 9, 5, 4, -1],
   [4, 0, 10, 4, 10, 5, 0, 3, 10, 6, 10, 7, 3, 7, 10, -1],
   [7, 6, 10, 7, 10, 8, 5, 4, 10, 4, 8, 10, -1, -1, -1, -1],
   [6, 9, 5, 6, 11, 9, 11, 8, 9, -1, -1, -1, -1, -1, -1, -1],
   [3, 6, 11, 0, 6, 3, 0, 5, 6, 0, 9, 5, -1, -1, -1, -1],
   [0, 11, 8, 0, 5, 11, 0, 1, 5, 5, 6, 11, -1, -1, -1, -1],
   [6, 11, 3, 6, 3, 5, 5, 3, 1, -1, -1, -1, -1, -1, -1, -1],
   [1, 2, 10, 9, 5, 11, 9, 11, 8, 11, 5, 6, -1, -1, -1, -1],
   [0, 11, 3, 0, 6, 11, 0, 9, 6, 5, 6, 9, 1, 2, 10, -1],
   [11, 8, 5, 11, 5, 6, 8, 0, 5, 10, 5, 2, 0, 2, 5, -1],
   [6, 11, 3, 6, 3, 5, 2, 10, 3, 10, 5, 3, -1, -1, -1, -1],
   [5, 8, 9, 5, 2, 8, 5, 6, 2, 3, 8, 2, -1, -1, -1, -1],
   [9, 5, 6, 9, 6, 0, 0, 6, 2, -1, -1, -1, -1, -1, -1, -1],
   [1, 5, 8, 1, 8, 0, 5, 6, 8, 3, 8, 2, 6, 2, 8, -1],
   [1, 5, 6, 2, 1, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [1, 3, 6, 1, 6, 10, 3, 8, 6, 5, 6, 9, 8, 9, 6, -1],
   [10, 1, 0, 10, 0, 6, 9, 5, 0, 5, 6, 0, -1, -1, -1, -1],
   [0, 3, 8, 5, 6, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [10, 5, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [11, 5, 10, 7, 5, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [11, 5, 10, 11, 7, 5, 8, 3, 0, -1, -1, -1, -1, -1, -1, -1],
   [5, 11, 7, 5, 10, 11, 1, 9, 0, -1, -1, -1, -1, -1, -1, -1],
   [10, 7, 5, 10, 11, 7, 9, 8, 1, 8, 3, 1, -1, -1, -1, -1],
   [11, 1, 2, 11, 7, 1, 7, 5, 1, -1, -1, -1, -1, -1, -1, -1],
   [0, 8, 3, 1, 2, 7, 1, 7, 5, 7, 2, 11, -1, -1, -1, -1],
   [9, 7, 5, 9, 2, 7, 9, 0, 2, 2, 11, 7, -1, -1, -1, -1],
   [7, 5, 2, 7, 2, 11, 5, 9, 2, 3, 2, 8, 9, 8, 2, -1],
   [2, 5, 10, 2, 3, 5, 3, 7, 5, -1, -1, -1, -1, -1, -1, -1],
   [8, 2, 0, 8, 5, 2, 8, 7, 5, 10, 2, 5, -1, -1, -1, -1],
   [9, 0, 1, 5, 10, 3, 5, 3, 7, 3, 10, 2, -1, -1, -1, -1],
   [9, 8, 2, 9, 2, 1, 8, 7, 2, 10, 2, 5, 7, 5, 2, -1],
   [1, 3, 5, 3, 7, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [0, 8, 7, 0, 7, 1, 1, 7, 5, -1, -1, -1, -1, -1, -1, -1],
   [9, 0, 3, 9, 3, 5, 5, 3, 7, -1, -1, -1, -1, -1, -1, -1],
   [9, 8, 7, 5, 9, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [5, 8, 4, 5, 10, 8, 10, 11, 8, -1, -1, -1, -1, -1, -1, -1],
   [5, 0, 4, 5, 11, 0, 5, 10, 11, 11, 3, 0, -1, -1, -1, -1],
   [0, 1, 9, 8, 4, 10, 8, 10, 11, 10, 4, 5, -1, -1, -1, -1],
   [10, 11, 4, 10, 4, 5, 11, 3, 4, 9, 4, 1, 3, 1, 4, -1],
   [2, 5, 1, 2, 8, 5, 2, 11, 8, 4, 5, 8, -1, -1, -1, -1],
   [0, 4, 11, 0, 11, 3, 4, 5, 11, 2, 11, 1, 5, 1, 11, -1],
   [0, 2, 5, 0, 5, 9, 2, 11, 5, 4, 5, 8, 11, 8, 5, -1],
   [9, 4, 5, 2, 11, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [2, 5, 10, 3, 5, 2, 3, 4, 5, 3, 8, 4, -1, -1, -1, -1],
   [5, 10, 2, 5, 2, 4, 4, 2, 0, -1, -1, -1, -1, -1, -1, -1],
   [3, 10, 2, 3, 5, 10, 3, 8, 5, 4, 5, 8, 0, 1, 9, -1],
   [5, 10, 2, 5, 2, 4, 1, 9, 2, 9, 4, 2, -1, -1, -1, -1],
   [8, 4, 5, 8, 5, 3, 3, 5, 1, -1, -1, -1, -1, -1, -1, -1],
   [0, 4, 5, 1, 0, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [8, 4, 5, 8, 5, 3, 9, 0, 5, 0, 3, 5, -1, -1, -1, -1],
   [9, 4, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [4, 11, 7, 4, 9, 11, 9, 10, 11, -1, -1, -1, -1, -1, -1, -1],
   [0, 8, 3, 4, 9, 7, 9, 11, 7, 9, 10, 11, -1, -1, -1, -1],
   [1, 10, 11, 1, 11, 4, 1, 4, 0, 7, 4, 11, -1, -1, -1, -1],
   [3, 1, 4, 3, 4, 8, 1, 10, 4, 7, 4, 11, 10, 11, 4, -1],
   [4, 11, 7, 9, 11, 4, 9, 2, 11, 9, 1, 2, -1, -1, -1, -1],
   [9, 7, 4, 9, 11, 7, 9, 1, 11, 2, 11, 1, 0, 8, 3, -1],
   [11, 7, 4, 11, 4, 2, 2, 4, 0, -1, -1, -1, -1, -1, -1, -1],
   [11, 7, 4, 11, 4, 2, 8, 3, 4, 3, 2, 4, -1, -1, -1, -1],
   [2, 9, 10, 2, 7, 9, 2, 3, 7, 7, 4, 9, -1, -1, -1, -1],
   [9, 10, 7, 9, 7, 4, 10, 2, 7, 8, 7, 0, 2, 0, 7, -1],
   [3, 7, 10, 3, 10, 2, 7, 4, 10, 1, 10, 0, 4, 0, 10, -1],
   [1, 10, 2, 8, 7, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [4, 9, 1, 4, 1, 7, 7, 1, 3, -1, -1, -1, -1, -1, -1, -1],
   [4, 9, 1, 4, 1, 7, 0, 8, 1, 8, 7, 1, -1, -1, -1, -1],
   [4, 0, 3, 7, 4, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [4, 8, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [9, 10, 8, 10, 11, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [3, 0, 9, 3, 9, 11, 11, 9, 10, -1, -1, -1, -1, -1, -1, -1],
   [0, 1, 10, 0, 10, 8, 8, 10, 11, -1, -1, -1, -1, -1, -1, -1],
   [3, 1, 10, 11, 3, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [1, 2, 11, 1, 11, 9, 9, 11, 8, -1, -1, -1, -1, -1, -1, -1],
   [3, 0, 9, 3, 9, 11, 1, 2, 9, 2, 11, 9, -1, -1, -1, -1],
   [0, 2, 11, 8, 0, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [3, 2, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [2, 3, 8, 2, 8, 10, 10, 8, 9, -1, -1, -1, -1, -1, -1, -1],
   [9, 10, 2, 0, 9, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [2, 3, 8, 2, 8, 10, 0, 1, 8, 1, 10, 8, -1, -1, -1, -1],
   [1, 10, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [1, 3, 8, 9, 1, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [0, 9, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [0, 3, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
   [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]];
 
const endpoint_table = [
    [0,1],
    [1,2],
    [2,3],
    [0,3],
    [4,5],
    [5,6],
    [6,7],
    [4,7],
    [0,4],
    [1,5],
    [2,6],
    [3,7]
];

const PREV_CUBE_MASK = 2440;
const PREV_ROW_MASK = 15;
const PREV_PLANE_MASK = 785;
const PREV_CUBE_TRANSLATION =   [-1, -1, -1, 1, -1, -1, -1, 5, 9, -1, -1, 10];
const PREV_ROW_TRANSLATION =    [4, 5, 6, 7, -1, -1, -1, -1, -1, -1, -1, -1];
const PREV_PLANE_TRANSLATION =  [2, -1, -1, -1, 6, -1, -1, -1, 11, 10, -1, -1];

// http://paulbourke.net/geometry/polygonise/polygonise1.gif
/*function Polygonise(points, levels, isolevel){
   var vertlist = [];
 
	// Determine the index into the edge table which
	// tells us which vertices are inside of the surface
   var cubeindex = 0;
   if (levels[0] < isolevel) cubeindex |= 1;
   if (levels[1] < isolevel) cubeindex |= 2;
   if (levels[2] < isolevel) cubeindex |= 4;
   if (levels[3] < isolevel) cubeindex |= 8;
   if (levels[4] < isolevel) cubeindex |= 16;
   if (levels[5] < isolevel) cubeindex |= 32;
   if (levels[6] < isolevel) cubeindex |= 64;
   if (levels[7] < isolevel) cubeindex |= 128;
 
   // Cube is entirely in/out of the surface
   if (edge_table[cubeindex] == 0)
	  return [];
 
   // Find the vertices where the surface intersects the cube
   if (edge_table[cubeindex] & 1)
	  vertlist[0] =
		 vertex_interp(isolevel,points[0],points[1],levels[0],levels[1]);
   if (edge_table[cubeindex] & 2)
	  vertlist[1] =
		 vertex_interp(isolevel,points[1],points[2],levels[1],levels[2]);
   if (edge_table[cubeindex] & 4)
	  vertlist[2] =
		 vertex_interp(isolevel,points[2],points[3],levels[2],levels[3]);
   if (edge_table[cubeindex] & 8)
	  vertlist[3] =
		 vertex_interp(isolevel,points[3],points[0],levels[3],levels[0]);
   if (edge_table[cubeindex] & 16)
	  vertlist[4] =
		 vertex_interp(isolevel,points[4],points[5],levels[4],levels[5]);
   if (edge_table[cubeindex] & 32)
	  vertlist[5] =
		 vertex_interp(isolevel,points[5],points[6],levels[5],levels[6]);
   if (edge_table[cubeindex] & 64)
	  vertlist[6] =
		 vertex_interp(isolevel,points[6],points[7],levels[6],levels[7]);
   if (edge_table[cubeindex] & 128)
	  vertlist[7] =
		 vertex_interp(isolevel,points[7],points[4],levels[7],levels[4]);
   if (edge_table[cubeindex] & 256)
	  vertlist[8] =
		 vertex_interp(isolevel,points[0],points[4],levels[0],levels[4]);
   if (edge_table[cubeindex] & 512)
	  vertlist[9] =
		 vertex_interp(isolevel,points[1],points[5],levels[1],levels[5]);
   if (edge_table[cubeindex] & 1024)
	  vertlist[10] =
		 vertex_interp(isolevel,points[2],points[6],levels[2],levels[6]);
   if (edge_table[cubeindex] & 2048)
	  vertlist[11] =
		 vertex_interp(isolevel,points[3],points[7],levels[3],levels[7]);
 
   // Create the triangle
   var vertices = [];
   for (var i=0; tri_table[cubeindex][i] !=-1; i+=3) {
	  var v_1 = vertlist[tri_table[cubeindex][i]];
	  var v_2 = vertlist[tri_table[cubeindex][i + 1]];
	  var v_3 = vertlist[tri_table[cubeindex][i + 2]];

	  vertices.push(v_1);
	  vertices.push(v_2);
	  vertices.push(v_3);
   }
 
   return vertices;
 }*/
 
 /* Returns the maximum number of vertices required for one cube */
function get_max_vertex_count(){
    var max_unique = 0;
    var max_vertices = 0;

	for (var i = 0; i < tri_table.length; i++){
        const triangulation = tri_table[i];
        max_unique = Math.max(max_unique, new Set(triangulation).size - 1);
        
        var current_vertex_count = 0;
        for (var j = 0; j < triangulation.length; j++)
            if (triangulation[j] != -1)
                current_vertex_count += 1;
        max_vertices = Math.max(current_vertex_count, max_vertices);
	}
	
	return [max_unique, max_vertices];
}
 /*
	Linearly interpolate the position where an isosurface cuts
	an edge between two vertices, each with their own scalar value
 */
function vertex_interp(isolevel, p1, p2, val_p1, val_p2){   
   var p = [p1[0], p1[1], p1[2], p1[3]];
   if (Math.abs(isolevel-val_p1) < EPSILON)
      return p;

   if (Math.abs(isolevel-val_p2) < EPSILON){
      p[0] = p2[0];
      p[1] = p2[1];
      p[2] = p2[2];
      p[3] = p2[3];
      return p;
   }
   if (Math.abs(val_p1-val_p2) < EPSILON)
      return p;
   const mu = (isolevel - val_p1) / (val_p2 - val_p1);
   
   p[0] = p1[0] + mu * (p2[0] - p1[0]);
   p[1] = p1[1] + mu * (p2[1] - p1[1]);
   p[2] = p1[2] + mu * (p2[2] - p1[2]);
   p[3] = 1.0;
   
   return p;
}

 /*
	Linearly interpolate the position where an isosurface (level 0) cuts
	an edge between two vertices, each with their own scalar value
 */
function vertex_interp_zero(p1, p2, val_p1, val_p2){   
    var p = [p1[0], p1[1], p1[2]];

    // Are we close to either end of the edge?
    if (Math.abs(val_p1) < EPSILON)
       return p;
    if (Math.abs(val_p2) < EPSILON){
       p[0] = p2[0];
       p[1] = p2[1];
       p[2] = p2[2];
       return p;
    }

    // TODO: Should vertex be between p1 and p2?
    const d_val = val_p2 - val_p1;
    if (Math.abs(val_p1-val_p2) < EPSILON)
       throw new Error("Marching cubes: Malformed vertex");

    // Interpolate 
    const mu = -val_p1 / d_val;
    p[0] = p1[0] + mu * (p2[0] - p1[0]);
    p[1] = p1[1] + mu * (p2[1] - p1[1]);
    p[2] = p1[2] + mu * (p2[2] - p1[2]);
    
    return(p);
 }

class MeshCache{
    constructor(){
        this.cube_idx = 0;
        this.vertex_indices = [];
    }
}

class ChunkMesher{
    constructor(chunk_size){
        this.chunk_size = chunk_size;
        this.chunk_half = chunk_size/2;
        this.chunk_offset = [-1, -1, -1];
        this.buffer_index = -1;
        this.vertices = null;
        this.indices = null;
        this.pos = null;

        this.unqiue_offset = 0;
        this.index_offset = 0;

        this.n_vertices = 0;
        this.n_unique = 0;

        // Prepare cache for meshes
        this.prev_cube = new MeshCache();
        this.prev_row = [];
        this.prev_plane = [];
        for (var i = 0; i < chunk_size; i++){
            this.prev_row.push(new MeshCache());
            const sub_row = [];
            this.prev_plane.push(sub_row)
            for (var j = 0; j < chunk_size; j++)
                sub_row.push(new MeshCache());
        }
    }

    vertex_push(v){
        const offset = 3 * (this.n_unique + this.unqiue_offset);
        this.vertices[offset]       = v[0];
        this.vertices[offset + 1]   = v[1];
        this.vertices[offset + 2]   = v[2];

        this.n_unique += 1;
    }

    index_push(i){
        const offset = this.n_vertices + this.index_offset;
        this.indices[offset] = i;
        this.n_vertices++
    }

    mesh_chunk(levels, pos, vertices, indices, buffer_index, unique_offset, index_offset){
        this.buffer_index = buffer_index;
        this.pos = pos;
        this.vertices = vertices;
        this.indices = indices;

        this.unqiue_offset = unique_offset;
        this.index_offset = index_offset;

        // Offset for entire chunk
        this.chunk_offset[0] = -this.chunk_half + pos[0] * this.chunk_size;
        this.chunk_offset[1] = -this.chunk_half + pos[1] * this.chunk_size;
        this.chunk_offset[2] = -this.chunk_half + pos[2] * this.chunk_size;

        // Values for specific cube to mesh
        const cube_levels = [];
        for (var i = 0; i < CHUNK_VERTS.length; i++){
            cube_levels.push(1);
        }

        // Mesh each cube
        for (var i = 0; i < CHUNK_SIZE; i++){
            for (var j = 0; j < CHUNK_SIZE; j++){
                for (var k = 0; k < CHUNK_SIZE; k++){

                    // Fetch computed levels for current cube
                    for (var m = 0; m < CHUNK_VERTS.length; m++){
                        const cube_offset = CHUNK_VERTS[m];
                        cube_levels[m] = levels[i + cube_offset[0]][j + cube_offset[1]][k + cube_offset[2]];
                    }

                    // Vertices for a single cube
                    this.mesh_cube(cube_levels, i, j ,k);
                }
            }
        }

        // Clear vertex and index storage
        const ret = [this.n_unique, this.n_vertices];
        this.n_unique = 0;
        this.n_vertices = 0;
        return ret;
    }

    /**
     * Meshes a single 1x1x1 cube
     * @param {number[][][]} cube_levels Sampled values of terrain function
     * @param {number} i x-offset of the cube in the chunk
     * @param {number} j y-offset of the cube in the chunk
     * @param {number} k z-offset of the cube in the chunk
     */
    mesh_cube(cube_levels, i, j, k){
        const cube_index = compute_cube_index(cube_levels);
        const edges = edge_table[cube_index];
        const vertex_indices = [];

        // Cube is entirely in/out of the surface
        if (edges == 0)
            return;

        // Find the vertices where the surface intersects the cube
        var mask = 1;
        for (var m = 0; m < endpoint_table.length; m++){
            if (edges & mask)
                vertex_indices[m] = this.create_or_lookup_vertex(cube_levels, m, i, j, k)
            mask <<=1;
        }

        // Create triangles based on the vertices created
        for (var i=0; tri_table[cube_index][i] !=-1; i+=3) {
            var v_1 = vertex_indices[tri_table[cube_index][i]];
            var v_2 = vertex_indices[tri_table[cube_index][i + 1]];
            var v_3 = vertex_indices[tri_table[cube_index][i + 2]];
        
            this.index_push(v_1);
            this.index_push(v_2);
            this.index_push(v_3);
        }

        // TODO:
        // Cache results for next iteration
        this.prev_cube.cube_idx = cube_index;
        this.prev_cube.vertex_indices = vertex_indices;

        // Update previous row
        this.prev_row[k].cube_idx = cube_index;
        this.prev_row[k].vertex_indices = vertex_indices;
        
        // Update previous plane
        const prev_plane_cube = this.prev_plane[j][k];
        prev_plane_cube.cube_idx = cube_index;
        prev_plane_cube.vertex_indices = vertex_indices;
    }

    create_or_lookup_vertex(cube_levels, edge_id, i, j, k){
        // Has the vertex been created previously?
        const lookup_id = this.lookup_vertex(edge_id, i, j, k);
        if (lookup_id != -1){
            if (lookup_id == undefined)
                throw new Error("Undefined edge");
            return lookup_id;
        }
            

        // Otherwise, compute and add the new vertex
        const endpoints = endpoint_table[edge_id];
        const p = this.create_offset_point(endpoints[0], i, j, k);
        const q = this.create_offset_point(endpoints[1], i, j, k);
        const v = vertex_interp_zero(p, q, cube_levels[endpoints[0]], cube_levels[endpoints[1]]);
        this.vertex_push(v);

        return this.n_unique + this.buffer_index - 1;
    }

    // Return index of vertex if it was computed previously
    lookup_vertex(edge_id, i, j, k){
        const edge_mask = 1 << edge_id;
        var idx_ok = k > 0;
        if (edge_mask & PREV_CUBE_MASK && idx_ok){
            return this.prev_cube.vertex_indices[PREV_CUBE_TRANSLATION[edge_id]];
        }

        idx_ok &&= j > 0;
        if (edge_mask & PREV_ROW_MASK && idx_ok){
            return this.prev_row[k].vertex_indices[PREV_ROW_TRANSLATION[edge_id]];
        }

        idx_ok &&= i > 0;
        if (edge_mask & PREV_PLANE_MASK && idx_ok){
            return this.prev_plane[j][k].vertex_indices[PREV_PLANE_TRANSLATION[edge_id]];
        }
        return -1;
    }

    create_offset_point(corner_id, i, j, k){
        const corner_offsets = CHUNK_VERTS[corner_id];
        return [
            this.chunk_offset[0] + corner_offsets[0] + i,
            this.chunk_offset[1] + corner_offsets[1] + j,
            this.chunk_offset[2] + corner_offsets[2] + k,
        ];
    }
}

function compute_cube_index(levels){
    /*
	   Determine the index into the edge table which
	   tells us which vertices are inside of the surface
	*/
    var cube_index = 0;
    var mask = 1;
    for (var i = 0; i < CHUNK_VERTS.length; i++){
        if (levels[i] < 0)
            cube_index |= mask;
        mask <<= 1;
    }
    return cube_index;
}
