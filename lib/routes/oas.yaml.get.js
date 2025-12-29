'use strict';

const OpenAPISnippet = require('openapi-snippet');
const SwaggerParser = require('@apidevtools/swagger-parser');
const YAML = require('js-yaml');
const { cloneDeep } = require('lodash');

const Helpers = require('./helpers');
const Server = require('../../server');

const methods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

const targets = [
  'shell_curl',
  'node_unirest',
  'node_request',
  'node_native',
  'shell_wget',
  'shell_httpie',
  'javascript_xhr',
  'javascript_jquery',
  'c_libcurl',
  'csharp_restsharp',
  'go_native',
  'python_python3',
  'python_requests',
  'java_okhttp',
  'java_unirest',
  'objc_nsurlsession',
  'ocaml_cohttp',
  'ruby_native',
  'php_curl',
  'php_http1',
  'php_http2',
  'swift_nsurlsession'
];

const langs = [
  `bash`,
  `shell`,
  `markup`,
  `html`,
  `xml`,
  `svg`,
  `json`,
  `yaml`,
  `yml`,
  `go`,
  `javascript`,
  `js`,
  `java`,
  `python`,
  `py`,
  `csharp`,
  `cs`,
  `http`,
  `css`
];

/**
 *
 * @param {OpenAPI.Document} oas - OpenAPI document that will be enriched with code samples
 * @returns Promise<yaml> - OpenAPI document with code samples
 * ref: https://github.com/richardkabiling/openapi-snippet-cli/blob/c2bb2b7ee982557dfcd4c0a25a67d637c1855ae4/src/index.ts#L96-L106
 */
const withSnippets = async function (oas) {
  const api = await SwaggerParser.parse(JSON.parse(oas));
  const clone = cloneDeep(api);
  for (const path in clone.paths) {
    for (const method in clone.paths[path]) {
      if (methods.includes(method)) {
        try {
          clone.paths[path][method]['x-codeSamples'] = fetchSnippets(clone, path, method);
        } catch (e) {
          console.log('excluded:', method, path);
          console.log('reason', e);
        }
      }
    }
  }

  return clone;
};

/**
 *
 * @param {OpenAPI} api - OpenAPI document
 * @param {string} path - Path to endpoint
 * @param {string} method - HTTP method
 * @returns Code samples for [method] /pa/th
 * ref: https://github.com/richardkabiling/openapi-snippet-cli/blob/c2bb2b7ee982557dfcd4c0a25a67d637c1855ae4/src/index.ts#L108-L113
 */
const fetchSnippets = function (api, path, method) {
  const snippets = OpenAPISnippet.getEndpointSnippets(api, path, method, targets).snippets.map((snippet) => ({
    lang: langs.includes(snippet.id.split('_')[0]) ? snippet.id.split('_')[0] : 'js',
    label: snippet.title,
    source: snippet.content
  }));
  return snippets;
};

module.exports = Helpers.withDefaults({
  method: 'GET',
  path: '/oas.yaml',
  options: {
    tags: ['api', 'yaml', 'oas', 'docs'],
    description: 'YAML representation of the OpenAPI document with code samples in a variety of programming languages.',
    handler: async (request, h) => {
      const server = await Server.deployment();

      const { rawPayload: oas } = await server.inject({
        method: 'GET',
        url: `/swagger.json?tags=${request.query.tags || 'api'}`
      });

      const yaml = YAML.dump(await withSnippets(oas));
      return h.response(yaml).header('Content-Type', 'text/yaml');
    }
  }
});
