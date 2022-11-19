/**
 * Processes an image containing a trading card then returns a cropped version sized as 630 by 880 by default
 * if outX and outY are provided then a smaller resized version will be returned
 * @param {*} imgElement - image or canvas element id
 * @param {number} [outX] - Optional output width
 * @param {number} [outY] - Optional output height
 * @param {object} [stepElements] - Optional object containing html elements or id for steps to be output to. Steps are: gray, threshold, contours, cardContour, boundingRect, warp, and resize
 * @returns Array of uint8s containing grayscale image
 */
export function processImage(imgElement, outX = 630, outY = 880, stepElements = {}) {
    let src = cv.imread(imgElement);    //convert image to matrix for manipulation
    let scalef = 1000 / Math.max(src.size().width, src.size().height);  //determine the scale factor to keep the largest dimesnion under 1000px
    if (scalef < 1) {   //if scaling is needed do the scaling, only scales down not up because this is purely to maintain performance
        let newSize = new cv.Size(src.size().width * scalef, src.size().height * scalef);
        cv.resize(src, src, newSize, 0, 0, cv.INTER_AREA);
    }
    //lighting normalization
    let labImg = new cv.Mat();  //matrix to store imae in lab colorspace
    cv.cvtColor(src, labImg, cv.COLOR_BGR2Lab); //convert to lab colorspace
    let channels = new cv.MatVector();  //vector store channels of lab colorspace
    cv.split(labImg, channels); //split into the 3 channels
    let clahe = new cv.CLAHE(4);    //create object to do CLAHE histogram equalization
    let claheDst = new cv.Mat();    //matrix to store clahe equalized image
    clahe.apply(channels.get(0), claheDst); //equalize channel 0 (brightness)
    channels.set(0, claheDst); //put channel 0 (brightness) back into the channel object
    cv.merge(channels, claheDst);   //bring the channels back together
    let normalizedImg = new cv.Mat();   //stores normalized image in rgb encoding
    cv.cvtColor(claheDst, normalizedImg, cv.COLOR_Lab2BGR); //convert from lab to rgb
    let srcGray = new cv.Mat(); //will store grayscale normalized image
    cv.cvtColor(normalizedImg, srcGray, cv.COLOR_RGBA2GRAY, 0);   //convert to grayscale

    if (stepElements.gray) {    //output grayscale to element
        cv.imshow(stepElements.gray, srcGray);
    }

    //thresholding
    let threshDst = new cv.Mat();   //will store the thresholded image
    cv.threshold(srcGray, threshDst, 110, 255, cv.THRESH_BINARY);   //run a threshold over image

    if (stepElements.threshold) {   //output threshold to element
        cv.imshow(stepElements.threshold, threshDst);
    }
    
    //contour fnding
    let contours = new cv.MatVector();  //will store found contours
    let hierarchy = new cv.Mat();   //will store contour hierarchy
    cv.findContours(threshDst, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE); //actually finds the contours

    if (stepElements.contours) {    //output contours to element
        let contourDst = cv.Mat.zeros(threshDst.rows, threshDst.cols, cv.CV_8UC1);
        for (let i = 0; i < contours.size(); ++i) {
            let color = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255));
            cv.drawContours(contourDst, contours, i, color, 1, cv.LINE_8);
        }
        cv.imshow(stepElements.contours, contourDst);
        contourDst.delete();
    }

    //for more on contour hierarchy: https://docs.opencv.org/4.6.0/da/d0a/tutorial_js_contours_hierarchy.html
    let topLevel = [];  //will store all top level contours
    for (let i = 0; i < hierarchy.cols; i++) {  //find top level contours
        if (hierarchy.col(i).data32S[3] == -1) {
            topLevel.push(i);
        }
    }
    let cardContourInd; //card contour index
    let largestArea = 0;
    //look for card contour
    for (let i = 0; i < contours.size(); ++i) {
        //if if the parent of the card is a top level contour and this contour has children it is probably the card
        //this should be improved to find the largest contour fitting the criteria
        if (topLevel.includes(hierarchy.col(i).data32S[3]) && hierarchy.col(i).data32S[2] != -1) {   //top level parent
            let tempArea = cv.contourArea(contours.get(i));
            if (tempArea > largestArea) {
                cardContourInd = i;
                largestArea = tempArea;
            }
        }
    }

    if (stepElements.cardContour) { //output card contour to element
        let contourDst = cv.Mat.zeros(threshDst.rows, threshDst.cols, cv.CV_8UC1);
        let color = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255));
        cv.drawContours(contourDst, contours, cardContourInd, color, 1, cv.LINE_8);
        cv.imshow(stepElements.cardContour, contourDst);
        contourDst.delete();
    }

    //bounding box
    let boundingRect = cv.minAreaRect(contours.get(cardContourInd));    //create a bounding box around the card, this may be rotated
    let vertices = cv.RotatedRect.points(boundingRect); //get vertices of boundingRect
    let pointCoords = [];   //coordinates of points on card contour

    //iterate through points of card contour and add them to pointCoords
    for (let i = 0; i < contours.get(cardContourInd).data32S.length / 2; i++) {
        const x = contours.get(cardContourInd).data32S[2 * i];
        const y = contours.get(cardContourInd).data32S[2 * i + 1];
        pointCoords.push([x, y]);
    }

    let closestPoints = []; //array to store the points closest to the corners of the bounding rectangle
    //iterate over the four corners of the bounding rectangle
    for(let i = 0; i < 4; i++) {
        const vertex = vertices[i]; //vertex we are working on
        let tempClosest;    //store currently found closest point betwen iterations of inner for loop
        let tempClosestDist = 10000; //store currently found closest distance betwen iterations of inner for loop, initialize to 10000 because that is garunteed to be the bigger than largest diagonal of image
        //iterate over points in contour
        for (const j in pointCoords) {
            let coord = pointCoords[j]; //current point
            let tempDist = Math.sqrt(Math.pow((vertex.x - coord[0]),2) + Math.pow((vertex.y - coord[1]),2));    //calculate current distance
            if (tempDist < tempClosestDist) {   //this point is closer
                tempClosestDist = tempDist  //store new closest distance
                tempClosest = coord;    //store new closest point
            }
        }
        closestPoints.push([tempClosest[0], tempClosest[1]]);   //store the closest point for this vertex
    }

    if (stepElements.boundingRect) {    //output bounding box and closest point to element
        let minRectDst = src.clone();
        let rectangleColor = new cv.Scalar(255, 0, 0, 255);
        let circleColor = new cv.Scalar(0, 255, 0, 255);
        for (let i = 0; i < 4; i++) {
            cv.line(minRectDst, vertices[i], vertices[(i + 1) % 4], rectangleColor, 2, cv.LINE_AA, 0);
            for (let i = 0; i < 4; i++) {
                let center = new cv.Point(closestPoints[i][0], closestPoints[i][1]);
                cv.circle(minRectDst, center, 3, circleColor);
            }
        }
        cv.imshow(stepElements.boundingRect, minRectDst);
        minRectDst.delete();
    }

    //transformation

    let tempVertices = [0, 0, 630, 0, 630, 880, 0, 880];  //predictably located and sized vertices in aspect ratio of card
    let width = Math.min(boundingRect.size.height, boundingRect.size.width);    //figure out which dimension (height or width) is the width of the card (larger dimension)
    if (width == boundingRect.size.width) {    //card sideways
        tempVertices.unshift(tempVertices.pop());   //rotate clockwise
        tempVertices.unshift(tempVertices.pop());
    }

    //convert closestPoints to a opencv mat, this requrires a 1d array so do that too
    let closestPointsMat = cv.matFromArray(4, 1, cv.CV_32FC2, [].concat(...closestPoints));
    let verticesMat = cv.matFromArray(4, 1, cv.CV_32FC2, tempVertices); //create vertices matrix
    let M = cv.getPerspectiveTransform(closestPointsMat, verticesMat);  //get the transform from warped to unwarped image
    let dsize = new cv.Size(630, 880);  //size for transformed image, this size will also crop the image
    let warpDst = new cv.Mat(); //matrix to store transformed image
    cv.warpPerspective(srcGray, warpDst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());   //actually to the warping (deskewing and rotation)

    if (stepElements.warp) {    //output (de)warped image to element
        cv.imshow(stepElements.warp, warpDst)
    }

    //the user wants a resize
    if (outX != 630 || outY != 880) {
        let finalSize = new cv.Size(outX, outY);    //stores the desired size
        cv.resize(warpDst, warpDst, finalSize, 0, 0, cv.INTER_AREA);    //run the resize for the final desired dimension
        if (stepElements.resize) {  //output resized image to element
            cv.imshow(stepElements.resize, warpDst);
            // console.log("resized image:")
            // console.log(warpDst.data)
        }
    }

    //cleanup matrices
    // warpDst.delete();
    M.delete();
    closestPointsMat.delete();
    verticesMat.delete();
    claheDst.delete();
    src.delete();
    threshDst.delete();
    hierarchy.delete();
    labImg.delete();
    normalizedImg.delete();
    srcGray.delete();
    channels.delete();
    contours.delete();

    return warpDst.data;
}

