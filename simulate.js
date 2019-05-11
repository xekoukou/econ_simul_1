function Simulation(charts_info_, distr_info_ , sample_rate_ , update_rate_) {
   
    this.charts_info = charts_info_;
    this.distr_info = distr_info_;


    this.hasStarted = false;
    this.hasStopped = true;

    this.xcharts = {};
    this.xpoints = {};

    this.xdcharts = {};
    
    this.update_rate = update_rate_;
    this.sample_rate = sample_rate_;
    this.time = 0;
    this.prev_time = 0;

    var self = this;
    this.worker = new Worker("equations.js");
    this.worker.onmessage = function(e) {
	self.time++;

// Save the data points.
        Object.keys(self.xpoints).forEach(function(key) {
            var x_name = self.xcharts[key].x_name;
            var y_name = self.xcharts[key].y_name;
            self.xpoints[key].push(new Point(x_name == 'time' ? (self.time * self.sample_rate) : e.data[x_name], e.data[y_name]));
        });

	// dcharts are updated at the sample rate since at each sample we have a different chart.
        Object.keys(self.xdcharts).forEach(function(key) {
            self.xdcharts[key].clear();
            self.xdcharts[key].add(e.data.dcharts[key]);
        });

	
// Update the charts
	if(self.time == self.update_rate + self.prev_time){
	    self.prev_time = self.time;

	    Object.keys(self.xpoints).forEach(function(key) {
		self.xcharts[key].add(self.xpoints[key]);
		self.xpoints[key] = [];
	    });
	}
	
	//Request for more.
	if(self.hasStarted && !self.hasStopped) {
	    self.worker.postMessage({option : "more"});
	}
    };
}


Simulation.prototype.start = function() {
    var self = this;
    if (self.hasStopped === true && self.hasStarted === false) {

        self.charts_info.forEach(function(each) {
            self.xcharts[each[2]] = new Chart(each[2],each[0], each[1], each[3], each[4]);
            self.xpoints[each[2]] = [];
        });
        self.distr_info.forEach(function(each) {
            self.xdcharts[each[2]] = new Chart(each[2],each[0], each[1], each[3], each[4]);
        });

        self.worker.postMessage({option : "start" , sample_rate : this.sample_rate});
        self.worker.postMessage({option : "more"});
        self.hasStopped = false;
        self.hasStarted = true;
    }
};

Simulation.prototype.stop = function() {
    if (this.hasStopped === false) {
        this.hasStopped = true;
    }
};

Simulation.prototype.continue = function() {
    if (this.hasStopped === true && this.hasStarted === true) {
        this.worker.postMessage({option : "more"});
        this.hasStopped = false;
    }
};
Simulation.prototype.reset = function() {
    var self = this;
    self.stop();
    this.worker.postMessage({option : "reset"});

    self.charts_info.forEach(function(each) {
        $("#" + each[2]).empty();
    });
    self.distr_info.forEach(function(each) {
        $("#" + each[2]).empty();
    });
    
    self.xcharts = {};
    self.xpoints = {};
    self.xdcharts = {};
    self.hasStarted = false;
    self.time = 0;
    self.prev_time = 0;
};
