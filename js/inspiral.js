function fromSpherical(r, phi, theta) {
    return new THREE.Vector3(r * Math.sin(theta) * Math.cos(phi),
			 r * Math.sin(theta) * Math.sin(phi),
			 r * Math.cos(theta));
}

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight-200 );
renderer.setClearColor (0x111133, 1);
document.body.appendChild( renderer.domElement );

var STAR_COUNT = 2000;
var STAR_DIST = 1000;
var dotGeometry = new THREE.Geometry();
dotGeometry.vertices.push(new THREE.Vector3( 0, 0, 0));
var dotMaterial = new THREE.PointsMaterial( { size: 1, sizeAttenuation: false } );

for (var i = 0; i < STAR_COUNT; i++) {
    var dot = new THREE.Points( dotGeometry, dotMaterial );
    scene.add( dot );
    phi = Math.random() * Math.PI * 2;
    theta = Math.acos(2*Math.random() - 1);
    dot.position.copy(fromSpherical(STAR_DIST, phi, theta));
}


var geometry = new THREE.SphereGeometry(1, 20, 20);
var material = new THREE.MeshBasicMaterial( { color: 0x000000 } );

var sphere = new THREE.Mesh( geometry, material );
sphere.position.x = -2;
scene.add( sphere );

var sphere = new THREE.Mesh( geometry, material );
sphere.position.x = 2;
scene.add( sphere );


var oc = {
    r: 10,
    theta:  Math.PI/4,
    phi: 0,
    moving: false,

    mouseX: 0,
    mouseY: 0,

    dtheta: 0.01,
    dphi: 0.01,

    newTheta: function(delta) {
	return Math.min(Math.max(this.theta + this.dtheta * delta, 0.1), Math.PI/2);
    },
    newPhi: function(delta) {
	return this.phi + this.dphi * delta;
    }
};

function dragStart(event) {
    oc.moving = true;
    oc.mouseX = event.clientX;
    oc.mouseY = event.clientY;
}

function dragEnd() {
    oc.moving = false;
}

function updateCamera(phi, theta) {
    camera.position.copy(fromSpherical(oc.r, phi, theta));

    camera.up.set(0,0,1);
    camera.lookAt(new THREE.Vector3(0,0,0));
}

function drag(event) {
    if (oc.moving) {
	phi = oc.newPhi(event.clientX - oc.mouseX);
	theta = oc.newTheta(event.clientY - oc.mouseY);
	
	updateCamera(phi, theta);

	oc.mouseX = event.clientX;
	oc.mouseY = event.clientY;
	oc.phi = phi;
	oc.theta = theta;
    }
}

updateCamera(oc.phi, oc.theta);
document.addEventListener('mousedown', dragStart);
document.addEventListener('mouseup', dragEnd);
document.addEventListener('mousemove', drag);

var animate = function () {
    requestAnimationFrame( animate );

    renderer.render( scene, camera );
};

animate();
