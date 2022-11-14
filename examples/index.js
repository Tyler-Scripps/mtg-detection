let imgElement = document.createElement("img");
let imgDisp = document.getElementById("imageSrcDisp");
let inputElement = document.getElementById("fileInput");

inputElement.addEventListener("change", (e) => {
    imgElement.src = URL.createObjectURL(e.target.files[0]);
    imgDisp.src = URL.createObjectURL(e.target.files[0]);
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
    // let tileGridSize = new cv.Size(16, 16);
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
    let contourDst = cv.Mat.zeros(threshDst.rows, threshDst.cols, cv.CV_8UC1);
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
    console.log("vertices:");
    console.log(vertices);
    // draw rotatedRect
    for (let i = 0; i < 4; i++) {
        cv.line(minRectDst, vertices[i], vertices[(i + 1) % 4], rectangleColor, 2, cv.LINE_AA, 0);
    }

    cv.imshow('canvasOutput7', minRectDst);

    // for (const key in contours.get(cardContourInd)) {
    //     console.log(key);
    // }
    console.log(contours.get(cardContourInd).data32S);
    let circleColor1 = new cv.Scalar(255, 0, 0, 255);
    let pointsDst = minRectDst.clone();
    let coords = [];
    for (let i = 0; i < contours.get(cardContourInd).data32S.length / 2; i++) {
        const x = contours.get(cardContourInd).data32S[2 * i];
        const y = contours.get(cardContourInd).data32S[2 * i + 1];
        let center = new cv.Point(x, y);
        // console.log("x: " + x + ", y: " + y);
        cv.circle(pointsDst, center, 3, circleColor1);
        coords.push([x, y]);
    }
    // console.log(coords);
    closestPoints = [];
    for(let i = 0; i < 4; i++) {
        const vertex = vertices[i];
        let tempClosest;
        let tempClosestDist = 1000;
        for (const j in coords) {
            // console.log(coords[j]);
            let coord = coords[j];
            let tempDist = Math.sqrt(Math.pow((vertex.x - coord[0]),2) + Math.pow((vertex.y - coord[1]),2));    //calculate current distance
            if (tempDist < tempClosestDist) {   //this point is closer
                tempClosestDist = tempDist
                tempClosest = coord;
                // console.log(coord);
            }
        }
        // let point = new cv.Point(tempClosest[0], tempClosest[1])
        // closestPoints.push(point);
        closestPoints.push([tempClosest[0], tempClosest[1]]);
    }
    console.log(closestPoints);
    let circleColor2 = new cv.Scalar(0, 255, 0, 255);
    for (let i = 0; i < 4; i++) {
        let center = new cv.Point(closestPoints[i][0], closestPoints[i][1]);
        // cv.circle(pointsDst, closestPoints[i], 3, circleColor2);
        cv.circle(pointsDst, center, 3, circleColor2);
    }
    cv.imshow("canvasOutput8", pointsDst);

    console.log(closestPoints);


    let tempVertices = [];
    // for (let i = 0; i < 4; i++) {
    //     tempVertices.push(vertices[i].x);
    //     tempVertices.push(vertices[i].y);
    // }
    tempVertices = [0, 0, 630, 0, 630, 880, 0, 880];


    // console.log(tempVertices);
    // let verticesMat = cv.matFromArray(2, 4, cv.CV_32SC1, tempVertices);

    // console.log(closestPointsMat.data32S);
    // console.log(verticesMat.data32S);

    let width = Math.min(boundingRect.size.height, boundingRect.size.width);
    let height = Math.max(boundingRect.size.height, boundingRect.size.width);
    // console.log(width);
    // console.log(boundingRect.size.height);
    if (width == boundingRect.size.width) {    //card sideways
        console.log(tempVertices);
        tempVertices.unshift(tempVertices.pop());
        console.log(tempVertices);
        tempVertices.unshift(tempVertices.pop());
        console.log(tempVertices);
    }

    let closestPointsMat = cv.matFromArray(4, 1, cv.CV_32FC2, [].concat(...closestPoints));
    let verticesMat = cv.matFromArray(4, 1, cv.CV_32FC2, tempVertices);
    console.log(closestPointsMat);
    console.log(verticesMat);

    let M = cv.getPerspectiveTransform(closestPointsMat, verticesMat);
    console.log(M);
    let dsize = new cv.Size(630, 880);
    let warpDst = new cv.Mat();
    cv.warpPerspective(src, warpDst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
    cv.imshow("canvasOutput9", warpDst);

    //unnecesary because dsize is set to the cropped dimension
    let cropped = new cv.Mat();
    let rect = new cv.Rect(0, 0, 630, 880);
    cropped = warpDst.roi(rect);
    cv.cvtColor(cropped, cropped, cv.COLOR_RGBA2GRAY);
    cv.imshow("canvasOutput10", cropped);
    // console.log(cropped.rows);
    // console.log(cropped.cols);
    // console.log(cropped.data);

    let hashSize = new cv.Size(8, 8);
    cv.resize(cropped, cropped, hashSize, 0, 0, cv.INTER_AREA);
    cv.imshow("canvasOutput11", cropped);
    console.log(cropped.data);
    let average = 0;
    for (let i = 0; i < cropped.data.length; i++) {
        average += cropped.data[i];
    }
    average = average/cropped.data.length;
    console.log(average);
    let hashed = new Uint32Array(2);
    console.log(hashed);
    let hashedStr = "";
    for (let i = 0; i < 32; i++) {
        hashed[0] = hashed[0] << 1;
        if (cropped.data[i] > average) {
            hashed[0] = hashed[0] | 1;
        }
        hashedStr += hashed[0] & 1;
    }
    for (let i = 32; i < 64; i++) {
        hashed[1] = hashed[1] << 1;
        if (cropped.data[i] > average) {
            hashed[1] = hashed[1] | 1;
        }
        hashedStr += hashed[1] & 1;
    }
    console.log(hashedStr);


    cropped.delete();
    warpDst.delete();
    M.delete();
    closestPointsMat.delete();
    verticesMat.delete();
    pointsDst.delete();
    minRectDst.delete();
    claheDst.delete();
    src.delete(); threshDst.delete(); contourDst.delete(); hierarchy.delete(); //cleanup time
}

function onOpenCvReady() {
    console.log("OpenCV Ready");
}