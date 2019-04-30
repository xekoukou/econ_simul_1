function Simulation(Env_, charts_info_, graphs_info_, equations_, sample_rate_, update_rate_) {
   
    this.Env = Env_;
    this.env = null;

    this.charts_info = charts_info_;
    this.graphs_info = graphs_info_;


    this.hasStarted = false;
    this.hasStopped = true;
    this.simulate_id = 0;

    this.xgraphs = {};
    this.xcharts = {};
    this.xpoints = {};

    this.equations = equations_;
    this.sample_rate = sample_rate_;
    this.update_rate = update_rate_;
    this.time = 0;
    this.sample_time = 0;

}
Simulation.prototype.simulate = function() {
    var self = this;
    return setInterval(function() {
        var l = 1;
        while (self.time < self.update_rate * (self.sample_time + 1)) {
            while (self.time < self.update_rate * self.sample_time + l * self.sample_rate) {
                self.equations(self.time, self.env, self.xgraphs);
                self.time++;
            }
            l++;
            Object.keys(self.xpoints).forEach(function(key) {
                var x_name = self.xcharts[key].x_name;
                var y_name = self.xcharts[key].y_name;
                self.xpoints[key].push(new Point(x_name == 'time' ? self.time : self.env[x_name], self.env[y_name]));
            });
        }
        self.sample_time++;
        Object.keys(self.xpoints).forEach(function(key) {
            self.xcharts[key].add(self.xpoints[key]);
            self.xpoints[key] = [];
        });
        Object.keys(self.xgraphs).forEach(function(key) {
            self.xgraphs[key].killForceAtlas2();
            self.xgraphs[key].refresh();
            self.xgraphs[key].startForceAtlas2({
                "worker": true,
                "barnesHutOptimize": true
            });
        });
    }, 1);
};
Simulation.prototype.start = function() {
    var self = this;
    if (self.hasStopped === true && self.hasStarted === false) {
        self.env = new self.Env();


        self.charts_info.forEach(function(each) {
            self.xcharts[each[2]] = new Chart(each[2],each[0], each[1], each[3], each[4]);
            self.xpoints[each[2]] = [];
        });

        self.graphs_info.forEach(function(each) {
            $("#" + each[0]).css("width", each[1]);
            $("#" + each[0]).css("height", each[2]);
            self.xgraphs[each[0]] = new sigma(each[0]);
            self.xgraphs[each[0]].graph.read({
                "nodes": each[3] === null ? [] : self.env[each[3]],
                "edges": each[4] === null ? [] : self.env[each[4]]
            });
            self.xgraphs[each[0]].startForceAtlas2();
            self.xgraphs[each[0]].startForceAtlas2({
               "worker": true,
              "barnesHutOptimize": true
         });
        });

        self.simulate_id = self.simulate();
        self.hasStopped = false;
        self.hasStarted = true;
    }
};

Simulation.prototype.stop = function() {
    if (this.hasStopped === false) {
        clearInterval(this.simulate_id);
        this.hasStopped = true;
    }
};

Simulation.prototype.continue = function() {
    if (this.hasStopped === true && this.hasStarted === true) {
        this.simulate_id = this.simulate();
        this.hasStopped = false;
    }
};
Simulation.prototype.reset = function() {
    var self = this;
    self.stop();

    self.charts_info.forEach(function(each) {
        $("#" + each[2]).empty();
    });
    self.graphs_info.forEach(function(each) {
        if ($("#" + each[0]).children().length > 0) {
            self.xgraphs[each[0]].killForceAtlas2();
            self.xgraphs[each[0]].kill();
            $("#" + each[0]).empty();
        }
    });
    
    self.env = null;
    self.xgraphs = {};
    self.xcharts = {};
    self.xpoints = {};
    self.hasStarted = false;
    self.time = 0;
    self.sample_time = 0;
};
