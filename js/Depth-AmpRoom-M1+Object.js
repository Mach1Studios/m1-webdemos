// ------------------------
window.modeTracker = "";

const boseARDeviceElement = document.querySelector("bose-ar-device");
const boseAROrder = 'YXZ';
const boseARConfig = {
    order : boseAROrder,
    euler : new THREE.Euler(undefined, undefined, undefined, boseAROrder),
    eulerOffset : new THREE.Euler(undefined, undefined, undefined, boseAROrder),
    recallibrate : true,
    callibrate() {
        this.eulerOffset.copy(this.euler);
        this.recallibrate = false;
    },
    eulerScalar : {x:1, y:1, z:1},
}

boseARDeviceElement.setAttribute('double-tap', '');
boseARDeviceElement.addEventListener('doubleTap', event => {
    boseARConfig.recallibrate = true;
});

boseARDeviceElement.addEventListener("rotation", event => {
    boseARConfig.euler.x = Number(event.target.getAttribute("rotationpitch")) + (Math.PI/2);
    boseARConfig.euler.y = Number(event.target.getAttribute("rotationyaw"));
    boseARConfig.euler.z = Number(event.target.getAttribute("rotationroll"));

    if(boseARConfig.recallibrate)
        boseARConfig.callibrate();

    boseARConfig.euler.x = (boseARConfig.euler.x - boseARConfig.eulerOffset.x) * boseARConfig.eulerScalar.x;
    boseARConfig.euler.y = (boseARConfig.euler.y - boseARConfig.eulerOffset.y) * boseARConfig.eulerScalar.y;
    boseARConfig.euler.z = (boseARConfig.euler.z - boseARConfig.eulerOffset.z) * boseARConfig.eulerScalar.z;

    const pitch = radians_to_degrees(boseARConfig.euler.x);
    const yaw = radians_to_degrees(boseARConfig.euler.y);
    const roll = radians_to_degrees(boseARConfig.euler.z);

    rotationPitch.value = pitch;
    rotationYaw.value = yaw;
    rotationRoll.value = roll;

    if (window.modeTracker == "bosear") {
        //TODO: reimplement multipliers and reset all to 1 when `bosear` mode selected
        window.yaw = yaw;
        window.pitch = pitch;
        window.roll = roll;
    }
});

function selectTracker() {
    // NOTE: Clear all warning messages
    document.getElementById("warning").innerHTML = '';

    var ele = document.getElementsByName("mode");
    for (i = 0; i < ele.length; i++) {
        if (ele[i].checked) {
            window.modeTracker = ele[i].value;
        }
    }
}

function enableBoseAR() {
    var ele = document.getElementById("boseRate");
    boseARDeviceElement.setAttribute('rotation', ele.options[ele.selectedIndex].value);
}

document.addEventListener('DOMContentLoaded', (event) => {
    selectTracker();
    enableBoseAR();
})

// ------------------------
function handleDeviceOrientation(event) {
    var x = event.beta;
    var y = event.alpha;
    var z = event.gamma;
    console.info(x, y, z);

    if (window.modeTracker == "device") {
        window.yaw = x;
        window.pitch = y;
        window.roll = z;
    }
}
window.addEventListener("deviceorientation", handleDeviceOrientation);

// ------------------------ 
controls = new(function() {
    this.nPoint = 468;
    this.yawMultiplier = 2;
    this.pitchMultiplier = 1;
    this.rollMultiplier = 1;
    this.distanceMultiplier = 1.5;
    this.FOV = 35;
    this.filterSpeed = 0.9;
    this.oneEuroFilterBeta = 0.06;
})();

