import { ConfigGenerator } from "@liquidapps/dsp-lib-base";

var getParams = function (url, defaultQuery) {
	var params = {};
	var parser = document.createElement('a');
	parser.href = url;
	var query = parser.search.substring(1);
	if(!query)
		query = defaultQuery;
	var vars = query.split('&');
	for (var i = 0; i < vars.length; i++) {
		var pair = vars[i].split('=');
		params[pair[0]] = decodeURIComponent(pair[1]).split(',');
	}
	return params;
};

export class URLBasedConfigGenerator extends ConfigGenerator {
	defaultQuery: any;
	constructor(defaultQuery){
		super();
		this.defaultQuery = defaultQuery;
	}
    async getParams(){
        return getParams(document.location.href, this.defaultQuery);
    }
}