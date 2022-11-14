let imgElement = document.getElementById("imageSrc")
let inputElement = document.getElementById("fileInput");

inputElement.addEventListener("change", (e) => {
    imgElement.src = URL.createObjectURL(e.target.files[0]);
}, false);

imgElement.onload = function() {
    let src = cv.imread(imgElement);    //convert image to matrix for manipulation

    //resizing
    // console.log("origianl size:");    //debugging
    // console.log(src.size());    //debugging
    let scalef = 1000 / Math.max(src.size().width, src.size().height);
    // console.log("scalef: " + scalef);
    if (scalef < 1) {
        let newSize = new cv.Size(src.size().width * scalef, src.size().height * scalef);
        cv.resize(src, src, newSize, 0, 0, cv.INTER_AREA);
        // console.log("new size: ");  //debugging
        // console.log(src.size());    //debugging
    }
    //done resizing

    cv.imshow("canvasOutput1", src);

    //lighting normalization
    let labImg = new cv.Mat();
    cv.cvtColor(src, labImg, cv.COLOR_BGR2Lab);
    let channels = new cv.MatVector();
    // console.log(channels);
    // let channels = [new cv.Mat(), new cv.Mat(), new cv.Mat()];
    cv.split(labImg, channels);
    cv.imshow("canvasOutput2", labImg);
    let tileGridSize = new cv.Size(16, 16);
    // let clahe = new cv.CLAHE(4, tileGridSize);
    let clahe = new cv.CLAHE(4);
    let claheDst = new cv.Mat();
    // console.log(channels.get(0));
    // console.log(claheDst);
    clahe.apply(channels.get(0), claheDst);
    // console.log("applied clahe")
    channels.set(0, claheDst);
    // cv.imshow("canvasOutput5", claheDst);
    // cv.merge([claheDst, channels.get(1), channels.get(2)], claheDst);
    cv.merge(channels, claheDst);
    cv.imshow("canvasOutput3", claheDst);
    let normalizedImg = new cv.Mat();
    cv.cvtColor(claheDst, normalizedImg, cv.COLOR_Lab2BGR);
    cv.imshow("canvasOutput4", normalizedImg);

    let srcGray = new cv.Mat()
    cv.cvtColor(normalizedImg, srcGray, cv.COLOR_RGBA2GRAY, 0);   //convert to grayscale

    //thresholding
    let threshDst = new cv.Mat();
    cv.threshold(srcGray, threshDst, 110, 255, cv.THRESH_BINARY);   //may need tuning
    cv.imshow("canvasOutput5", threshDst);

    //contour finding
    let contourDst = cv.Mat.zeros(threshDst.rows, threshDst.cols, cv.CV_8UC3);
    // let srcCont = cv.imread(imgElement);
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(threshDst, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);
    // console.log("found " + contours.size() + " contours");  //debugging

    // for (var m in hierarchy.col(0)) {
    //     console.log(m);
    // }
    // console.log(hierarchy.cols);
    // console.log(hierarchy.col(1));
    // console.log(hierarchy.col(1).data);
    // console.log(hierarchy.col(1).step);
    let topLevel = [];
    for (let i = 0; i < hierarchy.cols; i++) {
        if (hierarchy.col(i).data32S[3] == -1) {
            topLevel.push(i);
        }
    }
    console.log(topLevel);

    let cardContourInd;

    //drawing contours for human output
    for (let i = 0; i < contours.size(); ++i) {
        // console.log(i); //debugging

        if (topLevel.includes(hierarchy.col(i).data32S[3]) && hierarchy.col(i).data32S[2] != -1) {   //top level parent
            let color = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255));
            cv.drawContours(contourDst, contours, i, color, 1, cv.LINE_8, hierarchy, 100);
            cardContourInd = i;
        }
        // let color = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255));
        // cv.drawContours(contourDst, contours, i, color, 1, cv.LINE_8, hierarchy, 100);
    }
    cv.imshow("canvasOutput6", contourDst);

    let boundingRect = cv.minAreaRect(contours.get(cardContourInd));
    let vertices = cv.RotatedRect.points(boundingRect);
    let rectangleColor = new cv.Scalar(255, 0, 0, 255);
    let minRectDst = src.clone();
    // draw rotatedRect
    for (let i = 0; i < 4; i++) {
        cv.line(minRectDst, vertices[i], vertices[(i + 1) % 4], rectangleColor, 2, cv.LINE_AA, 0);
    }

    cv.imshow('canvasOutput7', minRectDst);

    for (const key in contours.get(cardContourInd)) {
        console.log(key);
    }
    console.log(contours.get(cardContourInd).data32S);
    let circleColor = new cv.Scalar(255, 0, 0, 255);
    let pointsDst = src.clone();
    for (let i = 0; i < contours.get(cardContourInd).data32S.length / 2; i++) {
        const x = contours.get(cardContourInd).data32S[2 * i];
        const y = contours.get(cardContourInd).data32S[2 * i + 1];
        let center = new cv.Point(x, y);
        console.log("x: " + x + ", y: " + y);
        cv.circle(pointsDst, center, 3, circleColor);
    }
    cv.imshow("canvasOutput8", pointsDst);

    // console.log(vertices);
    // let height = boundingRect.size.height;
    // let width = boundingRect.size.width;
    // let warpDst = [];
    // warpDst.push = [0, height-1];
    // warpDst.push = [0, 0];
    // warpDst.push = [width-1, 0];
    // warpDst.push = [width-1, height-1];
    // cv.getPerspectiveTransform()


    pointsDst.delete();
    minRectDst.delete();
    claheDst.delete();
    src.delete(); threshDst.delete(); contourDst.delete(); hierarchy.delete(); //cleanup time
}

function onOpenCvReady() {
    console.log("OpenCV Ready");
}