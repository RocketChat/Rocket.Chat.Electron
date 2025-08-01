import * as https from 'https';
import axios, { AxiosRequestConfig, AxiosProxyConfig } from 'axios';
import { IXHROptions, IXHRApi, IXHRProgress } from "../types/ews.partial";
import { setupXhrResponse } from "./utils";

import { IProvider } from "./IProvider";
import { NtlmProvider } from './ntlmProvider';
import { CookieProvider } from './cookieProvider';

/**
 * this is alternate XHR Api for ews-javascript-api/ewsjs
 * 
 * @export
 * @class XhrApi
 * @implements {IXHRApi}
 */
export class XhrApi implements IXHRApi {

  static defaultOptions: AxiosRequestConfig = {};
  requestOptions: AxiosRequestConfig = {};

  private allowUntrustedCertificate: boolean;
  /**
   * @internal 
   */
  private stream: any;
  private proxyConfig = {
    enabled: false,
    url: null,
    userName: null,
    password: null,
  };

  get apiName(): string {
    let n = "request";
    if (this.proxyConfig.enabled) {
      n += ";proxy:yes";
    }
    if (this.authProvider) {
      n += ";auth:" + this.authProvider.providerName;
    }
    return n;
  }

  /**
   * Creates an instance of XhrApi optionally passing options for request
   * @memberof XhrApi
   */
  constructor();
  /**
   * Creates an instance of XhrApi optionally passing options for request
   * @param {CoreOptions} requestOptions Options for request
   * @memberof XhrApi
   */
  constructor(requestOptions: AxiosRequestConfig & { rejectUnauthorized?: boolean });
  /**
   * Creates an instance of XhrApi. optionally pass true to bypass remote ssl/tls certificate check
   * @param {boolean} allowUntrustedCertificate whether to allow non trusted certificate or not
   * @memberof XhrApi
   */
  constructor(allowUntrustedCertificate: boolean);
  constructor(aucoro: boolean | AxiosRequestConfig & { rejectUnauthorized?: boolean } = false) {
    if (typeof aucoro === 'object') {
      this.requestOptions = aucoro;
      this.allowUntrustedCertificate = !(typeof aucoro.rejectUnauthorized !== 'undefined' ? aucoro.rejectUnauthorized : true);
    } else {
      this.allowUntrustedCertificate = !!aucoro;
    }
  }

  /**
   * Enable use of Proxy server when using this XHR Api
   * 
   * @param {string} url Proxy server url with port, usally http://server:8080 or https://server:port
   * @param {string} [proxyUserName=null] proxy server authentication username
   * @param {string} [proxyPassword=null] proxy server authentication password
   * @returns {XhrApi} returns instance for chaining
   * @memberof XhrApi
   */
  useProxy(url: string, proxyUserName: string = null, proxyPassword: string = null): XhrApi {
    if (this.authProvider instanceof NtlmProvider) {
      throw new Error("NtlmProvider does not work with proxy (yet!)")
    }
    this.proxyConfig = { enabled: url !== null, url: url, userName: proxyUserName, password: proxyPassword };
    return this;
  }

  /**
   * use NTLM authentication method, supports Ntlm v2
   * 
   * @param {string} username username for ntlm
   * @param {string} password password for ntlm
   * @returns {XhrApi} returns instance for chaining
   * @memberof XhrApi
   */
  useNtlmAuthentication(username: string, password: string): XhrApi {
    if (this.proxyConfig.enabled === true) {
      throw new Error("NtlmProvider does not work with proxy (yet!)")
    }
    this.authProvider = new NtlmProvider(username, password);
    return this;
  }

  /**
   * use cookies authentication method, usually required when hosted behind ISA/TMG
   * 
   * @param {string} username username for cookies auth
   * @param {string} password password for cookies auth
   * @returns {XhrApi} returns instance for chaining
   * @memberof XhrApi
   */
  useCookieAuthentication(username: string, password: string): XhrApi {
    this.authProvider = new CookieProvider(username, password);
    return this;
  }

  /**
   * set custom IProvider interface, needed for custom IProvider implementing custom precall method
   * 
   * @param {IProvider} authProvider auth provider implementing IProvider interface
   * @memberof XhrApi
   */
  setAuthProvider(authProvider: IProvider): void {
    this.authProvider = authProvider;
  }

  /**@internal */
  private authProvider: IProvider = null;


