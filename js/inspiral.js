// functions

function fromSpherical(r, phi, theta) {
    return new THREE.Vector3(r * Math.sin(theta) * Math.cos(phi),
			 r * Math.sin(theta) * Math.sin(phi),
			 r * Math.cos(theta));
}

function zip(a, b, start=0, end=null) {
    var arr = [];

    if (end == null) {
	end = a.length;
    }
    
    for (var i = start; i < end; i++) {
	arr.push({x: a[i], y: b[i]});
    }

    return arr;
}

function linspace(start, end, n) {
    arr = [];
    
    delta = (end - start)/(n-1);
    cur = start;
    for (var i = 0; i < n; i++) {
	arr.push(cur);
	cur += delta;
    }

    return arr;
}

// constants

var c = 3e8;
var G = 6.67e-11;
var Mo = 2e30;

var R0 = 5*(2*G*(20*Mo)/c**2);
var TAU0 = 0.077;
var DIST_SCALE = 6 / R0;

var M0 = 10;
var MASS_SCALE = 0.1;

var BRIGHT_GREEN = 'rgb(150, 200, 50)';
var DULL_GREEN = 'rgb(20, 70, 0)';

// Three.js setup

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight-200 );
renderer.setClearColor (0x111133, 1);
document.body.insertBefore(renderer.domElement,
			   document.body.firstChild);
// plot

var originalLineDraw = Chart.controllers.line.prototype.draw;
Chart.helpers.extend(Chart.controllers.line.prototype, {
    draw: function() {
	originalLineDraw.apply(this, arguments);
	
	var chart = this.chart;
	var ctx = chart.chart.ctx;

	var index = chart.config.data.lineAtIndex;
	
	if (index && this.index == 0) {
	    const xaxis = chart.scales['x-axis-0'];
	    const yaxis = chart.scales['y-axis-0'];
	    ctx.beginPath();
	    ctx.strokeStyle = BRIGHT_GREEN;
	    
	    let linePosition = xaxis.getPixelForValue(
		system.times[system.curTime], index);
	    ctx.moveTo(linePosition, yaxis.top);
	    ctx.lineTo(linePosition, yaxis.bottom);
	    ctx.stroke();
	}
    }
});

var chart = new Chart($('#waveform'), {
    type: 'line',
    data: {
	datasets: [{
	    borderColor: BRIGHT_GREEN,
	    data: undefined,
	    label: 'Waveform'
	},
	{
	    borderColor: DULL_GREEN,
	    data: undefined,
	    label: 'Waveform'
	}],
	lineAtIndex: 2
    },
    options: {
	elements: {
	    line: {
		fill: false
	    },
	    point: {
		radius: 0
	    }
	},
	legend: {
	    display: false
	},
	scales: {
	    xAxes: [{
		type: 'linear',
		display: false
	    }],
	    yAxes: [{
		display: false
	    }]
	},
	responsive: true,
	maintainAspectRatio: false
    }
});

chart.options.animation.duration = 0;

// skybox

var STAR_COUNT = 2000;
var STAR_DIST = 800;
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

// BH class and geometries

class System {
    constructor(bbhs) {
	this.bbhs = bbhs;
	this.dt = 0.0005;
	
	this.product = null;

	this.updateOrbitParams();
    }

    updateBodyValues() {
	this.bbhs.forEach((bbh, i) =>
			  {
			      bbh.updateMass(mSliders[i].getValue());
			  });
    }
    
    updateOrbitParams() {
	var m1 = this.bbhs[0].m;
	var m2 = this.bbhs[1].m;

	this.bbhs[0].phi = 0;
	this.bbhs[1].phi = Math.PI;

	this.m_ = m1+m2
	this.m = this.m_*Mo;
	this.mu = m1*m2/(m1+m2)*Mo;
	this.Mc = this.mu**(3/5) * this.m**(2/5);

	this.tau0 = TAU0;
	this.R0 = (G**3*this.m**2*this.mu*this.tau0/c**5 * 256/5)**(1/4)
	
	this.t = 0;
	if (this.product != null) {
	    this.product.remove();
	}
	this.product = null;
	
	this.times = linspace(0, this.tau0-this.dt, 500);
	this.hs = this.times.map(t =>
				 (G*this.Mc / c**2)**(5/4)
				 * (5/c/(this.tau0 - t))**(1/4)
				 * Math.cos(
					 -2*(5*G*this.Mc/c**3)**(-5/8)
					 *(this.tau0 - t)**(5/8)
				 ));
    }
    
