import { averageHash, differenceHash, processImage } from "../../mtg-detector.js";

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
    let imgData9x8 = processImage(imgElement, 9, 8, outputs);
    let diffHash = differenceHash(imgData9x8, 9, 8);

    let imgdata8x8 = processImage(imgElement, 8, 8);
    let aveHash = averageHash(imgdata8x8);

    console.log("average hash: " + aveHash);
    console.log("difference hash: " + diffHash);
}