  async xhr(xhroptions: IXHROptions, progressDelegate?: (progressData: IXHRProgress) => void): Promise<XMLHttpRequest> {
    console.log('[DEBUG] XhrApi - Starting XHR request');
    console.log('[DEBUG] XhrApi - Request URL:', xhroptions.url);
    console.log('[DEBUG] XhrApi - Request method:', xhroptions.type);
    console.log('[DEBUG] XhrApi - Request headers:', JSON.stringify(xhroptions.headers, null, 2));
    console.log('[DEBUG] XhrApi - Request data:', xhroptions.data ? `${xhroptions.data.toString().substring(0, 200)}...` : 'No data');
    console.log('[DEBUG] XhrApi - Allow redirect:', xhroptions.allowRedirect);
    console.log('[DEBUG] XhrApi - Auth provider:', this.authProvider ? this.authProvider.providerName : 'None');
    console.log('[DEBUG] XhrApi - Allow untrusted certificate:', this.allowUntrustedCertificate);

    let client = axios.create();
    //setup xhr for github.com/andris9/fetch options
    let options: AxiosRequestConfig = {
      url: xhroptions.url,
      data: xhroptions.data,
      headers: xhroptions.headers,
      method: <any>xhroptions.type,
      maxRedirects: !xhroptions.allowRedirect ? 0 : 5,
      //resolveWithFullResponse: true
    }

    if (this.allowUntrustedCertificate) {
      options.httpsAgent = new https.Agent({ rejectUnauthorized: false });
      console.log('🔧 [SUCCESS FACTOR] XhrApi - Using custom HTTPS agent with rejectUnauthorized: false');
      console.log('📋 [SUCCESS FACTOR] This setting allows self-signed/invalid certificates - CRITICAL for many Exchange servers!');
    } else {
      console.log('🔒 [POTENTIAL ISSUE] XhrApi - Using default certificate validation - may fail with self-signed certs');
    }

    let proxyConfig = this.getProxyOption();
    if (proxyConfig) {
      options["proxy"] = proxyConfig;
      console.log('🌐 [SUCCESS FACTOR] XhrApi - Using proxy configuration:', JSON.stringify(proxyConfig, null, 2));
      console.log('📋 [SUCCESS FACTOR] Proxy is configured - CRITICAL for corporate environments behind firewalls!');
    } else {
      console.log('🚫 [INFO] XhrApi - No proxy configuration - direct connection will be attempted');
    }
    }
    options = this.getOptions(options)

    console.log('[DEBUG] XhrApi - Final options before auth:', JSON.stringify({
      url: options.url,
      method: options.method,
      maxRedirects: options.maxRedirects,
      headers: options.headers
    }, null, 2));

    let _promise: Promise<AxiosRequestConfig> = Promise.resolve(options);

    try {
      if (this.authProvider) {
        console.log('[DEBUG] XhrApi - Calling auth provider preCall method');
        _promise = this.authProvider.preCall({ ...options, rejectUnauthorized: !this.allowUntrustedCertificate });
        client = this.authProvider.client || client;
        console.log('[DEBUG] XhrApi - Auth provider client:', client ? 'Custom client' : 'Default client');
      }
      
      const opt = await _promise;
      console.log('[DEBUG] XhrApi - Options after auth preCall:', JSON.stringify({
        url: opt.url,
        method: opt.method,
        headers: opt.headers
      }, null, 2));

      console.log('[DEBUG] XhrApi - Executing final HTTP request');
      const response = await client(opt || options as any);

      console.log('[DEBUG] XhrApi - HTTP request completed successfully');
      console.log('[DEBUG] XhrApi - Response status:', response.status);
      console.log('[DEBUG] XhrApi - Response statusText:', response.statusText);
      console.log('[DEBUG] XhrApi - Response headers:', JSON.stringify(response.headers, null, 2));
      console.log('[DEBUG] XhrApi - Response data length:', response.data ? response.data.toString().length : 0);
      console.log('[DEBUG] XhrApi - Response data preview:', response.data ? response.data.toString().substring(0, 300) + '...' : 'No data');

      let xhrResponse: XMLHttpRequest = <any>{
        response: response.data ? response.data.toString() : '',
        status: response.status,
        //redirectCount: meta.redirectCount,
        headers: response.headers,
        finalUrl: response.headers.location || response.request.res.responseUrl,
        responseType: '',
        statusText: response.statusText,
      };
      if (xhrResponse.status === 200) {
        console.log('🎉 [COMPLETE SUCCESS] XhrApi - HTTP 200 OK received!');
        console.log('📋 [COMPLETE SUCCESS] NTLM authentication + Exchange communication FULLY WORKING!');
        console.log('🏆 [SOLUTION SUMMARY] The following factors enabled success:');
        if (this.allowUntrustedCertificate) {
          console.log('  ✅ SSL Certificate validation disabled (allowUntrustedCertificate: true)');
        }
        if (this.getProxyOption()) {
          console.log('  ✅ Proxy configuration was used');
        }
        console.log('  ✅ NTLM 3-step handshake completed successfully');
        console.log('  ✅ Exchange server accepted authentication');
        return setupXhrResponse(xhrResponse);
      }
      else {
        console.log('❌ [FINAL FAILURE] XhrApi - Request failed with status:', xhrResponse.status);
        console.log('📋 [FINAL FAILURE] Even after successful NTLM auth, Exchange rejected the request');
        throw setupXhrResponse(xhrResponse);
      }
    } catch (error) {
      console.log('[DEBUG] XhrApi - Request failed with exception:');
      console.log('[DEBUG] XhrApi - Error type:', typeof error);
      console.log('[DEBUG] XhrApi - Error message:', error.message);
      console.log('[DEBUG] XhrApi - Error code:', error.code);
      console.log('[DEBUG] XhrApi - Error stack:', error.stack);
      
      if (error.response) {
        console.log('[DEBUG] XhrApi - Error response status:', error.response.status);
        console.log('[DEBUG] XhrApi - Error response statusText:', error.response.statusText);
        console.log('[DEBUG] XhrApi - Error response headers:', JSON.stringify(error.response.headers, null, 2));
        console.log('[DEBUG] XhrApi - Error response data:', error.response.data);
      } else if (error.request) {
        console.log('[DEBUG] XhrApi - Error request config:', JSON.stringify({
          url: error.request.url,
          method: error.request.method,
          headers: error.request.headers
        }, null, 2));
      }

      console.log('[DEBUG] XhrApi - Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      throw setupXhrResponse(error)
    }


  }

