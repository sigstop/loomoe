NCI.detailsNCI = $("#detailsNCI");
NCI.detailsTime = $("#detailsTime");
NCI.detailsFlows = $("#detailsFlows");
NCI.detailsEndpoints = $("#detailsEndpoints");
NCI.maxActivitySize = 0;
NCI.Social = {}

NCI.setupCommunities = function(data){
	NCI.Communities = data.Communities;
	NCI.CommunityGraph = data.CommunityGraph;
	NCI.Communities.sort(function(a, b){
		return a.Size- b.Size;
	});
	NCI.timestampNCI = data.NCI;
	NCI.timestamp = data.Time;

	NCI.detailsNCI.html(NCI.timestampNCI);
	NCI.detailsTime.html(NCI.parceDateForLastUpdate(NCI.timestamp));
	
	NCI.Social.endpoints = 0;
	var sizesSum = 0;
	$.each(NCI.Communities, function(index, community){
		NCI.Social.endpoints += community.Endpoints.length;
		sizesSum  += community.Size;
	});
	
	NCI.detailsEndpoints.html(NCI.parceNumberForView(sizesSum));
};

NCI.socialGraph = function(socialGraphID){
	var me = $(socialGraphID);
	
	var force;
	var socialGraphSelector = socialGraphID + " .socialGraph"
	var color = d3.scale.category10();
	var notNetworkColor = "#000000";
	var isClustered = false;
	var isDevided = false;
	var isFiltered = false;
	var selectedDots = {}
	me.graphBuilder;
	me.numOfPoints = 0;
	me.isExpandable = false;
	
	me.find('.byactivities').on('click', function(event){
		isDevided = this.checked;
		me.show();
	});
	me.find('.pretty').on('click', function(event){
		isClustered = this.checked;
		me.show();
	});
	me.find('.internal').on('click', function(event){
		isFiltered = this.checked;
		me.show();
	});
	
	me.show = function(needDraw){
		if (NCI.Communities.length == 0){
			return;
		};
		if (needDraw) {
		    d3.select("#activities_graph").remove();
			if (me.numOfPoints > NCI.max_vertices) {
				d3.select(socialGraphSelector).append('text')
				.attr("id","activities_graph")
				.html('Too many endpoints to draw');
			} else {
			    me.draw();
			}
		//otherwise just change appearance	
		} else {
		    me.setupNodes();
		    force.start();
		}
	};
	
	//colorify and set radius
	me.setupNodes = function(){
		me.node.style("fill", function(d) {
			//if this dot is selected on Activities graph, draw it in red
			if (NCI.Social.selectedDot == d.name.split(":")[0])
			    return "FF0000";
		    if ( isFiltered && NCI.isExternal(d.name)){
			    return notNetworkColor;
		    };
		    return isDevided ? color(d.group) : color(0);
		});
		me.node.attr("r", function(d) { 
			var radius = 4;
			if (NCI.maxActivitySize > 0 && (parseInt(d.size) == parseInt(d.size))) {
		 		radius = 4 + 8*(parseInt(d.size)/NCI.maxActivitySize);
		 	}
			return radius;
		});
		force.linkStrength(isClustered ? 1 : 0);
	};
	
	me.draw = function(){	
		var graphWidth = me.width();
		var graphHeight = $('#nciDetails').height() - 200;
		force = d3.layout.force()
		    .charge(-20)
			.linkDistance(30)
			.size([graphWidth,  graphHeight])
			.linkStrength(isClustered ? 1 : 0);
			
	    me.activitiesGraphSvg = d3.select(socialGraphSelector).append("svg")
		    .attr("id","activities_graph")
			.attr("width", graphWidth)
			.attr("height", graphHeight);
			
		var setupLinks = function(){
			force.links(me.graphBuilder.graph.links);
			me.activitiesGraphSvg.selectAll("line").remove();
			var linksData = me.activitiesGraphSvg.selectAll(".link").data(me.graphBuilder.graph.links);
			me.link = linksData.enter().append("line")
		    .attr("class", "activities_link"); 
			linksData.exit().remove();
		};
		
		var setupNodes = function(){
			force.nodes(me.graphBuilder.graph.nodes);
			me.activitiesGraphSvg.selectAll("circle").remove();
			var nodesData =  me.activitiesGraphSvg.selectAll(".node").data(me.graphBuilder.graph.nodes);
            me.node = nodesData.enter().append("circle").call(force.drag);
            nodesData.exit().remove();
			me.setupNodes(isFiltered, isDevided, isClustered);
			me.node.append("title").html(function(d) { return d.fullname + "<br>" + d.connections + " connections" ; });
			if (me.isExpandable) {
				me.node.on('click', function(d){
					var label = d.name.split(":")[0];
					var group = selectedDots[label]
					if (group !== undefined){
						delete selectedDots[selectedDots[label]]
						delete selectedDots[label]
						me.graphBuilder.removeCommunity(group);
						setupLinks();		
						setupNodes();
						force.start();
						return;
					}
					for (var i=0; i < Object.keys(selectedDots).length + 1; i++){
						if (selectedDots[i + 1] === undefined){
							selectedDots[i + 1] = true;
							selectedDots[label] =  i + 1;
							break
						}
					}
					$.each(NCI.Communities, function(index, community){
						if (community.Label == label){
							me.graphBuilder.addCommunity(community, label, selectedDots[label] );
							setupLinks();		
							setupNodes();
							force.start();
							return false;
						}
					});
	 		    });
			};
		};
		
		setupLinks();
		setupNodes();
	    force.on("tick", function() { 
	        me.link.attr("x1", function(d) { return d.source.x; })
	            .attr("y1", function(d) { return d.source.y; })
	            .attr("x2", function(d) { return d.target.x; })
	            .attr("y2", function(d) { return d.target.y; });

	        me.node.attr("cx", function(d) { return d.x; })
	            .attr("cy", function(d) { return d.y; });
		});
		force.start();
	};
	
	return me;
};