function setupDatGui() {
    const gui = new dat.GUI();
    //gui.add(controls, "nPoint", 300, 468); //468);
    gui.add(controls, "yawMultiplier", 0.0, 5.0);
    gui.add(controls, "pitchMultiplier", 0.0, 5.0);
    gui.add(controls, "rollMultiplier", 0.0, 5.0);
    gui.add(controls, "distanceMultiplier", 0.0, 5.0);
    gui.add(controls, "FOV", 30.0, 90.0);
    gui.add(controls, "filterSpeed", 0.1, 1.0);

    gui.add(controls, "oneEuroFilterBeta", 0.05, 0.1).onChange(function(value) {
        createOneEuroFilters();
    });
    gui.close();
}

function radians_to_degrees(radians) {
    return radians * (180 / Math.PI);
}

//TODO: Apply isMobile returned bools to Device modes
function isMobile() {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    return isAndroid || isiOS;
}

let model, ctx, videoWidth, videoHeight, video, canvas;

const mobile = isMobile();

async function setupCamera() {
    video = document.getElementById("video");

    const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
            facingMode: "user",
            width: mobile ? undefined : 640,
            height: mobile ? undefined : 480,
        },
    });
    video.srcObject = stream;

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

let faceWidthSaved = -1.0;

// Convert from degrees to radians.
Math.radians = function(degrees) {
    return degrees * Math.PI / 180;
}
Math.radians(90); // 1.5707963267948966

// Convert from radians to degrees.
Math.degrees = function(radians) {
    return radians * 180 / Math.PI;
}

async function renderPrediction() {
    const predictions = await model.estimateFaces(video);
    const warningMessage = 'WARNING: UNABLE TO TRACK FACE!';
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight, 0, 0, canvas.width, canvas.height);

    document.getElementById("stats").innerHTML = "";
    
    if (predictions.length == 0) {
        faceWidthSaved = -1.0;
    }
    
    document.getElementById("warning").innerHTML = (window.modeTracker === "facetracker" && predictions.length === 0) ? warningMessage : "";

    if (predictions.length > 0) {
        predictions.forEach((prediction) => {
            try {
                document.getElementById("warning").innerHTML = (prediction.faceInViewConfidence < 1) ? warningMessage : '';
                document.getElementById("stats").innerHTML += "confidence: " + prediction.faceInViewConfidence.toFixed(4);
            } catch (err) {
                document.getElementById("stats").innerHTML = err.message;
            }

            const keypoints = prediction.scaledMesh;

            for (let i = 0; i < keypoints.length; i++) {
                const x = keypoints[i][0];
                const y = keypoints[i][1];

                ctx.fillStyle = "white";
                ctx.fillRect(x, y, 2, 2);

                if (parseInt(controls.nPoint) == i) {
                    ctx.fillStyle = "red";
                    ctx.fillRect(x, y, 6, 6);
                }

                if (i == 10 || i == 152) {
                    ctx.fillStyle = "green";
                    ctx.fillRect(x, y, 6, 6);
                }
                if (i == 234 || i == 454) {
                    ctx.fillStyle = "yellow";
                    ctx.fillRect(x, y, 6, 6);
                }
            }

            var pTop = new THREE.Vector3(prediction.mesh[10][0], prediction.mesh[10][1], prediction.mesh[10][2]);
            var pBottom = new THREE.Vector3(prediction.mesh[152][0], prediction.mesh[152][1], prediction.mesh[152][2]);
            var pLeft = new THREE.Vector3(prediction.mesh[234][0], prediction.mesh[234][1], prediction.mesh[234][2]);
            var pRight = new THREE.Vector3(prediction.mesh[454][0], prediction.mesh[454][1], prediction.mesh[454][2]);

            var pTB = pTop.clone().addScaledVector(pBottom, -1).normalize();
            var pLR = pLeft.clone().addScaledVector(pRight, -1).normalize();

            var yaw = radians_to_degrees(Math.PI / 2 - pLR.angleTo(new THREE.Vector3(0, 0, 1)));
            var pitch = radians_to_degrees(Math.PI / 2 - pTB.angleTo(new THREE.Vector3(0, 0, 1)));
            var roll = radians_to_degrees(Math.PI / 2 - pTB.angleTo(new THREE.Vector3(1, 0, 0)));

            if (yaw > parseFloat(controls.FOV)) {
                yaw = parseFloat(controls.FOV);
            }
            if (yaw < -parseFloat(controls.FOV)) {
                yaw = -parseFloat(controls.FOV);
            }
            if (pitch > parseFloat(controls.FOV)) {
                pitch = parseFloat(controls.FOV);
            }
            if (pitch < -parseFloat(controls.FOV)) {
                pitch = -parseFloat(controls.FOV);
            }
            if (roll > parseFloat(controls.FOV)) {
                roll = parseFloat(controls.FOV);
            }
            if (roll < -parseFloat(controls.FOV)) {
                roll = -parseFloat(controls.FOV);
            }
            yawOptimized = yaw * parseFloat(controls.yawMultiplier);
            pitchOptimized = pitch * parseFloat(controls.pitchMultiplier);
            rollOptimized = roll * parseFloat(controls.rollMultiplier);

            // FACE DEPTH TRACKER
			let faceWidth = prediction.boundingBox.bottomRight[0][1] - prediction.boundingBox.topLeft[0][1];
			if(faceWidthSaved < 0) faceWidthSaved = faceWidth;
			
			let gainDistanceMultiplier = map(faceWidth, faceWidthSaved * 0.5, faceWidthSaved * 1.5, 0.0, 1.0) * controls.distanceMultiplier;

            // FACE ORIENTATION TRACKER
            if (window.modeTracker == "facetracker") {
                window.yaw = yawOptimized;
                window.pitch = pitchOptimized;
                window.roll = rollOptimized;
				
                // STEREO OBJECT PANNER
                let gainProximityL = map(yawOptimized, -90, 90, 0.0, 1.0);
                let gainProximityR = 1 - gainProximityL;
                soundPlayerStereo.updateGains([gainProximityL*gainDistanceMultiplier,gainProximityR*gainDistanceMultiplier]);
            }
        });
    }

    requestAnimationFrame(renderPrediction);
}

