NCI.setupCommunities = function(data){
	NCI.Communities = data.Communities;
	NCI.Communities.sort(function(a, b){
		return a.Endpoints.length > b.Endpoints.length;
	});
	NCI.timestampNCI = data.NCI;
	NCI.timestamp = data.Time;
	$("#histogramGeneral").html("<b>NETWORK COMPLEXITY INDEX at &nbsp;&nbsp;</b> <i>" + NCI.parceDateForLastUpdate(NCI.timestamp) + "</i>" +
	    "&nbsp;&nbsp;&nbsp;<span class='button alert'>NCI " + NCI.timestampNCI + "</span>" );
};

NCI.nciHistogram = (function(){
	var me = $('#nciHistogram');
	
	var barWidth = 6;
	var chart = d3.select("#nciHistogram");
	var margin = {top: 40, right: 40, bottom: 40, left:40},
	    width = 600,
	    height = 300;
	
	me.show = function(){
		chart.text("");
		var endpointsScale = d3.scale.linear()
		    .domain([d3.max(NCI.Communities, function(d) { return d.Endpoints.length; }), 0])
		    .range([0, height - margin.top - margin.bottom]);

		var activitiesScale = d3.scale.linear()
		    .domain([NCI.Communities.length, 0])
		    .range([width - margin.right - margin.left, margin.left]);

		var activitiesAxis = d3.svg.axis()
		    .scale(activitiesScale)
		    .orient('bottom')
		    .tickSize(0)
			.tickFormat(d3.format("d"))
		    .tickPadding(8);

		var endpointsAxis = d3.svg.axis()
		    .scale(endpointsScale)
		    .orient('left')
			.tickSize(0)
			.tickFormat(d3.format("d"))
		    .tickPadding(10);

		var barChartSvg = chart.append('svg')
		    .attr('width', width)
		    .attr('height', height)
		    .append('g')
		    .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

        //draw and animate bars
        var index = 1;
		barChartSvg.selectAll('g')
		    .data(NCI.Communities)
		    .enter().append('rect')
		    .attr('x', function(d) { return activitiesScale(index++) - barWidth/2})
		    .attr('y', function(d) { return   endpointsScale(d.Endpoints.length)}) //- selfwidth
		    .attr('width', function(d) { return barWidth})
		    .attr('height',function(d) { return height - margin.top - margin.bottom - endpointsScale(d.Endpoints.length) })
			.on("click", me.showDetails);
		// barChartSvg.selectAll('rect').data(NCI.Communities).transition()
		//     .duration(1000)
		// 	.attr("y", function(d) { return height - margin.top - margin.bottom - endpointsScale(d.Endpoints.length) })
		// 	.attr('height', function(d) { return   endpointsScale(d.Endpoints.length) });		
		//draw NCI point	
		barChartSvg.append("circle").attr("cy", endpointsScale(NCI.timestampNCI))
		    .attr("cx", activitiesScale(NCI.timestampNCI) ).style("fill", "red").attr("r", 6);	
	    barChartSvg.append("circle").attr("cy", endpointsScale(0))
		    .attr("cx", activitiesScale(NCI.timestampNCI) ).style("fill", "red").attr("r", 4);
		barChartSvg.append("circle").attr("cy", endpointsScale(NCI.timestampNCI))
		    .attr("cx", activitiesScale(0) ).style("fill", "red").attr("r", 4);
		//draw axis 	
		barChartSvg.append('g')
		    .attr('class', 'x axis')
			.attr('transform', 'translate(0,' + (height - margin.top - margin.bottom) + ')')
			.call(activitiesAxis);
		barChartSvg.append('g')
			.attr('class', 'y axis')
			.attr('transform', 'translate(' + margin.left + ')')
			.call(endpointsAxis);	
		//draw axis labels																					
		barChartSvg.append('text').text('Activities Sorted by Size').attr('x', width/2 - 100).attr('y', height - 45);
		barChartSvg.append('text').text('Number of Endpoints per Activity').attr('x', -height/2 - 40).attr('y', 0)
		.attr('transform', 'rotate(-90)');

	};
	
	me.showDetails = function(d){
		chart.select("#bar_endpoints").remove();
		var activityDetails = chart.append('svg')
			.attr("id","bar_endpoints")
			.attr('width', height)
		    .attr('height', height);
			
	    var graph = NCI.prepareDataForForceGraph([d]);
		
		var force = d3.layout.force()
			.charge(-60)
			.linkDistance(30)
			.size([ height, height])
			.linkStrength(1).nodes(graph.nodes).links(graph.links).start();
			
		var link = activityDetails.selectAll(".link")
		    .data(graph.links)
			.enter().append("line")
			.attr("class", "link")
			.style("stroke-width", function(d) { return Math.sqrt(d.value); });  	
				  
		var node = activityDetails.selectAll(".node")
		    .data(graph.nodes)
		    .enter().append("circle")
		    .attr("r", 5)
		    .call(force.drag);
		  		  
		node.append("title").text(function(d) { return d.name; });

		force.on("tick", function() { 
			link.attr("x1", function(d) { return d.source.x; })
			    .attr("y1", function(d) { return d.source.y; })
				.attr("x2", function(d) { return d.target.x; })
				.attr("y2", function(d) { return d.target.y; });
				
			node.attr("cx", function(d) { return d.x; })
			    .attr("cy", function(d) { return d.y; });
		});	  
	};
	
	return me;
}());

