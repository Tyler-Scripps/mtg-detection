let imgElement = document.getElementById("imageSrc")
let inputElement = document.getElementById("imgIn");

inputElement.addEventListener("change", (e) => {
    imgElement.src = URL.createObjectURL(e.target.files[0]);
}, false);

imgElement.onload = function() {
    let mat = cv.imread(imgElement);    //convert image to matrix for manipulation
    let dst = new cv.Mat(); //output matrix?
    cv.cvtColor(src, src, cv.COLOR_RGB2GRAY, 0);
    cv.imshow('canvasOutput1', src);
    cv.Canny(src, dst, 50, 100, 3, false);
    cv.imshow('canvasOutput2', dst);
    src.delete(); dst.delete(); //cleanup time
  }