const progress = {
  element: '<img class="svg-loader" src="/img/spinner.svg"><p>loading...</p><p id="progress"></p>',
  change(current) {
    const progress = document.getElementById('progress');
    progress.innerHTML = `${current}%`;
  }
}

const waitingSounds = () => new Promise((resolve, reject) => {
    let timer = setInterval(() => {
        // TODO: Setup for multiple calls to `getCountOfReadySound()`
        progress.change(soundPlayer.getCountOfReadySound(); // update loading info
        if (soundPlayer.isReady() && soundPlayerStereo.isReady()) {
            clearInterval(timer);
            resolve();
        }
    }, 500);
});

async function trackerMain() {
    var info = document.getElementById("info");
    info.innerHTML = progress.element;
    document.getElementById("main").style.display = "none";

    await Promise.all([
      waitingSounds(),
      tf.setBackend("webgl"),
      setupCamera(),
    ]);

    video.play();
    videoWidth = video.videoWidth;
    videoHeight = video.videoHeight;
    video.width = videoWidth;
    video.height = videoHeight;

    canvas = document.getElementById("output");
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const canvasContainer = document.querySelector(".canvas-wrapper");
    canvasContainer.style = `width: ${videoWidth}px; height: ${videoHeight}px`;

    ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.fillStyle = "#32EEDB";
    ctx.strokeStyle = "#32EEDB";

    model = await facemesh.load({
        maxFaces: 1
    });
    await renderPrediction();

    // wait for loaded audio
    info.innerHTML = "";
    document.getElementById("main").style.display = "";
}

document.addEventListener('DOMContentLoaded', (event) => {
    setupDatGui();
    trackerMain();
})

function DisplayDebug() {
  var output = document.getElementById("modelview");
  if (output.style.display === "none") {
    output.style.display = "";
  } else {
    output.style.display = "none";
  }
  var video = document.getElementById("output");
  if (video.style.display === "none") {
    video.style.display = "";
  } else {
    video.style.display = "none";
  }
  var boseaStats = document.getElementById("bosearstats");
  if (boseaStats.style.display === "none") {
    boseaStats.style.display = "";
  } else {
    boseaStats.style.display = "none";
  }
}

// ------------------------
// Mach1 Spatial & Audio Handling

let m1Decode = null;
let m1DecodeModule = Mach1DecodeModule();
// initialize Mach1 Spatial module with initial setup settings
Mach1DecodeModule().then(function(m1DecodeModule) {
    m1Decode = new m1DecodeModule.Mach1Decode();
    m1Decode.setPlatformType(m1Decode.Mach1PlatformType.Mach1PlatformDefault);
    m1Decode.setDecodeAlgoType(m1Decode.Mach1DecodeAlgoType.Mach1DecodeAlgoSpatial);
    m1Decode.setFilterSpeed(0.9);
});

let soundPlayer = new Mach1SoundPlayer();
soundPlayer.setup(["audio/Depth-AmpRoom/Medium/T1.ogg", "audio/Depth-AmpRoom/Medium/T2.ogg", "audio/Depth-AmpRoom/Medium/T3.ogg", "audio/Depth-AmpRoom/Medium/T4.ogg", "audio/Depth-AmpRoom/Medium/B5.ogg", "audio/Depth-AmpRoom/Medium/B6.ogg", "audio/Depth-AmpRoom/Medium/B7.ogg", "audio/Depth-AmpRoom/Medium/B8.ogg"]);

let soundPlayerStereo = new Mach1SoundPlayer();
soundPlayerStereo.setup(["audio/Depth-AmpRoom/stereo-object.ogg"]);

function Decode(yaw, pitch, roll) {
    if (m1Decode != null && yaw != null && pitch != null && roll != null) {
        m1Decode.setFilterSpeed(controls.filterSpeed);
        m1Decode.beginBuffer();
        let decoded = m1Decode.decode(yaw, pitch, roll);
        m1Decode.endBuffer();

        soundPlayer.updateGains(decoded);

        var strDebug = "";
        decoded.forEach(function(d) {
            strDebug += d.toFixed(2) + " , ";
        });
    }
}

function Play() {
    soundPlayer.play();
	 if (window.modeTracker == "facetracker") {
		 soundPlayerStereo.play();
	 }
}

function Stop() {
    soundPlayer.stop();
	soundPlayerStereo.stop();
}


// ------------------------
// OSC Handling
const osc = new OSC();
osc.open({
    port: 9898
});

// ------------------------
// Visual rendering adopted from https://threejs.org/examples/webgl_materials_normalmap.html
var container, stats, loader;
var camera, scene, renderer;
var mesh, pivot;
var directionalLight, pointLight, ambientLight;

var mouseX = 0;
var mouseY = 0;

var targetX = 0;
var targetY = 0;

var width = 320; //window.innerWidth;
var height = 240; //window.innerHeight;

var windowHalfX;
var windowHalfY;

var composer, effectFXAA;

var fYaw;
var fPitch;
var fRoll;

var yaw = 0;
var pitch = 0;
var roll = 0;

window.createOneEuroFilters = function createOneEuroFilters() {
    fYaw = OneEuroFilter(60, 1.0, window.controls.oneEuroFilterBeta, 1.0);
    fPitch = OneEuroFilter(60, 1.0, window.controls.oneEuroFilterBeta, 1.0);
    fRoll = OneEuroFilter(60, 1.0, window.controls.oneEuroFilterBeta, 1.0);
};

function init() {
    mainWindow = document.getElementById("main");
    container = document.getElementById("modelview"); //document.createElement("div");

    camera = new THREE.PerspectiveCamera(27, width / height, 1, 10000);
    camera.position.z = 2500;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x474747);

    // LIGHTS
    ambientLight = new THREE.AmbientLight(0x474747);
    scene.add(ambientLight);

    pointLight = new THREE.PointLight(0xffffff, 1.25, 1000);
    pointLight.position.set(0, 0, 600);

    scene.add(pointLight);

    directionalLight = new THREE.DirectionalLight(0xffffff);
    directionalLight.position.set(1, -0.5, -1);
    scene.add(directionalLight);

    var material = new THREE.MeshPhongMaterial({
        color: 0x191919,
        specular: 0x50505,
        shininess: 25,
        normalScale: new THREE.Vector2(0.8, 0.8),
    });

    loader = new THREE.GLTFLoader();
    loader.load("https://threejs.org/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb", function(gltf) {
        createScene(gltf.scene.children[0].geometry, 100, material);
    });

    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    stats = new Stats();

    // COMPOSER
    renderer.autoClear = false;

    var renderModel = new THREE.RenderPass(scene, camera);
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderModel);

    // EVENTS
    mainWindow.addEventListener("mousemove", onDocumentMouseMove, false);
    window.addEventListener("resize", onWindowResize, false);

    onWindowResize();
}