NCI.socialGraph  = (function(){
	var me = $("#socialGraph");
	
	var force;
	var color = d3.scale.category10();
	me.clustered = false;
	var networkColor = "#000000";
	
	me.show = function(devided, clustered, filtered){
		if (me.clustered && !clustered){
			NCI.socialGraph.text("");
			me.draw(devided, clustered);
			me.clustered  = clustered;
			return;
		}
		me.clustered = clustered;
		if (me.text().length<20){	
			me.draw(devided, clustered, filtered);
		} else {
			me.node.style("fill", function(d) { 
  			    if ( filtered && (d.name.search("10.") == 0 ||  d.name.search("192.168") == 0)){
  				    return networkColor;
  			    }
  			    return devided ? color(d.group) : color(0);
			});
			me.node.attr("r", function(d) { return (filtered &&  (d.name.search("10.") == 0 ||  d.name.search("192.168") == 0)) ? 7 : 5})
			force.linkStrength(clustered ? 1 : 0);
	  	    force.start();
		}
	};
	
	me.draw = function(devided, clustered, filtered){
		d3.select("#activities_graph").remove();
	    me.graph = NCI.prepareDataForForceGraph(NCI.Communities);
		
		force = d3.layout.force()
			.charge(-60)
			.linkDistance(30)
			.size([ me.width(), $('#nciDetails').height() - 150])
			.linkStrength(clustered ? 1 : 0)
			.nodes(me.graph.nodes).links(me.graph.links).start();
			
	    me.activitiesGraphSvg = d3.select("#socialGraph").append("svg")
		    .attr("id","activities_graph")
			.attr("width", me.width())
			.attr("height", me.height());
	  
		var link = me.activitiesGraphSvg.selectAll(".link")
		    .data(me.graph.links)
			.enter().append("line")
			.attr("class", "link")
			.style("stroke-width", function(d) { return Math.sqrt(d.value); });  	
		  
		me.node = me.activitiesGraphSvg.selectAll(".node")
		    .data(me.graph.nodes)
			.enter().append("circle")
			.attr("class", "node")
			.attr("r", function(d) { return (filtered &&  (d.name.search("10.") == 0 ||  d.name.search("192.168") == 0)) ? 7 : 5})
			.style("fill", function(d) { 
				if ( filtered &&  (d.name.search("10.") == 0 ||  d.name.search("192.168") == 0)){
				  return networkColor;
			    }
				return devided ? color(d.group) : color(0);
			})
			.call(force.drag);
		
		me.node.append("title").text(function(d) { return d.name; });

	    force.on("tick", function() { 
	        link.attr("x1", function(d) { return d.source.x; })
	            .attr("y1", function(d) { return d.source.y; })
	            .attr("x2", function(d) { return d.target.x; })
	            .attr("y2", function(d) { return d.target.y; });

	        me.node.attr("cx", function(d) { return d.x; })
	            .attr("cy", function(d) { return d.y; });
		});
	}
	
	return me;
}());

NCI.prepareDataForForceGraph = function(communities){
    var graph = { "nodes":[], "links": []};
	
	var nodeIndex = function(ip){
		var val = 0;
		$.each(graph.nodes, function(index, node){
			if (node.name == ip)
			   val = index;
		});
		return val;
	};	
	
	$.each(communities, function(index, community){
		$.each(community.Endpoints, function(index2, endpoint){
			graph.nodes.push({
				"name": endpoint,
				"group": index
			});
		});
		$.each(community.Interactions, function(index2, interacton){
			graph.links.push({
				"source": nodeIndex(interacton[1]),
				"target": nodeIndex(interacton[0]),
				"value":1});
		});
	});
	
	return graph;
};