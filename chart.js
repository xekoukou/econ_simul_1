function Point(x, y) {
    this.x = x;
    this.y = y;
}

function Chart(root_element_, x_name_, y_name_, width_ext, height_ext) {

    this.root_element = root_element_;
    this.data = [];
    this.y_name = y_name_;
    this.x_name = x_name_;

    $("#" + this.root_element).empty();

    var margin = {
            top: 20,
            right: 20,
            bottom: 30,
            left: 50
        },
        width = width_ext - margin.left - margin.right,
        height = height_ext - margin.top - margin.bottom;

    var x = d3.scale.linear()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var line = d3.svg.line()
        .x(function(d) {
            return x(d.x);
        })
        .y(function(d) {
            return y(d.y);
        });

    var svg = d3.select("#" + this.root_element).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var xAxisDraw = svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")");
    xAxisDraw.append("text")
        .attr("x", width)
        .attr("dx", ".71em")
        .style("text-anchor", "end")
        .text(this.x_name);

    xAxisDraw.call(xAxis);

    var yAxisDraw = svg.append("g")
        .attr("class", "y axis");
    yAxisDraw.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(this.y_name);

    yAxisDraw.call(yAxis);

    var chart = svg.append("path")
        .attr("class", "line");

    this.add = function(points) {

        var data = this.data;
        points.forEach(function(point) {
            data.push(point);
        });

        x.domain(d3.extent(this.data, function(d) {
            return d.x;
        }));
        y.domain(d3.extent(this.data, function(d) {
            return d.y;
        }));

        xAxisDraw.call(xAxis);
        yAxisDraw.call(yAxis);

        chart.datum(this.data)
            .attr("d", line);
    };
    this.clear = function(){
	this.data = [];
    }
}