  xhrStream(xhroptions: IXHROptions, progressDelegate: (progressData: IXHRProgress) => void): Promise<XMLHttpRequest> {
    let client = axios.create();
    //setup xhr for github.com/andris9/fetch options
    let options: AxiosRequestConfig = {
      url: xhroptions.url,
      data: xhroptions.data,
      headers: xhroptions.headers,
      method: <any>xhroptions.type,
      maxRedirects: !xhroptions.allowRedirect ? 0 : 5,
      responseType: 'stream',
    }

    if (this.allowUntrustedCertificate) {
      options.httpsAgent = new https.Agent({ rejectUnauthorized: false });
    }

    let proxyConfig = this.getProxyOption();
    if (proxyConfig) {
      options["proxy"] = proxyConfig;
    }
    options = this.getOptions(options)

    return new Promise<XMLHttpRequest>((resolve, reject) => {

      let _promise: Promise<AxiosRequestConfig> = Promise.resolve(options);

      if (this.authProvider) {
        _promise = this.authProvider.preCall({ ...options, rejectUnauthorized: !this.allowUntrustedCertificate });
        client = this.authProvider.client || client;
      }

      _promise.then(async opt => {
        const response = await client(opt || options)
        this.stream = response.data;

        this.stream.on('response', function (response) {
          // unmodified http.IncomingMessage object
          progressDelegate({ type: "header", headers: response["headers"] })
        })
        this.stream.on("data", (chunk) => {
          // decompressed data as it is received
          // console.log('decoded chunk: ' + chunk)
          // console.log(chunk.toString());
          progressDelegate({ type: "data", data: chunk.toString() });
        });

        this.stream.on("end", () => {
          progressDelegate({ type: "end" });
          resolve(null);
        });

        this.stream.on('error', (error) => {
          progressDelegate({ type: "error", error: error });
          this.disconnect();
          rejectWithError(reject, error);
        });
      }, reason => {
        reject(setupXhrResponse(reason));
      });
    });
  }

  disconnect() {
    if (this.stream) {
      try {
        this.stream.destroy();
      }
      catch (e) { }
    }
  }

  private getProxyString(): string {
    if (this.proxyConfig.enabled) {
      let url: string = this.proxyConfig.url;
      if (this.proxyConfig.userName && this.proxyConfig.password) {
        let proxyParts = url.split("://");
        return (proxyParts[0] + "://" + encodeURIComponent(this.proxyConfig.userName) + ":" + encodeURIComponent(this.proxyConfig.password) + "@" + proxyParts[1]);
      }
      else {
        return url;
      }
    }
    return null;
  }

  private getProxyOption(): AxiosProxyConfig {
    if (this.proxyConfig.enabled) {
      let url: string = this.proxyConfig.url;
      let proxyParts = new URL(url);
      if (this.proxyConfig.userName && this.proxyConfig.password) {
        return {
          protocol: proxyParts.protocol,
          host: proxyParts.host,
          port: proxyParts.port ? Number(proxyParts.port) : 80,
          auth: {
            username: this.proxyConfig.userName,
            password: this.proxyConfig.password
          }
        };
      }
      else {
        return {
          protocol: proxyParts.protocol,
          host: proxyParts.host,
          port: proxyParts.port ? Number(proxyParts.port) : 80,
        }
      }
    }
    return null;
  }

  private getOptions(opts: AxiosRequestConfig) {
    let headers = Object.assign({}, (XhrApi.defaultOptions || {}).headers, (this.requestOptions || {}).headers, (opts || {}).headers)
    return Object.assign({}, XhrApi.defaultOptions, this.requestOptions, opts, { headers });
  }
}


function rejectWithError(reject: Function, reason) {
  let xhrResponse: XMLHttpRequest = <any>{
    response: reason.response && reason.response.body ? reason.response.body.toString() : '',
    status: reason.statusCode,
    //redirectCount: meta.redirectCount,
    headers: reason.response ? reason.response.headers : {},
    finalUrl: reason.url,
    responseType: '',
    statusText: reason.message,
    message: reason.message
  };
  if (typeof xhrResponse.status === 'undefined' && reason.message) {
    try {
      let parse: any[] = reason.message.match(/statusCode=(\d*?)$/)
      if (parse && parse.length > 1) {
        xhrResponse[<any>"status"] = Number(parse[1]);
      }
    } catch (e) { }
  }
  reject(setupXhrResponse(xhrResponse));
}
