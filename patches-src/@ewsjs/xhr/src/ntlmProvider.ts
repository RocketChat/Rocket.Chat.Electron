import axios, { AxiosRequestConfig, AxiosInstance } from "axios";
import { createType1Message, decodeType2Message, createType3Message } from "@ewsjs/ntlm-client";
import { Agent as httpsAgent } from "https";

import { IProvider, PreCallConfig } from "./IProvider";

export class NtlmProvider implements IProvider {

  private _client: AxiosInstance = null;

  private username: string = null;
  private password: string = null;
  private domain: string = '';

  get providerName(): string {
    return "ntlm";
  }

  constructor(username: string, password: string) {

    this.username = username || '';
    this.password = password || '';

    if (username.indexOf("\\") > 0) {
      this.username = username.split("\\")[1];
      this.domain = username.split("\\")[0].toUpperCase();
    }
  }

  get client(): AxiosInstance {
    return this._client;
  }

  async preCall(options: PreCallConfig) {
    let ntlmOptions = {
      url: options.url,
      username: this.username,
      password: this.password,
      workstation: options['workstation'] || '.',
      domain: this.domain,
    };

    console.log('[DEBUG] NTLM Provider - Starting NTLM authentication');
    console.log('[DEBUG] NTLM Provider - Target URL:', options.url);
    console.log('[DEBUG] NTLM Provider - Domain:', this.domain);
    console.log('[DEBUG] NTLM Provider - Username:', this.username);
    console.log('[DEBUG] NTLM Provider - Workstation:', ntlmOptions.workstation);
    console.log('[DEBUG] NTLM Provider - Reject Unauthorized:', options.rejectUnauthorized);

    options.headers['Connection'] = 'keep-alive';

    options.httpsAgent = new httpsAgent({ keepAlive: true, rejectUnauthorized: options.rejectUnauthorized })
    let type1msg = createType1Message(ntlmOptions.workstation, ntlmOptions.domain); // alternate client - ntlm-client
    
    console.log('[DEBUG] NTLM Provider - Type 1 Message generated:', type1msg);
    
    let opt: AxiosRequestConfig = (<any>Object).assign({}, options);
    opt['method'] = "GET";
    opt.headers['Authorization'] = type1msg;
    delete opt['data'];
    delete opt['responseType'];

    console.log('[DEBUG] NTLM Provider - Sending Type 1 request');
    console.log('[DEBUG] NTLM Provider - Request headers:', JSON.stringify(opt.headers, null, 2));

    try {
      const response = await axios(opt).catch(err => {
        console.log('[DEBUG] NTLM Provider - axios error caught during Type 1 request:', err);
        console.log('[DEBUG] NTLM Provider - Error code:', err.code);
        console.log('[DEBUG] NTLM Provider - Error message:', err.message);
        console.log('[DEBUG] NTLM Provider - Error stack:', err.stack);
        
        if (err.response) {
          console.log('[DEBUG] NTLM Provider - Error response status:', err.response.status);
          console.log('[DEBUG] NTLM Provider - Error response statusText:', err.response.statusText);
          console.log('[DEBUG] NTLM Provider - Error response headers:', JSON.stringify(err.response.headers, null, 2));
          console.log('[DEBUG] NTLM Provider - Error response data:', err.response.data);
        } else {
          console.log('[DEBUG] NTLM Provider - No response in error, network or connection issue');
          console.log('[DEBUG] NTLM Provider - Error config URL:', err.config?.url);
          console.log('[DEBUG] NTLM Provider - Error config timeout:', err.config?.timeout);
          throw err;
        }
        return err.response;
      });

      console.log('[DEBUG] NTLM Provider - Type 1 response received');
      console.log('[DEBUG] NTLM Provider - Response status:', response.status);
      console.log('[DEBUG] NTLM Provider - Response statusText:', response.statusText);
      console.log('[DEBUG] NTLM Provider - Response headers:', JSON.stringify(response.headers, null, 2));

      if (!response.headers['www-authenticate']) {
        console.log('[DEBUG] NTLM Provider - CRITICAL: www-authenticate header missing!');
        console.log('[DEBUG] NTLM Provider - Available headers:', Object.keys(response.headers));
        throw new Error('www-authenticate not found on response of second request');
      }

      console.log('[DEBUG] NTLM Provider - www-authenticate header found:', response.headers['www-authenticate']);

      let type2msg = decodeType2Message(response.headers['www-authenticate']);
      console.log('[DEBUG] NTLM Provider - Type 2 message decoded successfully');
      console.log('[DEBUG] NTLM Provider - Type 2 message details:', JSON.stringify(type2msg, null, 2));

      let type3msg = createType3Message(type2msg, ntlmOptions.username, ntlmOptions.password, ntlmOptions.workstation, ntlmOptions.domain);
      console.log('[DEBUG] NTLM Provider - Type 3 message generated:', type3msg);

      delete options.headers['authorization'] // 'fetch' has this wired addition with lower case, with lower case ntlm on server side fails
      delete options.headers['connection'] // 'fetch' has this wired addition with lower case, with lower case ntlm on server side fails

      options.headers['Authorization'] = type3msg;
      options.headers['Connection'] = 'Close';
      
      console.log('[DEBUG] NTLM Provider - Final request headers prepared:', JSON.stringify(options.headers, null, 2));
      console.log('[DEBUG] NTLM Provider - NTLM authentication setup completed successfully');
      
      return options;
    } catch (err) {
      console.log('[DEBUG] NTLM Provider - FATAL ERROR in preCall:');
      console.log('[DEBUG] NTLM Provider - Error type:', typeof err);
      console.log('[DEBUG] NTLM Provider - Error instanceof Error:', err instanceof Error);
      console.log('[DEBUG] NTLM Provider - Error message:', err.message);
      console.log('[DEBUG] NTLM Provider - Error stack:', err.stack);
      console.log('[DEBUG] NTLM Provider - Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      throw err;
    }
  }
}
