import { differenceHash, processImage } from "../../mtg-detector.js";

let imgElement = document.createElement("img");
let imgDisp = document.getElementById("imageSrcDisp");
let inputElement = document.getElementById("fileInput");

inputElement.addEventListener("change", (e) => {
    imgElement.src = URL.createObjectURL(e.target.files[0]);
    imgDisp.src = URL.createObjectURL(e.target.files[0]);
}, false);

imgElement.onload = function() {
    let outputs = {
        gray: "canvasOutput1",
        threshold: "canvasOutput2",
        contours: "canvasOutput3",
        cardContour: "canvasOutput4",
        boundingRect: "canvasOutput5",
        warp: "canvasOutput6",
        resize: "canvasOutput7"
    }
    processImage(imgElement, 9, 8, outputs);
}