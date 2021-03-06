/*
 * Copyright 2013 Netflix, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/** tossboss-graph-model.js
 * Responsible for getting data from server.
 * 
 * LISTENS FOR EVENTS:
 * - clickEdge.tossboss-graph-view
 * 
 * TIGGERS EVENTS:
 * - loadGraphModel.tossboss-graph-model
 * - loadRunStatsData.tossboss-graph-model
 * - loadSampleOutputData.tossboss-graph-model
 */

;GraphModel = {
    options: {
        jobInfoSel: '.navbar .job-info',
        graphType: 'optimized',
        uuid: undefined,
        allData: undefined,
        pigUnoptimizedData: undefined,
        svgUnoptimized: undefined,
        pigOptimizedData: undefined,
        svgOptimized: undefined,
        runStatsData: undefined,
        sampleOutputsData: {}
    },
    /**
     * Start all custom event listeners.
     */
    startListeners: function() {
        // On edge click, get sample data and toggle modal.
        $(document).on('clickEdge.tossboss-graph-view', function(event, startNodeId, endNodeId, startScopeId, endScopeId) {
            if (_.contains(event.target.classList, startScopeId+'-out') && _.contains(event.target.classList, 'intermediate')) {
                Main.displayModal({title:'Sample Data'});
                // Check to see if sample data is cached.
                if (! GraphModel.options.sampleOutputsData[startScopeId]) {
                    // Get sample data.
                    $.ajax({
                        type: 'GET',
                        url:  './job/'+GraphModel.options.uuid+'?sampleOutput=1',
                    }).done(function(json) {
                        // If there is sample data, cache and populate.
                        if (! $.isEmptyObject(json.sampleOutputMap)) {
                            GraphModel.options.sampleOutputsData = json.sampleOutputMap;
                            if (GraphModel.options.sampleOutputsData[startScopeId]) {
                                GraphModel.populateSampleOutputData(startNodeId, startScopeId);
                                return;
                            }
                        }
                        // No sample data.
                        var html = _.template(Templates.sampleOutputDataTmpl, {}, {variable:'data'});
                        $('#myModal .modal-body').html(html);
                    }).fail(function() {
                    });
                }
                else {
                    GraphModel.populateSampleOutputData(startNodeId, startScopeId);
                }
            }
        });
    },
    /**
     * Initialize the GraphModel object.
     *
     * @param {String} uuid The uuid of graph
     */
    initialize: function(uuid) {
        GraphModel.startListeners();
        GraphModel.options.uuid = uuid;
        // Get optimized Pig data and script.
        $.ajax({
            type: 'GET',
            url:  './job/'+uuid+'?optimized=1&scripts=1'
        }).done(function(json) {
            GraphModel.options.allData = json;
            GraphModel.options.runStatsData = json.status;
            GraphModel.options.pigOptimizedData = json.optimized.plan;
            GraphModel.options.svgOptimized = json.optimized.svg;
            $(GraphModel.options.jobInfoSel).html(json.jobName + ' (' + json.userName + ')');
            $(document).trigger('loadGraphModel.tossboss-graph-model');
            GraphModel.getRunStats()
        }).fail(function() {
        });
        // Get unoptimized Pig data.
        $.ajax({
            type: 'GET',
            url:  './job/'+uuid+'?unoptimized=1'
        }).done(function(json) {
            GraphModel.options.pigUnoptimizedData = json.unoptimized.plan;
            GraphModel.options.svgUnoptimized = json.unoptimized.svg;
        });
    },
    /**
     * Get the run stats data for the Graph.
     */
    getRunStats: function() {
        $.ajax({
            type: 'GET',
            url:  './job/'+GraphModel.options.uuid+'?status=1',
        }).done(function(json) {
            GraphModel.options.runStatsData = json.status;
            $(document).trigger('loadRunStatsData.tossboss-graph-model');
            // If the script is still running, wait then get run stats data again.
            if (GraphModel.options.runStatsData.statusText.toLowerCase() === "running") {
                _.delay(GraphModel.getRunStats, 5000);
            }
        }).fail(function() {
            _.delay(GraphModel.getRunStats, 5000);
        });
    },
    /**
     * Return the Pig data for the active graph type (optimized or unoptimized).
     *
     * @return {Object} Returns Pig data
     */
    getPigData: function() {
        if (GraphModel.options.graphType.toLowerCase() === 'optimized') {
            return GraphModel.options.pigOptimizedData;
        }
        return GraphModel.options.pigUnoptimizedData;
    },
    /**
     * Return the SVG markup for the active graph type (optimized or unoptimized).
     *
     * @return {String} Returns SVG markup
     */
    getSvgData: function() {
        if (GraphModel.options.graphType.toLowerCase() === 'optimized') {
            return GraphModel.options.svgOptimized;
        }
        return GraphModel.options.svgUnoptimized;
    },
    /**
     * Populate the sample output data modal with sample data.
     *
     * @param {Number} startNodeId The edge's start node ID (this is used to get schema)
     * @param {Number} scopeId The map-reduce job's scopeId
     */
    populateSampleOutputData: function(startNodeId, scopeId) {
        var pigData = GraphModel.getPigData();
        var schema  = pigData[startNodeId].schema;
        var html    = _.template(Templates.sampleOutputDataTmpl, {'schema': schema, 'sampleOutputData': GraphModel.options.sampleOutputsData[scopeId]}, {variable:'data'});
        $('#myModal .modal-body').html(html);
        $('#myModal .modal-body').scrollTop(0).scrollLeft(0);
        $(document).trigger('loadSampleOutputData.tossboss-graph-model');
    }
};