    drawOrbit() {

	if (this.t < this.tau0) {
	    // calculate physics
	    var newR = this.R0*((this.tau0 - this.t)/this.tau0)**(1/4);
	    var f_orbit = 1/Math.PI * (5/256 / (this.tau0 - this.t))**(3/8) * (G*this.Mc/c**3)**(-5/8)/2;
	    var dphi = f_orbit*this.dt * 2*Math.PI;

	    this.bbhs.forEach(function(bbh) {
		bbh.r = newR*(system.m_ - bbh.m)/system.m_;
		bbh.phi += dphi;
		bbh.draw();
	    });
	}
	else {
	    if (this.product == null) {
		this.product = new Body(this.m_, 0);
		console.log(this.product);
		this.bbhs.forEach(bbh => bbh.remove());
	    }

	}

	// update chart
	this.curTime = Math.round(this.t/(this.times[1]-this.times[0]));
	
	chart.data.datasets[0].data = zip(this.times, this.hs, 0, this.curTime);
	chart.data.datasets[1].data = zip(this.times, this.hs, this.curTime);	
	chart.update();
    }
}

class Body {
    constructor(m, r) {
	this.m = m;
	
	this.r = r;
	this.phi = 0;
	this.addScene();

	this.draw();
    }
    
    addScene() {
	var geometry = new THREE.SphereGeometry(this.m * MASS_SCALE, 20, 20);
	var material = new THREE.MeshBasicMaterial( { color: 0x000000 } );

	this.mesh = new THREE.Mesh( geometry, material );
	scene.add(this.mesh);
    }
    
    draw() {
	this.mesh.position.copy(fromSpherical(this.r*DIST_SCALE, this.phi, Math.PI/2));
    }

    updateMass(m) {
	this.m = m;
	this.remove();
	this.addScene();
    }

    remove() {
	scene.remove(this.mesh);
    }

}

var bbhs = [];

for (var i = 0; i < 2; i++) {
    bbhs.push(new Body(M0, R0));
}

var system = new System(bbhs);

// controls class

class Slider {
    constructor(min, max, def, id, rounding = 0, step = 1) {
	this.value = def;

	this.label_object = $("#" + id + " label");
	this.range_object = $("#" + id + " input[type=range]");

	this.range_object.attr('min', min);
	this.range_object.attr('max', max);
	this.range_object.attr('step', step);
	this.range_object.val(def);

	this.updateLabel();
	this.range_object.on('input change', () => {
	    this.updateLabel();
	    system.updateBodyValues();
	    system.updateOrbitParams();
	} );
    }

    getValue() {
	return parseInt(this.range_object.val());
    }

    updateLabel() {
	this.label_object.html(parseFloat(this.getValue()).toFixed(this.rounding));
    }
}

var mSliders = [];
for (var i = 1; i <= 2; i++) {
    mSliders.push(new Slider(5, 50, 10, 'm'+i));
}

// camera controls

var oc = {
    r: 10,
    theta:  Math.PI/4,
    phi: 0,
    moving: false,

    mouseX: 0,
    mouseY: 0,

    dr: 0.03,
    dtheta: 0.01,
    dphi: 0.01,

    newR: function(delta) {
	return Math.min(Math.max(oc.r+oc.dr*delta, 1), 40);
    },
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
    camera.position.copy(fromSpherical(oc.r, oc.phi, oc.theta));

    camera.up.set(0,0,1);
    camera.lookAt(new THREE.Vector3(0,0,0));
}

function drag(event) {
    if (oc.moving) {
	oc.phi = oc.newPhi(event.clientX - oc.mouseX);
	oc.theta = oc.newTheta(event.clientY - oc.mouseY);
	
	updateCamera();

	oc.mouseX = event.clientX;
	oc.mouseY = event.clientY;
    }
}

function zoom(event) {
    oc.r = oc.newR(event.deltaY);
    updateCamera();
}

updateCamera();
renderer.domElement.addEventListener('mousedown', dragStart);
renderer.domElement.addEventListener('mouseup', dragEnd);
renderer.domElement.addEventListener('mousemove', drag);
renderer.domElement.addEventListener('wheel', zoom);

// animate inspiral

var animTime = 0;
var animate = function (time) {
    requestAnimationFrame( animate );

    // increment time
    timeFactor = (time-animTime)/50;
    system.t += isNaN(timeFactor) ? system.dt : timeFactor*system.dt;
    animTime = time;
    
    system.drawOrbit();
    
    renderer.render( scene, camera );
};

animate();
