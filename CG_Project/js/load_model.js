"use strict";
/*
// Create an buffer object and perform an initial configuration
function initVertexBuffers(gl, program) {
    var o = new Object(); // Utilize Object object to return multiple buffer objects
    o.vertex_buffer = createEmptyArrayBuffer(gl, program.a_position, 3, gl.FLOAT); 
    o.normal_buffer = createEmptyArrayBuffer(gl, program.a_normal, 3, gl.FLOAT);
    o.color_buffer = createEmptyArrayBuffer(gl, program.a_color, 4, gl.FLOAT);
    o.index_buffer = gl.createBuffer();
    if (!o.vertex_buffer || !o.normal_buffer || !o.color_buffer || !o.index_buffer) { return null; }
  
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  
    return o;
  }

  // Create a buffer object, assign it to attribute variables, and enable the assignment
function createEmptyArrayBuffer(gl, a_attribute, size, type) {
    var buffer =  gl.createBuffer();  // Create a buffer object
    if (!buffer) {
      console.log('Failed to create the buffer object');
      return null;
    }
    
    buffer.size = size;
    buffer.type = type;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(a_attribute, size, type, false, 0, 0);  // Assign the buffer object to the attribute variable
    gl.enableVertexAttribArray(a_attribute);  // Enable the assignment
  
    return buffer;
}*/

// Read a file
function readOBJFile(fileName, model, scale, reverse) {
    //fetch(fileName).then(response => onReadOBJFile(response.text, fileName, model, scale, reverse));

    //const model_promise = new Promise()
    var request = new XMLHttpRequest();
  
    request.onreadystatechange = function() {
      if (request.readyState === 4 && request.status !== 404) {
        onReadOBJFile(request.responseText, fileName, model, scale, reverse);
      }
    }
    request.open('GET', fileName, false); // Create a request to acquire the file
    request.send();                      // Send the request
  }
  

  // OBJ File has been read
function onReadOBJFile(fileString, fileName, model, scale, reverse) {
    var objDoc = new OBJDoc(fileName);  // Create a OBJDoc object
    var result = objDoc.parse(fileString, scale, reverse); // Parse the file
    if (!result) {
      //g_objDoc = null; g_drawingInfo = null;
      console.log("OBJ file parsing error.");
      return;
    }
    model.obj_doc = objDoc;
}

// OBJ File has been read completely
function onReadComplete(model, objDoc) {
    // Acquire the vertex coordinates and colors from OBJ file
    var drawingInfo = objDoc.getDrawingInfo();
  
    // Write date into the buffer object
    model.set_buffer_data(ATTRIBUTES.POSITION, drawingInfo.vertices)
    model.set_buffer_data(ATTRIBUTES.NORMAL, drawingInfo.normals)
    model.set_buffer_data(ATTRIBUTES.COLOR, drawingInfo.colors)
    model.set_buffer_data(ATTRIBUTES.INDEX, drawingInfo.indices);
  
    model.n_vertices = drawingInfo.indices.length;
    return drawingInfo;
}