NCI.graphBuilder = function(communities){
	var thisBuilder = this;
	var endpointsHash = {};
	var groupCount = 0;
    thisBuilder.graph = { "nodes":[], "links": []};
	NCI.maxActivitySize = 0;
	
	//add community
	thisBuilder.addCommunity = function(community, mainEndpoint, group){
		var communityEndpoints = {};
		var startIndex = Object.keys(endpointsHash).length
		var addConnection = function(endPoint, endpoints){
			var ip = endPoint.split(":")[0];
			if (!endpointsHash[ip]){
			    if (!communityEndpoints[ip]){
					var size = endPoint.split(":")[1];
				    var index = Object.keys(communityEndpoints).length + startIndex
				    communityEndpoints[ip] = {
						fullname: endPoint,
					    index: index,
					    external: !endpoints.indexOf(endPoint),
					    connections: 0,
						size: size};
			    };
			    communityEndpoints[ip].connections++;
			    return communityEndpoints[ip].index;
		    } else {
		    	return endpointsHash[ip].index;
		    }
		};
		
		$.each(community.Interactions, function(index, interacton){
			thisBuilder.graph.links.push({
				source: addConnection(interacton[0], community.Endpoints),
				target: addConnection(interacton[1], community.Endpoints),
				value: 1});
		});
		
		$.each(Object.keys(communityEndpoints), function(index, key){
			if (mainEndpoint == key)
			   return
			var endpoint = communityEndpoints[key];
			if (NCI.maxActivitySize < parseInt(endpoint.size))
			    NCI.maxActivitySize = parseInt(endpoint.size);
			thisBuilder.graph.nodes[endpoint.index] = {
				name: key,
				fullname: endpoint.fullname,
				group: group,
				connections: endpoint.connections,
				external: endpoint.external,
				size: endpoint.size
			};
			endpointsHash[key] = communityEndpoints[key];
		});	
	};
	
	//remove community
	thisBuilder.removeCommunity = function(group){
	    thisBuilder.graph.nodes = $.grep(thisBuilder.graph.nodes, function(node, index){
			var remove = node.group == group
			if (remove)
			  delete endpointsHash[node.name];
			return !remove;
		});
	
	    thisBuilder.graph.links = $.grep(thisBuilder.graph.links, function(link, index){
			var remove = endpointsHash[link.target.name] === undefined || endpointsHash[link.source.name] === undefined;
			return !remove;
		});
		groupCount--;
	};
	
	$.each(communities, function(index, community){	
		thisBuilder.addCommunity(community, undefined, groupCount);
		groupCount++;
	});
};

$(".hide-ncidetails").on('click', function(){
	$('#nciDetails').removeClass('details-view-show');
	NCI.nciHistogram.clean();
	NCI.CommunityGraph = [];
	NCI.Communities = [];
	NCI.detailsEndpoints.html("");
	NCI.detailsNCI.html("");
	NCI.detailsTime.html("");
	NCI.detailsFlows.html("");
	$($('#nciDetailsTabs').find("dd a")[0]).click();
});


$('#nciDetailsTabs').on('toggled', function (event, tab) {
	switch(tab[0].id) {
	    case "panelFlows":
			var flowsPanel = new NCI.socialGraph("#panelFlows");
			flowsPanel.graphBuilder  = new NCI.graphBuilder(NCI.Communities);
			flowsPanel.numOfPoints =  NCI.Social.endpoints;
	        flowsPanel.show(true);
	        break;
	    case "panelActivities":
			var activitiesPanel = new NCI.socialGraph("#panelActivities");
			activitiesPanel.graphBuilder  = new NCI.graphBuilder([NCI.CommunityGraph]);
			activitiesPanel.numOfPoints = NCI.CommunityGraph.Endpoints.length;
			activitiesPanel.isExpandable = true;
			activitiesPanel.show(true);
	        break;
	    default:
			NCI.nciHistogram.show();
	};
});