function createScene(geometry, scale, material) {
    mesh = new THREE.Mesh(geometry, material);

    mesh.position.y = 120;
    mesh.scale.x = mesh.scale.y = mesh.scale.z = scale;

    pivot = new THREE.Group();
    pivot.position.set(0.0, -150.0, 0);
    pivot.add(mesh);

    scene.add(pivot);
}

function onWindowResize() {
    windowHalfX = width / 2;
    windowHalfY = height / 2;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    composer.setSize(width, height);
}

function onDocumentMouseMove(event) {
    var rect = event.target.getBoundingClientRect();
    mouseX = (event.clientX - rect.left) / width;
    mouseY = (event.clientY - rect.top) / height;
}

function animate() {
    requestAnimationFrame(animate);

    if (window.modeTracker == "touch") {
        window.yaw = map(mouseX, 0, 1, -90, 90);
        window.pitch = map(mouseY, 0, 1, 70, -70);
        window.roll = 0;
    }

    if (window.yaw != null) yaw = fYaw.filter(window.yaw);
    if (window.pitch != null) pitch = fPitch.filter(window.pitch);
    if (window.roll != null) roll = fRoll.filter(window.roll);

    render();
    stats.update();

    // Apply orientation to decode Mach1 Spatial to Stereo
    Decode(yaw, pitch, roll);
    // Apply orientation (yaw) to compass UI
    compass.style.transform = `rotate(${yaw}deg)`;

    // Check and reconnect OSC
    // Apply orientation as output OSC messages
    if (osc.status() == OSC.STATUS.IS_OPEN) {
        /*
        Receive OSC message with address "/orientation" and three float arguements

        Yaw (left -> right | where rotating left is negative)
        Pitch (down -> up | where rotating down is negative)
        Roll (top-pointing-left -> top-pointing-right | where rotating top of object left is negative)

        */
        osc.send(new OSC.Message("/orientation", yaw, pitch, roll));
    } else if (osc.status() == OSC.STATUS.IS_CLOSED) {
        osc.open({
            //TODO: custom port output
            port: 9898
        });
    }
}

const map = (value, x1, y1, x2, y2) => ((value - x1) * (y2 - x2)) / (y1 - x1) + x2;

function render() {
    if (mesh) {
        pivot.rotation.y = Math.PI - THREE.Math.degToRad(yaw);
        pivot.rotation.x = THREE.Math.degToRad(pitch);
        pivot.rotation.z = -THREE.Math.degToRad(roll);
    }
    composer.render();
}

document.addEventListener('DOMContentLoaded', (event) => {
    createOneEuroFilters();
    init();
    animate();
})