/**
 * Runs an average hash on a array representing an image
 * for more on hashing: https://www.hackerfactor.com/blog/index.php?/archives/529-Kind-of-Like-That.html
 * @param {*} imgData - Array of uint8s to be hashed
 * @returns average hash of data as a string of ones and zeros or false if error occurred
 */
export function averageHash(imgData) {
    //ensure that imgData is actually an array
    if (!Array.isArray(imgData)) {
        // return false;
    }
    //Average
    let average = 0;    //will contain average of data
    //add 
    for (let i = 0; i < imgData.length; i++) {
        average += imgData[i];
    }
    //divide
    average = average/imgData.length;

    //pixel by pixel hashing
    let hashedStr = "";
    for (let i = 0; i < imgData.length; i++) {
        if (imgData[i] > average) {
            hashedStr += '1';
        } else {
            hashedStr += '0';
        }
    }

    return hashedStr;
}

/**
 * calculates the difference hash of imgData
 * for more on hashing: https://www.hackerfactor.com/blog/index.php?/archives/529-Kind-of-Like-That.html
 * @param {*} imgData - array of uint8s to be hashed
 * @param {number} width - width of image represented by imgData
 * @param {number} height - height of image represented by imgData
 * @returns difference hash of data as a string of ones and zeros or false if error occurred
 */
export function differenceHash(imgData, width, height) {
    //ensure imgData is an array
    if (!Array.isArray(imgData)) {
        // return -1;   //doesn't seem to work
    }
    //ensure width and height actually make sense
    if (width * height != imgData.length) {
        return -2;
    }
    let hashedStr = "";
    for (let i = 0; i < height; i++) {
        let rowOffset = i * width;  //offset due to the current row (i)
        for (let j = 0; j < width - 1; j++) {
            if (imgData[rowOffset + j] < imgData[rowOffset + j + 1]) {
                hashedStr += '1';
            } else {
                hashedStr += '0';
            }
        }
    }
    return hashedStr;
}