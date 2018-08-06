looker.plugins.visualizations.add({
  id: "sankey_original",
  label: "Sankey Original",
  // options: {
  //   color_range: {
  //     type: "array",
  //     label: "Color Range",
  //     display: "colors",
  //     default:  ["#5F4690", "#1D6996", "#38A6A5", "#0F8554", "#73AF48", "#EDAD08", "#E17C05", "#CC503E", "#94346E", "#6F4070"],
  //   },
  // },
  // require proper data input
  handleErrors: function(data, resp) {
    var min_mes, max_mes, min_dim, max_dim, min_piv, max_piv;
    min_mes = 1
    max_mes = 1
    min_dim = 2
    max_dim = undefined
    min_piv = 0
    max_piv = 0

    if (resp.fields.pivots.length > max_piv) {
      this.addError({
        group: "pivot-req",
        title: "Incompatible Data",
        message: "No pivot is allowed"
      });
      return false;
    } else {
      this.clearErrors("pivot-req");
    }

    if (resp.fields.pivots.length < min_piv) {
      this.addError({
        group: "pivot-req",
        title: "Incompatible Data",
        message: "Add a Pivot"
      });
      return false;
    } else {
      this.clearErrors("pivot-req");
    }

    if (max_dim && resp.fields.dimensions.length > max_dim) {
      this.addError({
        group: "dim-req",
        title: "Incompatible Data",
        message: "You need " + min_dim +" to "+ max_dim +" dimensions"
      });
      return false;
    } else {
      this.clearErrors("dim-req");
    }

    if (resp.fields.dimensions.length < min_dim) {
      this.addError({
        group: "dim-req",
        title: "Incompatible Data",
        message: "You need " + min_dim + max_dim ? " to "+ max_dim : "" +" dimensions"
      });
      return false;
    } else {
      this.clearErrors("dim-req");
    }

    if (max_mes && resp.fields.measure_like.length > max_mes) {
      this.addError({
        group: "mes-req",
        title: "Incompatible Data",
        message: "You need " + min_mes +" to "+ max_mes +" measures"
      });
      return false;
    } else {
      this.clearErrors("mes-req");
    }

    if (resp.fields.measure_like.length < min_mes) {
      this.addError({
        group: "mes-req",
        title: "Incompatible Data",
        message: "You need " + min_mes + max_mes ? " to "+ max_mes : "" +" measures"
      });
      return false;
    } else {
      this.clearErrors("mes-req");
    }

    // If no errors found, then return true
    return true;
  },
  // Set up the initial state of the visualization
  create: function(element, config) {
    var d3 = d3v4;

    var css = element.innerHTML = `
      <style>
      .node rect {
        cursor: move;
        fill-opacity: .9;
        shape-rendering: crispEdges;
      }      
      .node text {
        pointer-events: none;
      }
      .node,
      .link {
        transition: 0.5s opacity;
      }
      </style>
    `;

    this._svg = d3.select(element).append("svg");

  },
  // Render in response to the data or settings changing
  update: function(data, element, config, queryResponse) {
    if (!this.handleErrors(data, queryResponse)) return;
    var d3 = d3v4;

    var width = element.clientWidth;
    var height = element.clientHeight;

    var svg = this._svg
      .html("")
      .attr("width", "100%")
      .attr("height", "100%")
      .append("g");

    var dimensions = queryResponse.fields.dimension_like;
    var measure = queryResponse.fields.measure_like[0];

    var format = formatType(measure.value_format);

    var color = d3.scaleOrdinal()
      .range(["#5F4690", "#1D6996", "#38A6A5", "#0F8554", "#73AF48", "#EDAD08", "#E17C05", "#CC503E", "#94346E", "#6F4070"]);

		var defs = svg.append('defs');

		var sankey = d3.sankey()
				.nodeWidth(10)
				.nodePadding(12)
				.extent([[1, 1], [width - 1, height - 6]]);

		var link = svg.append("g")
				.attr("class", "links")
				.attr("fill", "none")
				.attr("stroke", "#fff")
			.selectAll("path");

		var node = svg.append("g")
				.attr("class", "nodes")
				.attr("font-family", "sans-serif")
				.attr("font-size", 10)
			.selectAll("g");

		var graph = {
			nodes: [],
			links: []
		};

		var nodes = d3.set();

		data.forEach(function(d) {
      // variable number of dimensions
      var path = dimensions.map(function(dim) {return d[dim.name].value});
      path.forEach(function(p,i) {
        if (i == path.length-1) return;
        var source = path.slice(i,i+1)[0] + i;
        var target = path.slice(i+1,i+2)[0] + (i+1);
        nodes.add(source);
        nodes.add(target);
        graph.links.push({ "source": source,
                           "target": target,
                           "value": +d[measure.name].value});
      });
		});

		var nodesArray = nodes.values();

		graph.links.forEach(function (d, i) {
			d.source = nodesArray.indexOf(d.source);
			d.target = nodesArray.indexOf(d.target);
		});

		graph.nodes = nodes.values().map(function(d) {
			return {
				name: d.slice(0,-1)
			};
		});

		sankey(graph);

		link = link
			.data(graph.links)
			.enter().append("path")
				.attr("class", "link")
				.attr("d", function(d) { return "M" + -10 + "," + -10 + d3.sankeyLinkHorizontal()(d); })
				.style("opacity", 0.4)
				.attr("stroke-width", function(d) { return Math.max(1, d.width); })
        .on("mouseenter", function(d) {
          svg.selectAll(".link")
            .style("opacity", 0.05)
          d3.select(this)
            .style("opacity", 0.7)
          svg.selectAll(".node")
            .style("opacity", function(p) {
              if (p == d.source) return 1;
              if (p == d.target) return 1;
              return 0.5;
            });
        })
        .on("mouseleave", function(d) {
          d3.selectAll(".node").style("opacity", 1);
          d3.selectAll(".link").style("opacity", 0.4);
        });

		// gradients https://bl.ocks.org/micahstubbs/bf90fda6717e243832edad6ed9f82814
		link.style('stroke', function(d,i) {


			// make unique gradient ids
			var gradientID = "gradient" + i;

			var startColor = color(d.source.name.replace(/ .*/, ""));
			var stopColor = color(d.target.name.replace(/ .*/, ""));

			var linearGradient = defs.append('linearGradient')
					.attr('id', gradientID)
          .attr("x1", "30%")
          .attr("y1", "30%")
          .attr("x2", "70%")
          .attr("y2", "70%")
          .style("mix-blend-mode", "overlay");

			linearGradient.selectAll('stop')
				.data([
						{offset: '10%', color: startColor },
						{offset: '90%', color: stopColor }
					])
				.enter().append('stop')
				.attr('offset', function(d) {return d.offset; })
				.attr('stop-color', function(d) {return d.color; });


        console.log('startColor', startColor);
        console.log('stopColor', stopColor);

			return "url(#" + gradientID + ")";
		})

		node = node
			.data(graph.nodes)
			.enter().append("g")
      .attr("class", "node")
      .on("mouseenter", function(d) {
        svg.selectAll(".link")
          .style("opacity", function(p) {
            if (p.source == d) return 0.7;
            if (p.target  == d) return 0.7;
            return 0.05;
          });
      })
      .on("mouseleave", function(d) {
        d3.selectAll(".link").style("opacity", 0.4);
      });

		node.append("rect")
				.attr("x", function(d) { return d.x0; })
				.attr("y", function(d) { return d.y0; })
				.attr("height", function(d) { return d.y1 - d.y0; })
				.attr("width", function(d) { return d.x1 - d.x0; })
				.attr("fill", function(d) { return color(d.name.replace(/ .*/, "")); })
				.attr("stroke", "#BDC3C7");

		node.append("text")
				.attr("x", function(d) { return d.x0 - 6; })
				.attr("y", function(d) { return (d.y1 + d.y0) / 2; })
				.attr("dy", "0.35em")
        .style("font-family", "Futura, sans-serif")
				.attr("text-anchor", "end")
				.style("fill", "#222")
				.text(function(d) { return d.name; })
			.filter(function(d) { return d.x0 < width / 2; })
				.attr("x", function(d) { return d.x1 + 6; })
				.attr("text-anchor", "start");

		node.append("title")
				.text(function(d) { return d.name + "\n" + d.value; });
  }

  // // the function for moving the nodes
  // function dragmove(d) {
  //   d3.select(this).attr('transform', 
  //     `translate(${d.x = Math.max(0, Math.min(width - d.dx, d3.event.x))},${d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))})`);
  //   sankey.relayout();
  //   link.attr('d', path);
  // }
});

