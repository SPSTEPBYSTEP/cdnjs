/*
  Highcharts JS v7.1.0 (2019-04-01)

 Pareto series type for Highcharts

 (c) 2010-2019 Sebastian Bochan

 License: www.highcharts.com/license
*/
(function(a){"object"===typeof module&&module.exports?(a["default"]=a,module.exports=a):"function"===typeof define&&define.amd?define("highcharts/modules/pareto",["highcharts"],function(c){a(c);a.Highcharts=c;return a}):a("undefined"!==typeof Highcharts?Highcharts:void 0)})(function(a){function c(a,b,e,f){a.hasOwnProperty(b)||(a[b]=f.apply(null,e))}a=a?a._modules:{};c(a,"mixins/derived-series.js",[a["parts/Globals.js"]],function(a){var b=a.Series,e=a.addEvent;return{hasDerivedData:!0,init:function(){b.prototype.init.apply(this,
arguments);this.initialised=!1;this.baseSeries=null;this.eventRemovers=[];this.addEvents()},setDerivedData:a.noop,setBaseSeries:function(){var a=this.chart,d=this.options.baseSeries;this.baseSeries=d&&(a.series[d]||a.get(d))||null},addEvents:function(){var a=this,d;d=e(this.chart,"afterLinkSeries",function(){a.setBaseSeries();a.baseSeries&&!a.initialised&&(a.setDerivedData(),a.addBaseSeriesEvents(),a.initialised=!0)});this.eventRemovers.push(d)},addBaseSeriesEvents:function(){var a=this,d,b;d=e(a.baseSeries,
"updatedData",function(){a.setDerivedData()});b=e(a.baseSeries,"destroy",function(){a.baseSeries=null;a.initialised=!1});a.eventRemovers.push(d,b)},destroy:function(){this.eventRemovers.forEach(function(a){a()});b.prototype.destroy.apply(this,arguments)}}});c(a,"modules/pareto.src.js",[a["parts/Globals.js"],a["mixins/derived-series.js"]],function(a,b){var e=a.correctFloat,c=a.seriesType;a=a.merge;c("pareto","line",{zIndex:3},a(b,{setDerivedData:function(){if(1<this.baseSeries.yData.length){var a=
this.baseSeries.xData,b=this.baseSeries.yData,c=this.sumPointsPercents(b,a,null,!0);this.setData(this.sumPointsPercents(b,a,c,!1),!1)}},sumPointsPercents:function(a,b,c,h){var d=0,k=0,l=[],g;a.forEach(function(a,f){null!==a&&(h?d+=a:(g=a/c*100,l.push([b[f],e(k+g)]),k+=g))});return h?d:l}}))});c(a,"masters/modules/pareto.src.js",[],function(){})});
//# sourceMappingURL=pareto.js.map